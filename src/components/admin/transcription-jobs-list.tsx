"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, XCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TranscriptionJob {
  id: string;
  entryId: string;
  status: string;
  provider: string;
  attempts: number;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  entry: {
    id: string;
    userId: string;
    type: string;
    title: string | null;
    createdAt: Date;
    user: {
      email: string | null;
      name: string | null;
    };
  };
}

interface TranscriptionJobsListProps {
  initialJobs: TranscriptionJob[];
}

export function TranscriptionJobsList({ initialJobs }: TranscriptionJobsListProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/transcriptions");
      if (!response.ok) return;

      const data = (await response.json()) as { jobs: TranscriptionJob[] };
      setJobs(data.jobs);
    } catch (err) {
      console.error("Refresh error", err);
      toast.error("Failed to refresh jobs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      const response = await fetch(`/api/admin/transcriptions/${jobId}/retry`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to retry job");
      }

      toast.success("Job queued for retry");
      await refresh();
    } catch (err) {
      toast.error("Failed to retry job");
    }
  };

  const handleCancel = async (jobId: string) => {
    try {
      const response = await fetch(`/api/admin/transcriptions/${jobId}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to cancel job");
      }

      toast.success("Job cancelled");
      await refresh();
    } catch (err) {
      toast.error("Failed to cancel job");
    }
  };

  const filteredJobs = statusFilter ? jobs.filter((j) => j.status === statusFilter) : jobs;

  const statusConfig = {
    PENDING: { label: "Pending", icon: Clock, variant: "secondary" as const, color: "text-yellow-600" },
    RUNNING: { label: "Running", icon: Loader2, variant: "default" as const, color: "text-blue-600" },
    DONE: { label: "Done", icon: CheckCircle2, variant: "default" as const, color: "text-green-600" },
    ERROR: { label: "Error", icon: XCircle, variant: "destructive" as const, color: "text-red-600" },
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Jobs</CardTitle>
          <div className="flex items-center gap-2">
            {/* Status filter */}
            <select
              value={statusFilter || ""}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="RUNNING">Running</option>
              <option value="DONE">Done</option>
              <option value="ERROR">Error</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs found</p>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => {
              const config = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.PENDING;
              const Icon = config.icon;

              return (
                <div key={job.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={config.variant} className="gap-1">
                          {job.status === "RUNNING" ? (
                            <Icon className="h-3 w-3 animate-spin" />
                          ) : (
                            <Icon className="h-3 w-3" />
                          )}
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Provider: {job.provider}
                        </span>
                        {job.attempts > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Attempts: {job.attempts}
                          </span>
                        )}
                      </div>

                      <div className="text-sm space-y-1">
                        <div>
                          <span className="font-medium">Entry:</span> {job.entry.title || job.entry.id}
                        </div>
                        <div>
                          <span className="font-medium">User:</span>{" "}
                          {job.entry.user.name || job.entry.user.email || job.entry.userId}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span>{" "}
                          {new Date(job.createdAt).toLocaleString()}
                        </div>
                        {job.startedAt && (
                          <div>
                            <span className="font-medium">Started:</span>{" "}
                            {new Date(job.startedAt).toLocaleString()}
                          </div>
                        )}
                        {job.finishedAt && (
                          <div>
                            <span className="font-medium">Finished:</span>{" "}
                            {new Date(job.finishedAt).toLocaleString()}
                          </div>
                        )}
                        {job.error && (
                          <div className="text-red-600">
                            <span className="font-medium">Error:</span> {job.error}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {job.status === "ERROR" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleRetry(job.id)}
                        >
                          Retry
                        </Button>
                      )}
                      {(job.status === "PENDING" || job.status === "RUNNING") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleCancel(job.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

