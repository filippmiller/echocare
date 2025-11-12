import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, badRequest, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const localeSchema = z.object({
  locale: z.enum(["en", "ru"]),
});

export async function PUT(request: Request) {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return unauthorized();
    }

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = localeSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid locale. Must be 'en' or 'ru'", parsed.error.issues);
    }

    const { locale } = parsed.data;

    // Update or create profile with locale
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    let profile;
    if (existingProfile) {
      profile = await prisma.profile.update({
        where: { userId: session.user.id },
        data: { locale },
      });
    } else {
      profile = await prisma.profile.create({
        data: {
          userId: session.user.id,
          locale,
        },
      });
    }

    return NextResponse.json({ locale: profile.locale });
  } catch (error) {
    console.error("Update locale error", error);
    return internalServerError("Failed to update locale");
  }
}

