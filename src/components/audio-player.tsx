"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Play, Pause, Loader2 } from "lucide-react";

interface AudioPlayerProps {
  audioId: string;
  duration?: number | null;
}

type AudioStatus = "idle" | "loading" | "ready" | "error";

export function AudioPlayer({ audioId, duration }: AudioPlayerProps) {
  const t = useTranslations("journal");
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create audio element once and reuse it
  useEffect(() => {
    audioRef.current = new Audio();
    const a = audioRef.current;

    const onLoadStart = () => {
      // Подстраховка, чтобы видеть реальный src
      console.debug("[AudioPlayer] loadstart src=", a.src);
    };

    const onError = () => {
      console.error("[AudioPlayer] Audio error:", a.error);
      setStatus("error");
      setIsPlaying(false);
      
      let errorMsg = "Failed to play audio";
      if (a.error) {
        const errorCode = a.error.code;
        switch (errorCode) {
          case 1: // MEDIA_ERR_ABORTED
            errorMsg = "Audio playback was aborted";
            break;
          case 2: // MEDIA_ERR_NETWORK
            errorMsg = "Network error while loading audio. Please check your connection.";
            break;
          case 3: // MEDIA_ERR_DECODE
            errorMsg = "Audio format not supported or file corrupted";
            break;
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            errorMsg = "Audio format not supported by browser";
            break;
          default:
            errorMsg = `Audio error (${errorCode}): ${a.error.message}`;
        }
      }
      toast.error(errorMsg);
    };

    const onCanPlay = () => {
      setStatus("ready");
    };

    const onEnded = () => {
      setIsPlaying(false);
    };

    a.addEventListener("loadstart", onLoadStart);
    a.addEventListener("error", onError);
    a.addEventListener("canplay", onCanPlay);
    a.addEventListener("ended", onEnded);

    return () => {
      a.pause();
      a.removeEventListener("loadstart", onLoadStart);
      a.removeEventListener("error", onError);
      a.removeEventListener("canplay", onCanPlay);
      a.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, []);

  const loadAndPlay = useCallback(async () => {
    if (!audioRef.current) return;

    setStatus("loading");

    try {
      const res = await fetch(`/api/journal/audio/${audioId}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to load audio");
      }

      const { url } = (await res.json()) as { url: string; mimeType?: string };

      if (!url) {
        throw new Error("No URL returned from server");
      }

      // ВАЖНО: не вызываем .load() дважды — просто меняем src и play()
      const a = audioRef.current;
      if (!a) return;

      // Stop current playback
      a.pause();
      
      // Set new src only if different
      if (a.src !== url) {
        a.src = url;
      }

      try {
        await a.play();
        setIsPlaying(true);
        setStatus("ready");
      } catch (playError) {
        console.error("[AudioPlayer] Play error:", playError);
        setStatus("error");
        toast.error("Failed to play audio. Please try again.");
      }
    } catch (err) {
      console.error("[AudioPlayer] Load error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load audio";
      setStatus("error");
      toast.error(errorMessage);
    }
  }, [audioId]);

  const togglePlayback = () => {
    if (isPlaying) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    // Play
    void loadAndPlay();
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={togglePlayback}
        disabled={status === "loading"}
        className="flex items-center gap-2"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        <span>
          {status === "loading" ? "Loading..." : isPlaying ? t("pause") : t("play")}
        </span>
      </Button>
      {duration && (
        <span className="text-xs text-muted-foreground">
          {Math.round(duration)}s
        </span>
      )}
      {status === "error" && (
        <span className="text-xs text-destructive">Error</span>
      )}
    </div>
  );
}

