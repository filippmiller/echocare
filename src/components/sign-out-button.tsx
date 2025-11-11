"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

interface SignOutButtonProps {
  variant?: "default" | "outline" | "ghost";
}

export function SignOutButton({ variant = "outline" }: SignOutButtonProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  };

  return (
    <Button type="button" variant={variant} onClick={() => void handleSignOut()}>
      Sign out
    </Button>
  );
}
