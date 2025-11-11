import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth";

export default async function AdminPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Admin Area</h1>
      <p className="text-muted-foreground">You have administrator access.</p>
    </div>
  );
}
