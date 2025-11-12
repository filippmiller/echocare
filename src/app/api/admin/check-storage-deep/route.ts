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

    const bucketsToCheck = ["avatars", "journal-audio"];
    const result: Record<string, any> = {};

    for (const bucketName of bucketsToCheck) {
      // List files recursively
      const { data: files, error } = await supabaseAdmin.storage
        .from(bucketName)
        .list("user", {
          limit: 100,
          offset: 0,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) {
        result[bucketName] = { error: error.message };
        continue;
      }

      // Get detailed info
      const fileList: any[] = [];
      
      if (files) {
        for (const file of files) {
          // If it's a folder, try to list its contents
          if (file.id === null) {
            const { data: subFiles } = await supabaseAdmin.storage
              .from(bucketName)
              .list(`user/${file.name}`, { limit: 50 });
            
            fileList.push({
              name: file.name,
              type: "folder",
              items: subFiles?.length ?? 0,
            });
          } else {
            fileList.push({
              name: file.name,
              type: "file",
              size: file.metadata?.size ?? 0,
              created_at: file.created_at,
            });
          }
        }
      }

      result[bucketName] = {
        files: fileList,
        total: files?.length ?? 0,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Check storage deep error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

