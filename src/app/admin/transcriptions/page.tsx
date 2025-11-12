import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TranscriptionJobsList } from "@/components/admin/transcription-jobs-list";

export const dynamic = "force-dynamic";

export default async function AdminTranscriptionsPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch recent transcription jobs (last 100)
  const jobs = await prisma.transcriptionJob.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      entry: {
        select: {
          id: true,
          userId: true,
          type: true,
          title: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Get statistics
  const stats = await prisma.transcriptionJob.groupBy({
    by: ["status"],
    _count: {
      id: true,
    },
  });

  const totalJobs = await prisma.transcriptionJob.count();
  const doneJobs = stats.find((s) => s.status === "DONE")?._count.id ?? 0;
  const errorJobs = stats.find((s) => s.status === "ERROR")?._count.id ?? 0;
  const pendingJobs = stats.find((s) => s.status === "PENDING")?._count.id ?? 0;
  const runningJobs = stats.find((s) => s.status === "RUNNING")?._count.id ?? 0;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col gap-6 px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Transcription Jobs</h1>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold">{totalJobs}</div>
          <div className="text-sm text-muted-foreground">Total Jobs</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold text-green-600">{doneJobs}</div>
          <div className="text-sm text-muted-foreground">Done</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold text-yellow-600">{pendingJobs}</div>
          <div className="text-sm text-muted-foreground">Pending</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-600">{runningJobs}</div>
          <div className="text-sm text-muted-foreground">Running</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold text-red-600">{errorJobs}</div>
          <div className="text-sm text-muted-foreground">Errors</div>
        </div>
      </div>

      {/* Jobs List */}
      <TranscriptionJobsList initialJobs={jobs} />
    </div>
  );
}

