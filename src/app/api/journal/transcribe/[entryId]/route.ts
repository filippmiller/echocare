import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, notFound, badRequest, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";
import { cuid } from "@/lib/utils";

/**
 * POST /api/journal/transcribe/[entryId]
 * Create a transcription job for an audio entry
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return unauthorized();
    }

    const { entryId } = await params;

    // Verify entry exists and belongs to user
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
      include: {
        audio: true,
        transcriptionJobs: {
          where: {
            status: {
              in: ["PENDING", "RUNNING"],
            },
          },
        },
      },
    });

    if (!entry) {
      return notFound("Journal entry not found");
    }

    if (entry.userId !== session.user.id) {
      return unauthorized();
    }

    if (entry.type !== "AUDIO" || !entry.audio) {
      return badRequest("Entry must be an audio entry");
    }

    // Check if there's already an active job
    if (entry.transcriptionJobs.length > 0) {
      return NextResponse.json(
        {
          jobId: entry.transcriptionJobs[0]!.id,
          status: entry.transcriptionJobs[0]!.status,
          message: "Transcription job already exists",
        },
        { status: 200 }
      );
    }

    // Get user's locale for language detection
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { locale: true },
    });

    // Create new transcription job
    const job = await prisma.transcriptionJob.create({
      data: {
        entryId: entry.id,
        status: "PENDING",
        provider: process.env.WHISPER_PROVIDER ?? "openai",
      },
    });

    return NextResponse.json(
      {
        jobId: job.id,
        status: job.status,
        message: "Transcription job created",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Transcribe API] Error:", error);
    return internalServerError("Failed to create transcription job");
  }
}

