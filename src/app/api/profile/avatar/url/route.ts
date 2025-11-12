import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, notFound, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

const AVATAR_BUCKET = "avatars";

/**
 * Get avatar URL (signed or public) from stored path
 * This endpoint generates a fresh URL when needed
 */
export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? session.user.id;

    // Verify ownership (users can only get their own avatar URL)
    if (userId !== session.user.id) {
      return unauthorized();
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        avatarUrl: true,
      },
    });

    if (!profile?.avatarUrl) {
      return notFound("Avatar not found");
    }

    // If avatarUrl is already a full URL, return it
    if (profile.avatarUrl.startsWith("http")) {
      return NextResponse.json({ url: profile.avatarUrl });
    }

    // Otherwise, treat it as a path and generate URL
    const supabaseAdmin = getSupabaseAdmin();

    // Try to get public URL first (if bucket is public)
    const { data: publicUrlData } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(profile.avatarUrl);
    
    // For now, use public URL. If bucket is private, we'll need signed URLs
    // Check if public URL works by trying signed URL as fallback
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(profile.avatarUrl, 3600); // 1 hour expiry

    const avatarUrl = signedUrlData?.signedUrl ?? publicUrlData.publicUrl;

    return NextResponse.json({ url: avatarUrl });
  } catch (error) {
    console.error("Get avatar URL error:", error);
    return internalServerError("Failed to get avatar URL");
  }
}

