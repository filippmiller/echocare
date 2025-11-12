import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, badRequest, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/journal/search
 * Search journal entries with filters (text search, tags, date range)
 * 
 * Query params:
 * - q: search query (full-text search)
 * - tags: comma-separated tags (e.g., "work,personal")
 * - from: start date (YYYY-MM-DD)
 * - to: end date (YYYY-MM-DD)
 * - limit: number of results (default: 20, max: 100)
 * - cursor: pagination cursor (entry ID)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || undefined;
    const tagsParam = searchParams.get("tags");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const limitParam = searchParams.get("limit");
    const cursor = searchParams.get("cursor");

    // Parse tags
    const tags = tagsParam
      ? tagsParam
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;

    // Parse dates
    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (fromParam) {
      fromDate = new Date(fromParam);
      if (isNaN(fromDate.getTime())) {
        return badRequest("Invalid 'from' date format. Use YYYY-MM-DD");
      }
      fromDate.setHours(0, 0, 0, 0);
    }

    if (toParam) {
      toDate = new Date(toParam);
      if (isNaN(toDate.getTime())) {
        return badRequest("Invalid 'to' date format. Use YYYY-MM-DD");
      }
      toDate.setHours(23, 59, 59, 999);
    }

    // Parse limit
    const limit = Math.min(
      parseInt(limitParam || "20", 10),
      100 // Max 100 results
    );

    // Build where clause
    const where: any = {
      userId: session.user.id,
    };

    // Text search (full-text search using PostgreSQL)
    if (q) {
      // Use PostgreSQL full-text search
      // Note: We'll use a simple LIKE search for now, can be enhanced with tsvector later
      where.OR = [
        { text: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
      ];
    }

    // Tags filter (array overlap)
    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags,
      };
    }

    // Date range filter
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = fromDate;
      }
      if (toDate) {
        where.createdAt.lte = toDate;
      }
    }

    // Cursor-based pagination
    if (cursor) {
      where.id = {
        lt: cursor, // Get entries created before this ID (assuming descending order)
      };
    }

    // Fetch entries
    const entries = await prisma.journalEntry.findMany({
      where,
      take: limit + 1, // Fetch one extra to check if there are more
      orderBy: { createdAt: "desc" },
      include: {
        audio: {
          select: {
            id: true,
            duration: true,
            mime: true,
          },
        },
      },
    });

    const hasMore = entries.length > limit;
    const results = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore ? results[results.length - 1]?.id ?? null : null;

    return NextResponse.json({
      entries: results,
      nextCursor,
      hasMore,
      total: results.length,
    });
  } catch (error) {
    console.error("[Search API] Error:", error);
    return internalServerError("Failed to search entries");
  }
}

