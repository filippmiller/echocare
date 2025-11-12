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

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_MB = 5;
const MAX_AVATAR_BYTES = MAX_AVATAR_MB * 1024 * 1024;
const ALLOWED_AVATAR_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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
    if (file.size > MAX_AVATAR_BYTES) {
      return payloadTooLarge(`File size exceeds ${MAX_AVATAR_MB}MB limit`);
    }

    // Check MIME type
    if (!ALLOWED_AVATAR_MIME.includes(file.type)) {
      return unsupportedMediaType(`MIME type ${file.type} is not allowed. Allowed types: ${ALLOWED_AVATAR_MIME.join(", ")}`);
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
    
    if (!buckets?.some((b) => b.name === AVATAR_BUCKET)) {
      console.error(`Bucket '${AVATAR_BUCKET}' not found. Available buckets:`, buckets?.map((b) => b.name).join(", ") ?? "none");
      return NextResponse.json(
        { error: `Storage bucket '${AVATAR_BUCKET}' is not available. Please create it in Supabase Dashboard.` },
        { status: 503 }
      );
    }

    // Generate file path: user/<userId>/avatar/<cuid>.<ext>
    const fileId = cuid();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `user/${session.user.id}/avatar/${fileId}.${ext}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .upload(path, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      console.error("Upload details:", { path, bucket: AVATAR_BUCKET, fileSize: file.size, mimeType: file.type });
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Store path in profile, not full URL (we'll generate URL on demand)
    // This allows us to use public or signed URLs as needed
    const avatarPath = uploadData.path;

    // Generate URL for immediate use (signed URL, valid for 1 hour)
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(avatarPath, 3600);

    // Fallback to public URL if signed URL fails
    const { data: publicUrlData } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath);
    const immediateUrl = signedUrlData?.signedUrl ?? publicUrlData.publicUrl;

    // Update profile with avatar path (store path, not full URL)
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    let profile;
    if (existingProfile) {
      profile = await prisma.profile.update({
        where: { userId: session.user.id },
        data: { avatarUrl: avatarPath }, // Store path, not URL
      });
    } else {
      profile = await prisma.profile.create({
        data: {
          userId: session.user.id,
          avatarUrl: avatarPath, // Store path, not URL
        },
      });
    }

    // Return immediate URL for client to use right away
    return NextResponse.json({ avatarUrl: immediateUrl, path: avatarPath }, { status: 200 });
  } catch (error) {
    console.error("Upload avatar error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error stack:", errorStack);
    return NextResponse.json(
      { error: `Failed to upload avatar: ${errorMessage}` },
      { status: 500 }
    );
  }
}

