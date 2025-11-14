import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, badRequest, notFound, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/profile/avatar/select - Select avatar from user's photos
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return unauthorized();
    }

    const body = (await request.json().catch(() => null)) as { photoId?: string } | null;

    if (!body || !body.photoId) {
      return badRequest("photoId is required");
    }

    // Find photo and verify ownership
    const photo = await prisma.photoAsset.findUnique({
      where: { id: body.photoId },
    });

    if (!photo) {
      return notFound("Photo not found");
    }

    if (photo.userId !== session.user.id) {
      return unauthorized();
    }

    // Update profile with photo path as avatar
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (existingProfile) {
      await prisma.profile.update({
        where: { userId: session.user.id },
        data: { avatarUrl: photo.path },
      });
    } else {
      await prisma.profile.create({
        data: {
          userId: session.user.id,
          avatarUrl: photo.path,
        },
      });
    }

    return NextResponse.json({ success: true, avatarPath: photo.path }, { status: 200 });
  } catch (error) {
    console.error("Select avatar error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return internalServerError(`Failed to select avatar: ${errorMessage}`);
  }
}


