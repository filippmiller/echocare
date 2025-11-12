"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AudioRecorder() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
        await uploadAudio(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error("Error starting recording", err);
      const errorMsg = "Failed to start recording. Please check microphone permissions.";
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadAudio = async (blob: Blob) => {
    setIsUploading(true);
    setError(null);

    try {
      console.log("[AudioRecorder] Starting upload, blob size:", blob.size, "type:", blob.type);
      
      const formData = new FormData();
      formData.append("file", blob, `recording-${Date.now()}.webm`);

      console.log("[AudioRecorder] Sending request to /api/journal/upload");
      
      const response = await fetch("/api/journal/upload", {
        method: "POST",
        body: formData,
      });

      console.log("[AudioRecorder] Response status:", response.status, response.statusText);

      if (!response.ok) {
        let errorMsg = "Failed to upload audio";
        try {
          const data = (await response.json()) as { error?: string } | null;
          errorMsg = data?.error ?? `Server error: ${response.status} ${response.statusText}`;
          console.error("[AudioRecorder] Server error response:", data);
        } catch (parseError) {
          console.error("[AudioRecorder] Failed to parse error response:", parseError);
          errorMsg = `Server error: ${response.status} ${response.statusText}`;
        }
        setError(errorMsg);
        setSuccess(false);
        toast.error(errorMsg);
        return;
      }

      const result = await response.json();
      console.log("[AudioRecorder] Upload successful:", result);

      setSuccess(true);
      setError(null);
      toast.success("Audio uploaded successfully");
      
      // Refresh the page to show new entry
      router.refresh();
      
      // Also trigger a custom event for the entries list to refresh
      window.dispatchEvent(new CustomEvent("journalEntryCreated"));
    } catch (err) {
      console.error("[AudioRecorder] Upload error:", err);
      const errorMsg = err instanceof Error 
        ? `Upload failed: ${err.message}` 
        : "An unexpected error occurred";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Audio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          {!isRecording ? (
            <Button onClick={() => void startRecording()} disabled={isUploading}>
              Record
            </Button>
          ) : (
            <Button onClick={stopRecording} variant="destructive">
              Stop
            </Button>
          )}
          {isRecording && <span className="text-sm text-muted-foreground">Recording...</span>}
          {isUploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">Audio uploaded successfully!</p>}
      </CardContent>
    </Card>
  );
}

