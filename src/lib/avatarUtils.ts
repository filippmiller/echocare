import { getSupabaseAdmin } from "./supabaseServer";

const AVATAR_BUCKET = "avatars";

/**
 * Get avatar URL from stored path
 * Handles both full URLs (legacy) and paths (new approach)
 */
export async function getAvatarUrl(avatarUrlOrPath: string | null | undefined): Promise<string | null> {
  if (!avatarUrlOrPath) {
    return null;
  }

  // If it's already a full URL, return it
  if (avatarUrlOrPath.startsWith("http")) {
    return avatarUrlOrPath;
  }

  // Otherwise, treat it as a path and generate signed URL
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Try signed URL first (works for both public and private buckets)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(avatarUrlOrPath, 3600); // 1 hour expiry

    if (!signedUrlError && signedUrlData?.signedUrl) {
      return signedUrlData.signedUrl;
    }

    // Fallback to public URL
    const { data: publicUrlData } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(avatarUrlOrPath);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Error generating avatar URL:", error);
    return null;
  }
}

