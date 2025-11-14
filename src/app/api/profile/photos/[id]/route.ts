import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, notFound, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

const PHOTOS_BUCKET = "avatars";

/**
 * DELETE /api/profile/photos/[id] - Delete a photo
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return unauthorized();
    }

    const { id } = await params;

    // Find photo and verify ownership
    const photo = await prisma.photoAsset.findUnique({
      where: { id },
    });

    if (!photo) {
      return notFound("Photo not found");
    }

    if (photo.userId !== session.user.id) {
      return unauthorized();
    }

    // Delete from Supabase Storage
    const supabaseAdmin = getSupabaseAdmin();
    const { error: deleteError } = await supabaseAdmin.storage
      .from(PHOTOS_BUCKET)
      .remove([photo.path]);

    if (deleteError) {
      console.error("Supabase delete error:", deleteError);
      // Continue with DB deletion even if storage deletion fails
    }

    // Delete from database
    await prisma.photoAsset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete photo error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return internalServerError(`Failed to delete photo: ${errorMessage}`);
  }
}


