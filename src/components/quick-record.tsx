"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Mic, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RecordingState = "idle" | "recording" | "uploading" | "transcribing" | "ready";

export function QuickRecord() {
  const router = useRouter();
  const t = useTranslations("voice");
  const [state, setState] = useState<RecordingState>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pressStartTimeRef = useRef<number | null>(null);
  const isPressingRef = useRef(false);

  // Timer for recording duration
  useEffect(() => {
    if (state === "recording") {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (state === "idle") {
        setRecordingTime(0);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await uploadAndTranscribe(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setState("recording");
      setError(null);
    } catch (err) {
      console.error("Error starting recording", err);
      const errorMsg = t("quickRecord.error") || "Failed to start recording. Please check microphone permissions.";
      setError(errorMsg);
      toast.error(errorMsg);
      setState("idle");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.stop();
      setState("uploading");
    }
  };

  const uploadAndTranscribe = async (blob: Blob) => {
    setState("uploading");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", blob, `recording-${Date.now()}.webm`);

      const response = await fetch("/api/journal/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to upload audio");
      }

      const result = (await response.json()) as {
        id: string;
        transcriptionJobId?: string;
      };

      setState("transcribing");

      // Poll for transcription status
      if (result.transcriptionJobId) {
        await pollTranscriptionStatus(result.transcriptionJobId);
      } else {
        // If no job ID, try to create one
        const transcribeResponse = await fetch(`/api/journal/transcribe/${result.id}`, {
          method: "POST",
        });

        if (transcribeResponse.ok) {
          const transcribeData = (await transcribeResponse.json()) as { jobId: string };
          await pollTranscriptionStatus(transcribeData.jobId);
        } else {
          setState("ready");
          toast.success(t("quickRecord.uploaded") || "Audio uploaded successfully");
        }
      }

      // Refresh page to show new entry
      router.refresh();
      window.dispatchEvent(new CustomEvent("journalEntryCreated"));

      setTimeout(() => {
        setState("idle");
      }, 2000);
    } catch (err) {
      console.error("Upload error", err);
      const errorMsg = err instanceof Error ? err.message : t("quickRecord.uploadError") || "Failed to upload audio";
      setError(errorMsg);
      toast.error(errorMsg);
      setState("idle");
    }
  };

  const pollTranscriptionStatus = async (jobId: string) => {
    const maxAttempts = 60; // Poll for up to 60 seconds
    let attempts = 0;

    const poll = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/journal/transcribe/status/${jobId}`);
        if (!response.ok) {
          throw new Error("Failed to get transcription status");
        }

        const data = (await response.json()) as {
          status: string;
          entry?: { text?: string; summary?: string };
        };

        if (data.status === "DONE") {
          setState("ready");
          toast.success(t("quickRecord.transcribed") || "Transcription completed!");
          return;
        }

        if (data.status === "ERROR") {
          setState("ready");
          toast.warning(t("quickRecord.transcriptionError") || "Transcription failed, but audio was saved");
          return;
        }

        // Continue polling if still processing
        attempts++;
        if (attempts < maxAttempts && (data.status === "PENDING" || data.status === "RUNNING")) {
          setTimeout(poll, 1000); // Poll every second
        } else {
          setState("ready");
          toast.info(t("quickRecord.processing") || "Transcription is processing...");
        }
      } catch (err) {
        console.error("Polling error", err);
        setState("ready");
      }
    };

    await poll();
  };

  const handleMouseDown = () => {
    if (state === "idle") {
      isPressingRef.current = true;
      pressStartTimeRef.current = Date.now();
      void startRecording();
    }
  };

  const handleMouseUp = () => {
    if (isPressingRef.current && state === "recording") {
      isPressingRef.current = false;
      stopRecording();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseDown();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseUp();
  };

  // Fallback: tap-to-start/stop for iOS
  const handleClick = () => {
    if (state === "idle") {
      void startRecording();
    } else if (state === "recording") {
      stopRecording();
    }
  };

  const handleCancel = () => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      setState("idle");
      setRecordingTime(0);
      chunksRef.current = [];
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col items-end gap-2">
        {/* Status indicator */}
        {state !== "idle" && (
          <div
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium shadow-lg",
              state === "recording" && "bg-destructive text-destructive-foreground",
              state === "uploading" && "bg-blue-500 text-white",
              state === "transcribing" && "bg-yellow-500 text-white",
              state === "ready" && "bg-green-500 text-white"
            )}
          >
            {state === "recording" && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                {t("quickRecord.recording") || "Recording"} {formatTime(recordingTime)}
              </div>
            )}
            {state === "uploading" && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("quickRecord.uploading") || "Uploading..."}
              </div>
            )}
            {state === "transcribing" && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("quickRecord.transcribing") || "Transcribing..."}
              </div>
            )}
            {state === "ready" && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t("quickRecord.ready") || "Ready!"}
              </div>
            )}
          </div>
        )}

        {/* Main FAB button */}
        <Button
          size="lg"
          className={cn(
            "h-16 w-16 rounded-full shadow-lg transition-all",
            state === "recording" && "bg-destructive hover:bg-destructive/90 scale-110",
            state === "idle" && "bg-primary hover:bg-primary/90"
          )}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp} // Stop if mouse leaves button
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={handleClick} // Fallback for iOS
          disabled={state === "uploading" || state === "transcribing"}
        >
          {state === "idle" && <Mic className="h-6 w-6" />}
          {state === "recording" && <Mic className="h-6 w-6 animate-pulse" />}
          {(state === "uploading" || state === "transcribing") && (
            <Loader2 className="h-6 w-6 animate-spin" />
          )}
          {state === "ready" && <CheckCircle2 className="h-6 w-6" />}
        </Button>

        {/* Cancel button (shown during recording) */}
        {state === "recording" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="rounded-full"
          >
            <XCircle className="h-4 w-4 mr-1" />
            {t("quickRecord.cancel") || "Cancel"}
          </Button>
        )}

        {/* Error message */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive max-w-xs">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

