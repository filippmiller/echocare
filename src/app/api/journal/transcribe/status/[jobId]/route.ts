import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, notFound, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/journal/transcribe/status/[jobId]
 * Get transcription job status
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return unauthorized();
    }

    const { jobId } = await params;

    const job = await prisma.transcriptionJob.findUnique({
      where: { id: jobId },
      include: {
        entry: {
          select: {
            userId: true,
            text: true,
            summary: true,
            tags: true,
            transcribedAt: true,
          },
        },
      },
    });

    if (!job) {
      return notFound("Transcription job not found");
    }

    // Verify ownership
    if (job.entry.userId !== session.user.id) {
      return unauthorized();
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      provider: job.provider,
      attempts: job.attempts,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      entry: {
        text: job.entry.text,
        summary: job.entry.summary,
        tags: job.entry.tags,
        transcribedAt: job.entry.transcribedAt,
      },
    });
  } catch (error) {
    console.error("[Transcribe Status API] Error:", error);
    return internalServerError("Failed to get transcription status");
  }
}

