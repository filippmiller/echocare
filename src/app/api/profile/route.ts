import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { badRequest, unauthorized, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validations/profile";

export async function GET() {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return unauthorized();
    }

    let profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    // Create empty profile if it doesn't exist
    profile ??= await prisma.profile.create({
      data: {
        userId: session.user.id,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Get profile error", error);
    return internalServerError("Failed to get profile");
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return unauthorized();
    }

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid input", parsed.error.issues);
    }

    const data = parsed.data;

    // Normalize empty strings to null and parse birthDate
    const updateData = {
      fullName: data.fullName && data.fullName.trim() !== "" ? data.fullName.trim() : null,
      birthDate: data.birthDate && data.birthDate.trim() !== "" ? new Date(data.birthDate) : null,
      city: data.city && data.city.trim() !== "" ? data.city.trim() : null,
      phone: data.phone && data.phone.trim() !== "" ? data.phone.trim() : null,
      locale: data.locale && data.locale.trim() !== "" ? data.locale.trim() : null,
      timezone: data.timezone && data.timezone.trim() !== "" ? data.timezone.trim() : null,
      gender: data.gender ?? "UNKNOWN",
    };

    // Ensure profile exists
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    let profile;
    if (existingProfile) {
      profile = await prisma.profile.update({
        where: { userId: session.user.id },
        data: updateData,
      });
    } else {
      profile = await prisma.profile.create({
        data: {
          userId: session.user.id,
          ...updateData,
        },
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Update profile error", error);
    return internalServerError("Failed to update profile");
  }
}

