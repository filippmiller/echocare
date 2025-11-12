import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized } from "@/lib/apiErrors";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const session = await getServerAuthSession();

    if (!session || session.user.role !== "ADMIN") {
      return unauthorized();
    }

    const supabaseAdmin = getSupabaseAdmin();
    const userId = session.user.id;

    const result: Record<string, any> = {};

    // Check avatars bucket
    const avatarPath = `user/${userId}/avatar`;
    const { data: avatarFiles, error: avatarError } = await supabaseAdmin.storage
      .from("avatars")
      .list(avatarPath, { limit: 20 });

    result.avatars = {
      path: avatarPath,
      files: avatarError
        ? { error: avatarError.message }
        : avatarFiles?.map((f) => ({
            name: f.name,
            path: `${avatarPath}/${f.name}`,
            size: f.metadata?.size ?? 0,
            created_at: f.created_at,
          })) ?? [],
      count: avatarFiles?.length ?? 0,
    };

    // Check journal-audio bucket
    const audioPath = `user/${userId}`;
    const { data: audioFiles, error: audioError } = await supabaseAdmin.storage
      .from("journal-audio")
      .list(audioPath, { limit: 20, sortBy: { column: "created_at", order: "desc" } });

    result["journal-audio"] = {
      path: audioPath,
      files: audioError
        ? { error: audioError.message }
        : audioFiles?.map((f) => ({
            name: f.name,
            path: `${audioPath}/${f.name}`,
            size: f.metadata?.size ?? 0,
            created_at: f.created_at,
            isFolder: f.id === null,
          })) ?? [],
      count: audioFiles?.length ?? 0,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Check storage files error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

