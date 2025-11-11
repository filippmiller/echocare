import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile-form";
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

  // Fetch or create profile
  let profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });

  profile ??= await prisma.profile.create({
    data: {
      userId: session.user.id,
    },
  });

  const greeting = user?.name
    ? `Welcome, ${user.name}!`
    : `Welcome, ${user?.email ?? "friend"}!`;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col gap-6 px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">{greeting}</h1>
        <SignOutButton />
      </div>
      <ProfileForm initialProfile={profile} />
    </div>
  );
}
