import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";

/**
 * Fix avatar URLs in database - convert full URLs to paths
 * POST /api/admin/fix-avatar-paths
 */
export async function POST() {
  try {
    const session = await getServerAuthSession();

    if (!session || session.user.role !== "ADMIN") {
      return unauthorized();
    }

    // Find all profiles with avatarUrl that starts with http
    const profiles = await prisma.profile.findMany({
      where: {
        avatarUrl: {
          startsWith: "http",
        },
      },
      select: {
        id: true,
        userId: true,
        avatarUrl: true,
      },
    });

    const results = [];

    for (const profile of profiles) {
      if (!profile.avatarUrl) continue;

      // Extract path from URL
      // Pattern: https://...supabase.co/storage/v1/object/(sign|public)/avatars/<path>
      const match = profile.avatarUrl.match(/\/storage\/v1\/object\/(?:sign|public)\/avatars\/(.+)$/);
      
      if (match && match[1]) {
        const path = match[1];
        
        // Update profile with path
        await prisma.profile.update({
          where: { id: profile.id },
          data: { avatarUrl: path },
        });

        results.push({
          userId: profile.userId,
          oldUrl: profile.avatarUrl.substring(0, 80) + "...",
          newPath: path,
          success: true,
        });
      } else {
        results.push({
          userId: profile.userId,
          oldUrl: profile.avatarUrl.substring(0, 80) + "...",
          error: "Could not extract path from URL",
          success: false,
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${profiles.length} profile(s)`,
      results,
      summary: {
        total: profiles.length,
        fixed: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    });
  } catch (error) {
    console.error("Fix avatar paths error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

