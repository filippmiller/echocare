import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/services/categories
 * Public API - returns all service categories
 */
export async function GET() {
  try {
    const categories = await prisma.serviceCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        code: true,
        nameRu: true,
        nameEn: true,
        icon: true,
        sortOrder: true,
      },
    });

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error("Get categories error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to get categories: ${errorMessage}` },
      { status: 500 }
    );
  }
}

