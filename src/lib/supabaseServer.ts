import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

let supabaseAdminInstance: SupabaseClient | null = null;

/**
 * Get Supabase admin client (server-only, lazy initialization)
 * Uses Service Role Key for server-side operations
 * Never expose this to the client!
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAdminInstance;
}

/**
 * Get the configured bucket name for journal audio
 */
export const JOURNAL_AUDIO_BUCKET = process.env.SUPABASE_BUCKET ?? "journal-audio";

/**
 * Maximum audio file size in MB
 */
export const MAX_AUDIO_MB = Number.parseInt(process.env.MAX_AUDIO_MB ?? "20", 10);

/**
 * Maximum audio file size in bytes
 */
export const MAX_AUDIO_BYTES = MAX_AUDIO_MB * 1024 * 1024;

/**
 * Allowed audio MIME types
 */
export const ALLOWED_AUDIO_MIME = (process.env.ALLOWED_AUDIO_MIME ?? "audio/webm,audio/ogg,audio/m4a,audio/mp3").split(
  ","
);

