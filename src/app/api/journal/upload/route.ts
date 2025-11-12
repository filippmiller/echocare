import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import {
  badRequest,
  unauthorized,
  payloadTooLarge,
  unsupportedMediaType,
  internalServerError,
} from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";
import {
  getSupabaseAdmin,
  JOURNAL_AUDIO_BUCKET,
  MAX_AUDIO_BYTES,
  ALLOWED_AUDIO_MIME,
} from "@/lib/supabaseServer";
import { cuid } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return unauthorized();
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return badRequest("File is required");
    }

    // Check file size
    if (file.size > MAX_AUDIO_BYTES) {
      return payloadTooLarge(`File size exceeds ${MAX_AUDIO_BYTES / 1024 / 1024}MB limit`);
    }

    // Check MIME type
    if (!ALLOWED_AUDIO_MIME.includes(file.type)) {
      return unsupportedMediaType(`MIME type ${file.type} is not allowed. Allowed types: ${ALLOWED_AUDIO_MIME.join(", ")}`);
    }

    // Check if bucket exists
    const supabaseAdmin = getSupabaseAdmin();
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketError) {
      console.error("Supabase listBuckets error:", bucketError);
      return NextResponse.json(
        { error: `Storage error: ${bucketError.message}` },
        { status: 503 }
      );
    }
    
    if (!buckets?.some((b) => b.name === JOURNAL_AUDIO_BUCKET)) {
      console.error(`Bucket '${JOURNAL_AUDIO_BUCKET}' not found. Available buckets:`, buckets?.map((b) => b.name).join(", ") ?? "none");
      return NextResponse.json(
        { error: `Storage bucket '${JOURNAL_AUDIO_BUCKET}' is not available. Please create it in Supabase Dashboard.` },
        { status: 503 }
      );
    }

    // Generate file path: user/<userId>/<yyyy>/<mm>/<dd>/<cuid>.<ext>
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const fileId = cuid();
    const ext = file.name.split(".").pop() ?? "webm";
    const path = `user/${session.user.id}/${year}/${month}/${day}/${fileId}.${ext}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(JOURNAL_AUDIO_BUCKET)
      .upload(path, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      console.error("Upload details:", { path, bucket: JOURNAL_AUDIO_BUCKET, fileSize: file.size, mimeType: file.type });
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Create AudioAsset
    const audioAsset = await prisma.audioAsset.create({
      data: {
        userId: session.user.id,
        bucket: JOURNAL_AUDIO_BUCKET,
        path: uploadData.path,
        mime: file.type,
        size: file.size,
        // duration will be set later if needed
      },
    });

    // Create JournalEntry with audio reference
    const entry = await prisma.journalEntry.create({
      data: {
        userId: session.user.id,
        type: "AUDIO",
        audioId: audioAsset.id,
      },
      include: {
        audio: true,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Upload audio error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error stack:", errorStack);
    return NextResponse.json(
      { error: `Failed to upload audio: ${errorMessage}` },
      { status: 500 }
    );
  }
}

