import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, notFound, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/apiKeys";
import OpenAI from "openai";

/**
 * POST /api/admin/api-keys/[id]/test
 * Test API key by making a test call (admin only)
 */
export async function POST(
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

    if (!apiKey.isActive) {
      return NextResponse.json(
        { success: false, message: "API key is not active" },
        { status: 400 }
      );
    }

    // Decrypt the key
    let decryptedKey: string;
    try {
      decryptedKey = decryptApiKey(apiKey.keyValue);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Failed to decrypt API key" },
        { status: 500 }
      );
    }

    // Test based on provider
    let testResult: { success: boolean; message: string };

    switch (apiKey.provider.toLowerCase()) {
      case "openai": {
        try {
          const openai = new OpenAI({ apiKey: decryptedKey });
          // Make a simple API call to test the key
          const models = await openai.models.list();
          testResult = {
            success: true,
            message: `Key is valid. Found ${models.data.length} models available.`,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          testResult = {
            success: false,
            message: `OpenAI API error: ${errorMessage}`,
          };
        }
        break;
      }

      default:
        testResult = {
          success: false,
          message: `Provider '${apiKey.provider}' is not supported for testing`,
        };
    }

    // Update lastUsedAt if test was successful
    if (testResult.success) {
      await prisma.apiKey.update({
        where: { id },
        data: { lastUsedAt: new Date() },
      });
    }

    return NextResponse.json(testResult);
  } catch (error) {
    console.error("[Admin API Keys] Test error:", error);
    return internalServerError("Failed to test API key");
  }
}

