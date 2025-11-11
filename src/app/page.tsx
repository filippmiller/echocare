import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";

import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerAuthSession();

  // Redirect authenticated users to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl">
          Welcome to ClearMind
        </h1>
        <p className="mb-8 text-xl text-muted-foreground sm:text-2xl">
          Your secure platform for managing your digital life with ease and confidence.
        </p>
        <p className="mb-12 text-lg text-muted-foreground">
          Get started by creating an account or signing in to access your dashboard.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/register">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
