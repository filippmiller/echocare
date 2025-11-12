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

    // List all buckets
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();

    if (bucketsError) {
      return NextResponse.json(
        { error: `Failed to list buckets: ${bucketsError.message}` },
        { status: 500 }
      );
    }

    const bucketsInfo = [];

    for (const bucket of buckets ?? []) {
      // List files in bucket (first 20)
      const { data: files, error: filesError } = await supabaseAdmin.storage
        .from(bucket.name)
        .list("", {
          limit: 20,
          offset: 0,
          sortBy: { column: "created_at", order: "desc" },
        });

      bucketsInfo.push({
        name: bucket.name,
        public: bucket.public,
        created_at: bucket.created_at,
        updated_at: bucket.updated_at,
        filesCount: files?.length ?? 0,
        files: filesError
          ? { error: filesError.message }
          : files?.map((f) => ({
              name: f.name,
              size: f.metadata?.size ?? 0,
              created_at: f.created_at,
            })) ?? [],
      });
    }

    return NextResponse.json({
      buckets: bucketsInfo,
      totalBuckets: buckets?.length ?? 0,
    });
  } catch (error) {
    console.error("Check storage error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

