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

  // Create audio element once and reuse it
  useEffect(() => {
    if (!audioRef.current) {
      const audio = document.createElement("audio");
      audio.crossOrigin = "anonymous";
      audio.preload = "none"; // Don't preload until we set src
      
      // Add event listeners
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
      });
      
      audio.addEventListener("error", (e) => {
        console.error("Audio playback error:", e);
        const audioEl = audioRef.current;
        if (!audioEl) return;
        
        let errorMsg = "Failed to play audio";
        if (audioEl.error) {
          const errorCode = audioEl.error.code;
          const errorMessage = audioEl.error.message;
          
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
              errorMsg = `Audio error (${errorCode}): ${errorMessage}`;
          }
        }
        
        console.error("Audio error details:", {
          error: audioEl.error,
          src: audioEl.src,
          readyState: audioEl.readyState,
          networkState: audioEl.networkState,
        });
        
        setError(errorMsg);
        toast.error(errorMsg);
        setIsPlaying(false);
      });
      
      audio.addEventListener("loadstart", () => {
        console.log("Audio load started, src:", audio.src);
      });
      
      audio.addEventListener("loadedmetadata", () => {
        console.log("Audio metadata loaded:", {
          duration: audio.duration,
          readyState: audio.readyState,
          src: audio.src,
        });
      });
      
      audioRef.current = audio;
    }

    // Cleanup on unmount
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
        // Remove all event listeners by cloning the element
        const newAudio = audio.cloneNode(false) as HTMLAudioElement;
        audioRef.current = newAudio;
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

    const audio = audioRef.current;
    if (!audio) {
      const errorMsg = "Audio element not available";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Stop current playback and reset
    audio.pause();
    audio.src = "";
    
    // Set new URL - this will trigger loadstart automatically
    console.log("Setting audio src:", url);
    audio.src = url;
    console.log("Audio src after setting:", audio.src);
    
    // Verify src was set correctly
    if (audio.src !== url && audio.src !== new URL(url, window.location.href).href) {
      console.error("Audio src mismatch! Expected:", url, "Got:", audio.src);
      const errorMsg = "Failed to set audio source";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      // Wait for audio to be ready
      if (audio.readyState < 2) {
        await new Promise<void>((resolve, reject) => {
          // Check if already ready
          if (audio.readyState >= 2) {
            resolve();
            return;
          }
          const handleCanPlay = () => {
            resolve();
          };
          const handleError = (e: Event) => {
            reject(new Error("Audio failed to load"));
          };
          audio.addEventListener("canplay", handleCanPlay, { once: true });
          audio.addEventListener("error", handleError, { once: true });
        });
      }
      
      await audio.play();
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

