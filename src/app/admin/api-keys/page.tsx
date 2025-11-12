import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { ApiKeysList } from "@/components/admin/api-keys-list";

export const dynamic = "force-dynamic";

export default async function AdminApiKeysPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col gap-6 px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">API Keys Management</h1>
      </div>

      <ApiKeysList />
    </div>
  );
}

