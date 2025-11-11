import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
    },
  });

  const greeting = user?.name
    ? `Welcome, ${user.name}!`
    : `Welcome, ${user?.email ?? "friend"}!`;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{greeting}</h1>
      <p className="text-muted-foreground">
        This is your dashboard. We&apos;ll add more content soon.
      </p>
      <div>
        <SignOutButton />
      </div>
    </div>
  );
}
