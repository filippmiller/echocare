import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { badRequest, unauthorized, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";
import { createEntrySchema } from "@/lib/validations/journal";

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return unauthorized();
    }

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = createEntrySchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid input", parsed.error.issues);
    }

    const data = parsed.data;

    const entry = await prisma.journalEntry.create({
      data: {
        userId: session.user.id,
        type: "TEXT",
        title: data.title && data.title.trim() !== "" ? data.title.trim() : null,
        text: data.text.trim(),
        mood: data.mood && data.mood.trim() !== "" ? data.mood.trim() : null,
        energy: data.energy ?? null,
        tags: data.tags ?? [],
      },
      include: {
        audio: true,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Create journal entry error", error);
    return internalServerError("Failed to create journal entry");
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") ?? "20", 10);
    const cursor = searchParams.get("cursor") ?? undefined;

    // For cursor-based pagination with string IDs, we need to find entries created before the cursor entry
    let where: { userId: string; createdAt?: { lt: Date } } = {
      userId: session.user.id,
    };

    if (cursor) {
      // Find the cursor entry to get its createdAt timestamp
      const cursorEntry = await prisma.journalEntry.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });

      if (cursorEntry) {
        where.createdAt = { lt: cursorEntry.createdAt };
      }
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: "desc" },
      include: {
        audio: {
          select: {
            id: true,
            duration: true,
            mime: true,
            path: true,
          },
        },
      },
    });

    const hasMore = entries.length > limit;
    const data = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return NextResponse.json({
      entries: data,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Get journal entries error", error);
    return internalServerError("Failed to get journal entries");
  }
}

