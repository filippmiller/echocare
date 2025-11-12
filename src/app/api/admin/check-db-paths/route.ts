import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerAuthSession();

    if (!session || session.user.role !== "ADMIN") {
      return unauthorized();
    }

    // Check Profile avatarUrl
    const profiles = await prisma.profile.findMany({
      where: { avatarUrl: { not: null } },
      select: {
        userId: true,
        avatarUrl: true,
      },
      take: 10,
    });

    // Check AudioAsset paths
    const audioAssets = await prisma.audioAsset.findMany({
      select: {
        id: true,
        userId: true,
        bucket: true,
        path: true,
        mime: true,
        createdAt: true,
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      profiles: profiles.map((p) => ({
        userId: p.userId,
        avatarUrl: p.avatarUrl,
        isUrl: p.avatarUrl?.startsWith("http") ?? false,
        isPath: p.avatarUrl && !p.avatarUrl.startsWith("http"),
      })),
      audioAssets: audioAssets.map((a) => ({
        id: a.id,
        userId: a.userId,
        bucket: a.bucket,
        path: a.path,
        mime: a.mime,
        createdAt: a.createdAt,
      })),
      summary: {
        profilesWithAvatar: profiles.length,
        profilesWithUrl: profiles.filter((p) => p.avatarUrl?.startsWith("http")).length,
        profilesWithPath: profiles.filter((p) => p.avatarUrl && !p.avatarUrl.startsWith("http")).length,
        audioAssetsCount: audioAssets.length,
      },
    });
  } catch (error) {
    console.error("Check DB paths error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

