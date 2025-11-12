import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function AdminPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Admin Area</h1>
      <p className="text-muted-foreground">You have administrator access.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/transcriptions">
          <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
            <span className="text-lg font-semibold">Transcription Jobs</span>
            <span className="text-sm text-muted-foreground">View and manage transcription jobs</span>
          </Button>
        </Link>
        <Link href="/admin/api-keys">
          <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
            <span className="text-lg font-semibold">API Keys</span>
            <span className="text-sm text-muted-foreground">Manage OpenAI and other API keys</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
