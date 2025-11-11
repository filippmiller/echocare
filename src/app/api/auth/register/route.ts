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

    const { email, password, name } = parsed.data;
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    const role: Role = adminEmails.includes(normalizedEmail) ? "ADMIN" : "USER";

    const passwordHash = await hash(password, 12);

    const normalizedName = name.trim() === "" ? null : name.trim();

    await prisma.user.create({
      data: {
        email: normalizedEmail,
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
