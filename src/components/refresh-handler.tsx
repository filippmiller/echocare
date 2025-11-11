"use client";

import { useRouter } from "next/navigation";

export function RefreshHandler({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter();
  onSuccess = () => router.refresh();
  return null;
}

