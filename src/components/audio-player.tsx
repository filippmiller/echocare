"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
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
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrl) {
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
      setAudioUrl(data.url);
      return data.url;
    } catch (err) {
      console.error("Error loading audio:", err);
      setError(err instanceof Error ? err.message : "Failed to load audio");
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

    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.addEventListener("ended", () => {
        setIsPlaying(false);
      });
      audioRef.current.addEventListener("error", (e) => {
        console.error("Audio playback error:", e);
        setError("Failed to play audio");
        setIsPlaying(false);
      });
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("Error playing audio:", err);
      setError("Failed to play audio");
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

