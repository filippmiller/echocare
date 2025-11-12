"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AudioRecorder() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setError("Failed to start recording. Please check microphone permissions.");
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
      const formData = new FormData();
      formData.append("file", blob, `recording-${Date.now()}.webm`);

      const response = await fetch("/api/journal/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Failed to upload audio");
        return;
      }

      router.refresh();
    } catch (err) {
      console.error("Upload error", err);
      setError("An unexpected error occurred");
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
      </CardContent>
    </Card>
  );
}

