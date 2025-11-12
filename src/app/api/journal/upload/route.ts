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
    console.info("[Audio Upload API] Request received");
    
    const session = await getServerAuthSession();

    if (!session) {
      console.error("[Audio Upload API] Unauthorized: no session");
      return unauthorized();
    }

    console.info(`[Audio Upload API] User: ${session.user.id}`);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      console.error("[Audio Upload API] No file in request");
      return badRequest("File is required");
    }

    console.info(`[Audio Upload API] File received: name=${file.name}, size=${file.size}, type=${file.type}`);

    // Check file size
    if (file.size > MAX_AUDIO_BYTES) {
      console.error(`[Audio Upload API] File too large: ${file.size} > ${MAX_AUDIO_BYTES}`);
      return payloadTooLarge(`File size exceeds ${MAX_AUDIO_BYTES / 1024 / 1024}MB limit`);
    }

    // Check MIME type
    if (!ALLOWED_AUDIO_MIME.includes(file.type)) {
      console.error(`[Audio Upload API] Invalid MIME type: ${file.type}, allowed: ${ALLOWED_AUDIO_MIME.join(", ")}`);
      return unsupportedMediaType(`MIME type ${file.type} is not allowed. Allowed types: ${ALLOWED_AUDIO_MIME.join(", ")}`);
    }

    // Check if bucket exists
    console.info(`[Audio Upload API] Checking bucket: ${JOURNAL_AUDIO_BUCKET}`);
    const supabaseAdmin = getSupabaseAdmin();
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketError) {
      console.error("[Audio Upload API] Supabase listBuckets error:", bucketError);
      return NextResponse.json(
        { error: `Storage error: ${bucketError.message}` },
        { status: 503 }
      );
    }
    
    if (!buckets?.some((b) => b.name === JOURNAL_AUDIO_BUCKET)) {
      console.error(`[Audio Upload API] Bucket '${JOURNAL_AUDIO_BUCKET}' not found. Available buckets:`, buckets?.map((b) => b.name).join(", ") ?? "none");
      return NextResponse.json(
        { error: `Storage bucket '${JOURNAL_AUDIO_BUCKET}' is not available. Please create it in Supabase Dashboard.` },
        { status: 503 }
      );
    }

    console.info(`[Audio Upload API] Bucket found, proceeding with upload`);

    // Generate file path: user/<userId>/<yyyy>/<mm>/<dd>/<cuid>.<ext>
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const fileId = cuid();
    const ext = file.name.split(".").pop() ?? "webm";
    const path = `user/${session.user.id}/${year}/${month}/${day}/${fileId}.${ext}`;

    console.info(`[Audio Upload API] Generated path: ${path}`);

    // Upload to Supabase Storage
    console.info(`[Audio Upload API] Starting upload to Supabase Storage...`);
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(JOURNAL_AUDIO_BUCKET)
      .upload(path, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[Audio Upload API] Supabase upload error:", uploadError);
      console.error("[Audio Upload API] Upload details:", { path, bucket: JOURNAL_AUDIO_BUCKET, fileSize: file.size, mimeType: file.type });
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    console.info(`[Audio Upload API] Upload successful, path: ${uploadData.path}`);

    // Create AudioAsset
    console.info(`[Audio Upload API] Creating AudioAsset in database...`);
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

    console.info(`[Audio Upload API] AudioAsset created: ${audioAsset.id}`);

    // Create JournalEntry with audio reference
    console.info(`[Audio Upload API] Creating JournalEntry...`);
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

    console.info(`[Audio Upload API] JournalEntry created: ${entry.id}`);

    // Create TranscriptionJob for automatic transcription
    console.info(`[Audio Upload API] Creating TranscriptionJob...`);
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { locale: true },
    });

    const transcriptionJob = await prisma.transcriptionJob.create({
      data: {
        entryId: entry.id,
        status: "PENDING",
        provider: process.env.WHISPER_PROVIDER ?? "openai",
      },
    });

    console.info(`[Audio Upload API] TranscriptionJob created: ${transcriptionJob.id}`);
    console.info(`[Audio Upload API] Upload complete successfully`);

    return NextResponse.json(
      {
        ...entry,
        transcriptionJobId: transcriptionJob.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Audio Upload API] Upload audio error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[Audio Upload API] Error details:", { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      { error: `Failed to upload audio: ${errorMessage}` },
      { status: 500 }
    );
  }
}

