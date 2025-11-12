"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Play, Pause, Loader2 } from "lucide-react";

interface AudioPlayerProps {
  audioId: string;
  duration?: number | null;
}

export function AudioPlayer({ audioId, duration }: AudioPlayerProps) {
  const t = useTranslations("journal");
  const tErrors = useTranslations("errors");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
        audioRef.current = null;
      }
      if (audioUrl && audioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const loadAudio = async () => {
    if (audioUrl) return audioUrl;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/journal/audio/${audioId}`);
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to load audio");
      }

      const data = (await response.json()) as { url: string; mimeType: string };
      
      if (!data.url) {
        throw new Error("No URL returned from server");
      }

      // Validate URL
      try {
        new URL(data.url);
      } catch {
        throw new Error("Invalid URL returned from server");
      }

      setAudioUrl(data.url);
      return data.url;
    } catch (err) {
      console.error("Error loading audio:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load audio";
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    // Play
    let url = audioUrl;
    if (!url) {
      url = await loadAudio();
      if (!url) return;
    }

    if (!audioRef.current || audioRef.current.src !== url) {
      // Clean up old audio if exists
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      
      // Create new audio instance with fresh URL
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
      });
      audio.addEventListener("error", (e) => {
        console.error("Audio playback error:", e);
        const errorMsg = audio.error 
          ? `Audio error: ${audio.error.code} - ${audio.error.message}`
          : "Failed to play audio";
        setError(errorMsg);
        toast.error(errorMsg);
        setIsPlaying(false);
      });
    }

    // Ensure audioRef.current is still valid
    if (!audioRef.current) {
      const errorMsg = "Audio element not available";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      // Ensure audio is ready
      if (audioRef.current.readyState < 2) {
        await new Promise<void>((resolve, reject) => {
          const audio = audioRef.current;
          if (!audio) {
            reject(new Error("Audio element not available"));
            return;
          }
          audio.addEventListener("canplay", () => resolve(), { once: true });
          audio.addEventListener("error", (e) => reject(e), { once: true });
          audio.load();
        });
      }
      
      // Double-check audioRef.current is still valid after async operations
      if (!audioRef.current) {
        const errorMsg = "Audio element was removed";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      
      await audioRef.current.play();
      setIsPlaying(true);
      setError(null);
    } catch (err) {
      console.error("Error playing audio:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to play audio";
      setError(errorMsg);
      toast.error(errorMsg);
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => void togglePlayback()}
        disabled={isLoading}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        <span>{isPlaying ? t("pause") : t("play")}</span>
      </Button>
      {duration && (
        <span className="text-xs text-muted-foreground">
          {Math.round(duration)}s
        </span>
      )}
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}

