"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { Bell } from "lucide-react";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  session: Session | null;
  userName?: string | null;
  userEmail?: string | null;
  avatarUrl?: string | null;
}

export function Header({ session, userName, userEmail, avatarUrl }: HeaderProps) {
  const pathname = usePathname();
  
  // Ensure session is valid and has user data
  const isAuthenticated = session && session.user && session.user.id;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">ClearMind</span>
          </Link>

          {/* Navigation - only show when logged in */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === "/dashboard" ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                Dashboard
              </Link>
              {session.user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname === "/admin" ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Admin
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {isAuthenticated ? (
            <>
              {/* Notifications - placeholder */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
              </Button>

              {/* User Menu with Avatar */}
              <UserMenu userName={userName} userEmail={userEmail} avatarUrl={avatarUrl} />
            </>
          ) : (
            <>
              {/* Guest: Sign in / Sign up */}
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

