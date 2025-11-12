import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/transcriptions
 * Get transcription jobs (admin only)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session || session.user.role !== "ADMIN") {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const jobs = await prisma.transcriptionJob.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        entry: {
          select: {
            id: true,
            userId: true,
            type: true,
            title: true,
            createdAt: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("[Admin Transcriptions API] Error:", error);
    return internalServerError("Failed to get transcription jobs");
  }
}

