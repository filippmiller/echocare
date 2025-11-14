import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import {
  badRequest,
  unauthorized,
  payloadTooLarge,
  unsupportedMediaType,
  internalServerError,
} from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { cuid } from "@/lib/utils";

const PHOTOS_BUCKET = "avatars"; // Используем тот же bucket что и для аватаров
const MAX_PHOTO_MB = 10;
const MAX_PHOTO_BYTES = MAX_PHOTO_MB * 1024 * 1024;
const ALLOWED_PHOTO_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * POST /api/profile/photos - Upload a photo
 */
export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return unauthorized();
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return badRequest("File is required");
    }

    // Check file size
    if (file.size > MAX_PHOTO_BYTES) {
      return payloadTooLarge(`File size exceeds ${MAX_PHOTO_MB}MB limit`);
    }

    // Check MIME type
    if (!ALLOWED_PHOTO_MIME.includes(file.type)) {
      return unsupportedMediaType(`MIME type ${file.type} is not allowed. Allowed types: ${ALLOWED_PHOTO_MIME.join(", ")}`);
    }

    // Check if bucket exists
    const supabaseAdmin = getSupabaseAdmin();
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();

    if (bucketError) {
      console.error("Supabase listBuckets error:", bucketError);
      return NextResponse.json(
        { error: `Storage error: ${bucketError.message}` },
        { status: 503 }
      );
    }

    if (!buckets?.some((b) => b.name === PHOTOS_BUCKET)) {
      console.error(`Bucket '${PHOTOS_BUCKET}' not found. Available buckets:`, buckets?.map((b) => b.name).join(", ") ?? "none");
      return NextResponse.json(
        { error: `Storage bucket '${PHOTOS_BUCKET}' is not available. Please create it in Supabase Dashboard.` },
        { status: 503 }
      );
    }

    // Generate file path: user/<userId>/photos/<cuid>.<ext>
    const fileId = cuid();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `user/${session.user.id}/photos/${fileId}.${ext}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(PHOTOS_BUCKET)
      .upload(path, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Try to get image dimensions (optional, can be done client-side)
    let width: number | undefined;
    let height: number | undefined;

    // Create PhotoAsset record
    const photoAsset = await prisma.photoAsset.create({
      data: {
        userId: session.user.id,
        bucket: PHOTOS_BUCKET,
        path: uploadData.path,
        mime: file.type,
        size: file.size,
        width,
        height,
      },
    });

    // Generate signed URL for immediate use
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrl(uploadData.path, 3600);

    const { data: publicUrlData } = supabaseAdmin.storage.from(PHOTOS_BUCKET).getPublicUrl(uploadData.path);
    const immediateUrl = signedUrlData?.signedUrl ?? publicUrlData.publicUrl;

    return NextResponse.json(
      {
        id: photoAsset.id,
        url: immediateUrl,
        path: photoAsset.path,
        width: photoAsset.width,
        height: photoAsset.height,
        createdAt: photoAsset.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload photo error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return internalServerError(`Failed to upload photo: ${errorMessage}`);
  }
}

/**
 * GET /api/profile/photos - Get user's photos
 */
export async function GET() {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return unauthorized();
    }

    const photos = await prisma.photoAsset.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        path: true,
        mime: true,
        size: true,
        width: true,
        height: true,
        createdAt: true,
      },
    });

    // Generate signed URLs for all photos
    const supabaseAdmin = getSupabaseAdmin();
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const { data: signedUrlData } = await supabaseAdmin.storage
          .from(PHOTOS_BUCKET)
          .createSignedUrl(photo.path, 3600);

        const { data: publicUrlData } = supabaseAdmin.storage.from(PHOTOS_BUCKET).getPublicUrl(photo.path);
        const url = signedUrlData?.signedUrl ?? publicUrlData.publicUrl;

        return {
          ...photo,
          url,
        };
      })
    );

    return NextResponse.json({ photos: photosWithUrls }, { status: 200 });
  } catch (error) {
    console.error("Get photos error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return internalServerError(`Failed to get photos: ${errorMessage}`);
  }
}


