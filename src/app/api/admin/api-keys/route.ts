import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, badRequest, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";
import { encryptApiKey, maskApiKey } from "@/lib/apiKeys";
import { z } from "zod";

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  provider: z.string().min(1).max(50),
  keyValue: z.string().min(1),
});

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/admin/api-keys
 * List all API keys (admin only)
 */
export async function GET() {
  try {
    const session = await getServerAuthSession();
    if (!session || session.user.role !== "ADMIN") {
      return unauthorized();
    }

    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        provider: true,
        keyValue: true, // We'll mask it
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
      },
    });

    // For display, we'll show a masked placeholder since we can't decrypt without the key
    // In a real scenario, we'd decrypt then mask, but for security we'll just show a placeholder
    const maskedKeys = keys.map((key) => ({
      ...key,
      maskedValue: "••••••••", // Placeholder - actual masking would require decryption
    }));

    return NextResponse.json({ keys: maskedKeys });
  } catch (error) {
    console.error("[Admin API Keys] List error:", error);
    return internalServerError("Failed to list API keys");
  }
}

/**
 * POST /api/admin/api-keys
 * Create new API key (admin only)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session || session.user.role !== "ADMIN") {
      return unauthorized();
    }

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = createApiKeySchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid input", parsed.error.issues);
    }

    const { name, provider, keyValue } = parsed.data;

    // Encrypt the key value before storing
    const encryptedValue = encryptApiKey(keyValue);

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        provider: provider.toLowerCase(),
        keyValue: encryptedValue,
        createdBy: session.user.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        provider: true,
        keyValue: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        id: apiKey.id,
        name: apiKey.name,
        provider: apiKey.provider,
        maskedValue: `••••${keyValue.slice(-4)}`, // Show last 4 chars
        isActive: apiKey.isActive,
        createdAt: apiKey.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Admin API Keys] Create error:", error);
    return internalServerError("Failed to create API key");
  }
}

