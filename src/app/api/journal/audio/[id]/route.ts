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
      return unauthorized();
    }

    const { id } = await params;
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
      return notFound("Audio asset not found");
    }

    // Verify ownership
    if (audioAsset.userId !== session.user.id) {
      return unauthorized();
    }

    // Generate signed URL (valid for 1 hour)
    const supabaseAdmin = getSupabaseAdmin();
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(audioAsset.bucket)
      .createSignedUrl(audioAsset.path, 3600); // 1 hour expiry

    let audioUrl: string;
    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Error creating signed URL:", signedUrlError);
      // Fallback to public URL if signed URL fails
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(audioAsset.bucket)
        .getPublicUrl(audioAsset.path);
      audioUrl = publicUrlData.publicUrl;
    } else {
      audioUrl = signedUrlData.signedUrl;
    }

    return NextResponse.json({
      url: audioUrl,
      mimeType: audioAsset.mime,
    });
  } catch (error) {
    console.error("Get audio URL error:", error);
    return internalServerError("Failed to get audio URL");
  }
}

