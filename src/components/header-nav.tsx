import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";

export async function HeaderNav() {
  const session = await getServerSession(authOptions);
  const role = session?.user.role ?? "USER";

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold">
          ClearMind
        </Link>
        <nav className="flex items-center gap-3">
          {session ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium hover:underline">
                Dashboard
              </Link>
              {role === "ADMIN" ? (
                <Link href="/admin" className="text-sm font-medium hover:underline">
                  Admin
                </Link>
              ) : null}
              <Suspense fallback={<div className="text-sm">...</div>}>
                <SignOutButton />
              </Suspense>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/register">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
