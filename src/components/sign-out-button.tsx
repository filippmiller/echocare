"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

interface SignOutButtonProps {
  variant?: "default" | "outline" | "ghost";
}

export function SignOutButton({ variant = "outline" }: SignOutButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      onClick={() => void signOut({ callbackUrl: "/auth/login" })}
    >
      Sign out
    </Button>
  );
}
