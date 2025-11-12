import { getSupabaseAdmin } from "./supabaseServer";

const AVATAR_BUCKET = "avatars";

/**
 * Get avatar URL from stored path
 * Unified helper: always generates signed URL first, falls back to public URL if needed
 * Handles both full URLs (legacy) and paths (new approach)
 */
export async function getAvatarUrl(path?: string | null): Promise<string | null> {
  if (!path) {
    return null;
  }

  // If it's already a full URL (legacy data), return it
  if (path.startsWith("http")) {
    return path;
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Сначала пытаемся signed URL (работает для публичных и приватных bucket)
    const { data, error } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(path, 60 * 60); // 1 hour expiry

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }

    // Фолбэк на public URL — если bucket public
    const { data: pub } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    return pub.publicUrl ?? null;
  } catch (error) {
    console.error("Error generating avatar URL:", error);
    return null;
  }
}

