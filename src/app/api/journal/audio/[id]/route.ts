import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, notFound, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin, JOURNAL_AUDIO_BUCKET } from "@/lib/supabaseServer";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      console.info("[Audio API] Unauthorized: no session");
      return unauthorized();
    }

    const { id } = await params;
    console.info(`[Audio API] Request for audioId: ${id}, userId: ${session.user.id}`);

    const audioAsset = await prisma.audioAsset.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        bucket: true,
        path: true,
        mime: true,
      },
    });

    if (!audioAsset) {
      console.error(`[Audio API] AudioAsset not found: ${id}`);
      return notFound("Audio asset not found");
    }

    // Verify ownership
    if (audioAsset.userId !== session.user.id) {
      console.error(`[Audio API] Ownership mismatch: asset userId=${audioAsset.userId}, session userId=${session.user.id}`);
      return unauthorized();
    }

    console.info(`[Audio API] Found asset: bucket=${audioAsset.bucket}, path=${audioAsset.path}, mime=${audioAsset.mime}`);

    // Generate signed URL (valid for 1 hour)
    const supabaseAdmin = getSupabaseAdmin();
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(audioAsset.bucket)
      .createSignedUrl(audioAsset.path, 60 * 60); // 1 hour expiry

    let audioUrl: string;
    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error(`[Audio API] Signed URL error for path=${audioAsset.path}:`, signedUrlError);
      // Fallback to public URL if signed URL fails
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(audioAsset.bucket)
        .getPublicUrl(audioAsset.path);
      audioUrl = publicUrlData.publicUrl;
      console.info(`[Audio API] Using public URL fallback: ${audioUrl.substring(0, 50)}...`);
    } else {
      audioUrl = signedUrlData.signedUrl;
      console.info(`[Audio API] Generated signed URL successfully`);
    }

    const mimeType = audioAsset.mime ?? "audio/mpeg";
    
    return NextResponse.json(
      { url: audioUrl, mimeType },
      { headers: { "Cache-Control": "private, max-age=60" } }
    );
  } catch (error) {
    console.error("[Audio API] Get audio URL error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Audio API] Error details:", { message: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    return internalServerError("Failed to get audio URL");
  }
}

