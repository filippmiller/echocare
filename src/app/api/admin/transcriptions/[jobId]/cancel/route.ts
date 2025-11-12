import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, notFound, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/transcriptions/[jobId]/cancel
 * Cancel a pending/running transcription job (admin only)
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

    if (job.status !== "PENDING" && job.status !== "RUNNING") {
      return NextResponse.json(
        { error: "Job cannot be cancelled (already finished or errored)" },
        { status: 400 }
      );
    }

    // Mark as ERROR with cancellation message
    await prisma.transcriptionJob.update({
      where: { id: jobId },
      data: {
        status: "ERROR",
        error: "Cancelled by admin",
        finishedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: "Job cancelled" });
  } catch (error) {
    console.error("[Admin Cancel API] Error:", error);
    return internalServerError("Failed to cancel job");
  }
}

