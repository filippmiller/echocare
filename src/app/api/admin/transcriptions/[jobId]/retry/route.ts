import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, notFound, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/transcriptions/[jobId]/retry
 * Retry a failed transcription job (admin only)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session || session.user.role !== "ADMIN") {
      return unauthorized();
    }

    const { jobId } = await params;

    const job = await prisma.transcriptionJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return notFound("Transcription job not found");
    }

    // Reset job to PENDING
    await prisma.transcriptionJob.update({
      where: { id: jobId },
      data: {
        status: "PENDING",
        error: null,
        startedAt: null,
        finishedAt: null,
      },
    });

    return NextResponse.json({ success: true, message: "Job queued for retry" });
  } catch (error) {
    console.error("[Admin Retry API] Error:", error);
    return internalServerError("Failed to retry job");
  }
}

