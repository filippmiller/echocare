import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Auth | ClearMind",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold">
            ClearMind
          </Link>
          <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Back to login
          </Link>
        </div>
      </div>
      <main className="flex-1">{children}</main>
    </div>
  );
}
