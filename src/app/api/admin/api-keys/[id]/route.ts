import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, notFound, badRequest, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";
// Note: We don't decrypt keys in API responses for security
import { z } from "zod";

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/admin/api-keys/[id]
 * Get single API key (admin only)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session || session.user.role !== "ADMIN") {
      return unauthorized();
    }

    const { id } = await params;

    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      return notFound("API key not found");
    }

    return NextResponse.json({
      id: apiKey.id,
      name: apiKey.name,
      provider: apiKey.provider,
      maskedValue: "••••••••", // Placeholder - actual value is encrypted
      isActive: apiKey.isActive,
      lastUsedAt: apiKey.lastUsedAt,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
      createdBy: apiKey.createdBy,
    });
  } catch (error) {
    console.error("[Admin API Keys] Get error:", error);
    return internalServerError("Failed to get API key");
  }
}

/**
 * PUT /api/admin/api-keys/[id]
 * Update API key (admin only)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session || session.user.role !== "ADMIN") {
      return unauthorized();
    }

    const { id } = await params;

    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      return notFound("API key not found");
    }

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = updateApiKeySchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid input", parsed.error.issues);
    }

    const updateData: { name?: string; isActive?: boolean } = {};
    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name;
    }
    if (parsed.data.isActive !== undefined) {
      updateData.isActive = parsed.data.isActive;
    }

    const updated = await prisma.apiKey.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      provider: updated.provider,
      maskedValue: "••••••••", // Placeholder
      isActive: updated.isActive,
      lastUsedAt: updated.lastUsedAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error("[Admin API Keys] Update error:", error);
    return internalServerError("Failed to update API key");
  }
}

/**
 * DELETE /api/admin/api-keys/[id]
 * Delete API key (admin only)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session || session.user.role !== "ADMIN") {
      return unauthorized();
    }

    const { id } = await params;

    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      return notFound("API key not found");
    }

    await prisma.apiKey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "API key deleted" });
  } catch (error) {
    console.error("[Admin API Keys] Delete error:", error);
    return internalServerError("Failed to delete API key");
  }
}

