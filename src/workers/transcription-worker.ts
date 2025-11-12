import { prisma } from "@/lib/prisma";
import { transcribeSupabaseAudio, generateSummaryAndTags } from "@/lib/transcription";

const BATCH_SIZE = parseInt(process.env.TRANSCRIBE_BATCH_SIZE ?? "5", 10);
const MAX_ATTEMPTS = 3;

/**
 * Process transcription queue
 * Takes PENDING jobs, processes them, and updates status
 */
export async function processTranscriptionQueue() {
  try {
    console.info(`[Transcription Worker] Starting queue processing...`);

    // Get pending jobs (SELECT FOR UPDATE SKIP LOCKED equivalent via Prisma transaction)
    const jobs = await prisma.$transaction(
      async (tx) => {
        // Find pending jobs
        const pending = await tx.transcriptionJob.findMany({
          where: {
            status: "PENDING",
          },
          take: BATCH_SIZE,
          orderBy: { createdAt: "asc" },
          include: {
            entry: {
              include: {
                audio: {
                  select: {
                    path: true,
                    mime: true,
                    userId: true,
                  },
                },
              },
            },
          },
        });

        // Update status to RUNNING
        const ids = pending.map((j) => j.id);
        if (ids.length > 0) {
          await tx.transcriptionJob.updateMany({
            where: { id: { in: ids } },
            data: {
              status: "RUNNING",
              startedAt: new Date(),
            },
          });
        }

        return pending;
      },
      {
        isolationLevel: "ReadCommitted",
      }
    );

    if (jobs.length === 0) {
      console.info(`[Transcription Worker] No pending jobs found`);
      return;
    }

    console.info(`[Transcription Worker] Processing ${jobs.length} job(s)`);

    // Process each job
    for (const job of jobs) {
      try {
        console.info(`[Transcription Worker] Processing job ${job.id} for entry ${job.entryId}`);

        if (!job.entry.audio) {
          throw new Error("Entry has no audio asset");
        }

        // Get language from user profile or default to "ru"
        // Fetch user profile separately
        const profile = await prisma.profile.findUnique({
          where: { userId: job.entry.userId },
          select: { locale: true },
        });

        const lang =
          profile?.locale === "ru" ? "ru" : profile?.locale === "en" ? "en" : "ru";

        // Transcribe audio
        const result = await transcribeSupabaseAudio({
          path: job.entry.audio.path,
          lang,
          prompt: "", // Can be enhanced later with user-specific prompts
        });

        console.info(`[Transcription Worker] Transcription completed for job ${job.id}`);

        // Generate summary and tags
        let summary = "";
        let tags: string[] = [];
        try {
          const summaryResult = await generateSummaryAndTags(result.text, lang);
          summary = summaryResult.summary;
          tags = summaryResult.tags;
          console.info(`[Transcription Worker] Summary and tags generated for job ${job.id}`);
        } catch (summaryError) {
          console.error(`[Transcription Worker] Failed to generate summary:`, summaryError);
          // Continue without summary/tags if generation fails
        }

        // Update entry with transcription
        await prisma.journalEntry.update({
          where: { id: job.entryId },
          data: {
            text: result.text,
            summary: summary || null,
            tags: tags.length > 0 ? tags : [],
            transcribedAt: new Date(),
          },
        });

        // Update job status to DONE
        await prisma.transcriptionJob.update({
          where: { id: job.id },
          data: {
            status: "DONE",
            finishedAt: new Date(),
          },
        });

        console.info(`[Transcription Worker] Job ${job.id} completed successfully`);
      } catch (error) {
        console.error(`[Transcription Worker] Job ${job.id} failed:`, error);

        const attempts = job.attempts + 1;
        const shouldRetry = attempts < MAX_ATTEMPTS;

        // Update job with error
        await prisma.transcriptionJob.update({
          where: { id: job.id },
          data: {
            status: shouldRetry ? "PENDING" : "ERROR",
            error: error instanceof Error ? error.message : "Unknown error",
            attempts,
            finishedAt: shouldRetry ? null : new Date(),
            startedAt: shouldRetry ? null : job.startedAt, // Reset startedAt if retrying
          },
        });

        if (shouldRetry) {
          console.info(`[Transcription Worker] Job ${job.id} will be retried (attempt ${attempts}/${MAX_ATTEMPTS})`);
        } else {
          console.error(`[Transcription Worker] Job ${job.id} failed after ${attempts} attempts`);
        }
      }
    }

    console.info(`[Transcription Worker] Queue processing completed`);
  } catch (error) {
    console.error("[Transcription Worker] Queue processing error:", error);
    throw error;
  }
}

/**
 * Start worker loop (for continuous process)
 */
export async function startWorker() {
  console.info("[Transcription Worker] Starting worker...");

  const pollInterval = parseInt(process.env.TRANSCRIBE_POLL_INTERVAL_MS ?? "10000", 10); // Default 10 seconds

  while (true) {
    try {
      await processTranscriptionQueue();
    } catch (error) {
      console.error("[Transcription Worker] Error in worker loop:", error);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}

// If running as standalone script
if (require.main === module) {
  startWorker().catch((error) => {
    console.error("[Transcription Worker] Fatal error:", error);
    process.exit(1);
  });
}

