import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { Header } from "@/components/layout/Header";
import { Providers } from "@/app/providers";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvatarUrl } from "@/lib/avatarUtils";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClearMind",
  description: "Secure dashboard with role-based access",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerAuthSession();
  const messages = await getMessages();

  // Get user profile data for header (if logged in)
  let userName: string | null = null;
  let userEmail: string | null = null;
  let avatarUrl: string | null = null;

  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
      },
    });

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        avatarUrl: true,
      },
    });

    userName = user?.name ?? null;
    userEmail = user?.email ?? null;
    // Get avatar URL from path (if stored as path) or use direct URL
    avatarUrl = profile?.avatarUrl ? await getAvatarUrl(profile.avatarUrl) : null;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers session={session}>
            <div className="flex min-h-screen flex-col">
              <Header session={session} userName={userName} userEmail={userEmail} avatarUrl={avatarUrl} />
              <main className="flex-1">{children}</main>
            </div>
            <Toaster position="top-right" richColors />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
