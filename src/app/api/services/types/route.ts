import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/services/types
 * Public API - returns service types
 * Query params:
 *   - categoryId (optional): filter by category
 *   - q (optional): text search in nameRu/nameEn
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const q = searchParams.get("q");

    const where: {
      categoryId?: string;
      isActive?: boolean;
      OR?: Array<{ nameRu: { contains: string } } | { nameEn: { contains: string } }>;
    } = {
      isActive: true,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (q && q.trim().length > 0) {
      const searchTerm = q.trim();
      where.OR = [
        { nameRu: { contains: searchTerm } },
        { nameEn: { contains: searchTerm } },
      ];
    }

    const serviceTypes = await prisma.serviceType.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            code: true,
            nameRu: true,
            nameEn: true,
            icon: true,
          },
        },
      },
      orderBy: [
        { category: { sortOrder: "asc" } },
        { nameRu: "asc" },
      ],
      select: {
        id: true,
        categoryId: true,
        code: true,
        nameRu: true,
        nameEn: true,
        defaultDurationMinutes: true,
        pricingUnit: true,
        category: {
          select: {
            id: true,
            code: true,
            nameRu: true,
            nameEn: true,
            icon: true,
          },
        },
      },
    });

    return NextResponse.json({ serviceTypes }, { status: 200 });
  } catch (error) {
    console.error("Get service types error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to get service types: ${errorMessage}` },
      { status: 500 }
    );
  }
}

