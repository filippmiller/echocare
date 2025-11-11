import type { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { hash } from "bcrypt";

import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password, name, phone } = parsed.data;
    const normalizedEmail = email ? normalizeEmail(email) : null;
    const normalizedPhone = phone ? phone.trim() : null;

    if (!normalizedEmail && !normalizedPhone) {
      return NextResponse.json(
        { error: "Either email or phone number is required" },
        { status: 400 }
      );
    }

    // Check if user exists by email or phone
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email or phone number already in use" },
        { status: 409 }
      );
    }

    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    const role: Role = normalizedEmail && adminEmails.includes(normalizedEmail) ? "ADMIN" : "USER";

    const passwordHash = await hash(password, 12);

    const normalizedName = name.trim() === "" ? null : name.trim();

    await prisma.user.create({
      data: {
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash,
        name: normalizedName,
        role,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Register error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
