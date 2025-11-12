import { NextResponse } from "next/server";
import { processTranscriptionQueue } from "@/workers/transcription-worker";

/**
 * GET /api/cron/transcription
 * Railway Cron endpoint for processing transcription queue
 * Protected by CRON_SECRET environment variable
 */
export async function GET(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET not configured");
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.info("[Cron] Starting transcription queue processing...");
    await processTranscriptionQueue();
    console.info("[Cron] Transcription queue processing completed");

    return NextResponse.json({
      success: true,
      message: "Transcription queue processed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Transcription error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Processing failed",
      },
      { status: 500 }
    );
  }
}

