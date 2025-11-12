import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile-form";
import { SignOutButton } from "@/components/sign-out-button";
import { NewEntryForm } from "@/components/new-entry-form";
import { AudioRecorder } from "@/components/audio-recorder";
import { JournalEntriesList } from "@/components/journal-entries-list";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/login");
  }

  try {

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

    if (!profile) {
      try {
        profile = await prisma.profile.create({
          data: {
            userId: session.user.id,
          },
        });
      } catch (error) {
        console.error("Error creating profile:", error);
        // Try to fetch again in case it was created concurrently
        profile = await prisma.profile.findUnique({
          where: { userId: session.user.id },
        });
      }
    }

    // Fetch initial journal entries
    const fetchedEntries = await prisma.journalEntry.findMany({
      where: { userId: session.user.id },
      take: 21,
      orderBy: { createdAt: "desc" },
        include: {
          audio: {
            select: {
              id: true,
              duration: true,
              mime: true,
            },
          },
        },
    });

    const hasMore = fetchedEntries.length > 20;
    const initialEntries = hasMore ? fetchedEntries.slice(0, 20) : fetchedEntries;
    const nextCursor = hasMore ? initialEntries[initialEntries.length - 1]?.id ?? null : null;

    const greeting = user?.name
      ? `Welcome, ${user.name}!`
      : `Welcome, ${user?.email ?? "friend"}!`;

    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col gap-6 px-4 py-16">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">{greeting}</h1>
          <SignOutButton />
        </div>

        <ProfileForm initialProfile={profile} userName={user?.name ?? null} />

        <div className="grid gap-6 md:grid-cols-2">
          <NewEntryForm />
          <AudioRecorder />
        </div>

        <JournalEntriesList initialEntries={initialEntries} initialNextCursor={nextCursor} />
      </div>
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col gap-6 px-4 py-16">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <h2 className="text-lg font-semibold text-destructive">Error loading dashboard</h2>
          <p className="text-sm text-muted-foreground">
            An error occurred while loading the dashboard. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }
}
