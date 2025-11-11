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

    // Check if bucket exists (basic check via listBuckets)
    const supabaseAdmin = getSupabaseAdmin();
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();
    if (bucketError || !buckets?.some((b) => b.name === JOURNAL_AUDIO_BUCKET)) {
      return NextResponse.json(
        { error: "Storage bucket is not available. Please contact support." },
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
      console.error("Supabase upload error", uploadError);
      return internalServerError("Failed to upload file to storage");
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
    console.error("Upload audio error", error);
    return internalServerError("Failed to upload audio");
  }
}

