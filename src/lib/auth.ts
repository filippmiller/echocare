import type { Role } from "@prisma/client";
import { compare } from "bcrypt";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .transform((value) => value.toLowerCase())
    .pipe(z.email("Enter a valid email address")),
  password: z.string().min(1),
});

const isAppUser = (value: unknown): value is {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
} => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    id?: unknown;
    email?: unknown;
    name?: unknown;
    role?: unknown;
  };

  return (
    typeof candidate.id === "string" &&
    typeof candidate.email === "string" &&
    (candidate.role === "ADMIN" || candidate.role === "USER")
  );
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const parsed = credentialsSchema.safeParse(credentials);
          if (!parsed.success) {
            console.error("Auth: Invalid credentials format", parsed.error);
            return null;
          }

          const { email, password } = parsed.data;
          const normalizedEmail = email.toLowerCase();

          const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          });

          if (!user) {
            console.error("Auth: User not found", normalizedEmail);
            return null;
          }

          const isValid = await compare(password, user.passwordHash);
          if (!isValid) {
            console.error("Auth: Invalid password for user", normalizedEmail);
            return null;
          }

          console.log("Auth: User authenticated successfully", user.id);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          } as const;
        } catch (error) {
          console.error("Auth: Error in authorize", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      try {
        if (isAppUser(user)) {
          token.id = user.id;
          token.role = user.role;
          token.email = user.email;
          token.name = user.name ?? undefined;
        } else if (typeof token.email === "string" && !token.role) {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
          });

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.name = dbUser.name ?? undefined;
          }
        }

        return token;
      } catch (error) {
        console.error("Auth: Error in jwt callback", error);
        return token;
      }
    },
    session({ session, token }) {
      try {
        session.user.id = typeof token.id === "string" ? token.id : "";
        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
        session.user.role = token.role ?? "USER";
        if (typeof token.name === "string") {
          session.user.name = token.name;
        }

        return session;
      } catch (error) {
        console.error("Auth: Error in session callback", error);
        return session;
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

if (!process.env.NEXTAUTH_SECRET) {
  console.error("❌ NEXTAUTH_SECRET is not set. Authentication will not work!");
  throw new Error("NEXTAUTH_SECRET environment variable is required");
}

if (!process.env.NEXTAUTH_URL) {
  console.warn("⚠️ NEXTAUTH_URL is not set. Using default URL.");
}

export const getServerAuthSession = () => getServerSession(authOptions);
