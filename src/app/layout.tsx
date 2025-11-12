import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { HeaderNav } from "@/components/header-nav";
import { Providers } from "@/app/providers";
import { getServerAuthSession } from "@/lib/auth";

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

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers session={session}>
            <div className="flex min-h-screen flex-col">
              <HeaderNav session={session} />
              <main className="flex-1">{children}</main>
            </div>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
