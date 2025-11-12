import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, badRequest, internalServerError } from "@/lib/apiErrors";
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
    const path = searchParams.get("path");

    if (!path) {
      return badRequest("Missing 'path' query parameter");
    }

    // Verify ownership - path should start with user/<userId>/
    if (!path.startsWith(`user/${session.user.id}/`)) {
      return unauthorized();
    }

    // If path is already a full URL, return it (legacy support)
    if (path.startsWith("http")) {
      return NextResponse.json({ avatarUrl: path });
    }

    // Generate signed URL from path
    const supabaseAdmin = getSupabaseAdmin();

    // Try signed URL first (works for both public and private buckets)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(path, 60 * 60); // 1 hour expiry

    let avatarUrl: string;
    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.warn("Failed to get signed URL for avatar, falling back to public URL:", signedUrlError);
      // Fallback to public URL if signed URL fails
      const { data: publicUrlData } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      avatarUrl = publicUrlData.publicUrl;
    } else {
      avatarUrl = signedUrlData.signedUrl;
    }

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    console.error("Get avatar URL error:", error);
    return internalServerError("Failed to get avatar URL");
  }
}

