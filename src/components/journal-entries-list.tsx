"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "@/components/audio-player";
import type { EntryType } from "@prisma/client";

interface JournalEntry {
  id: string;
  type: EntryType;
  title: string | null;
  text: string | null;
  mood: string | null;
  energy: number | null;
  tags: string[];
  audioId: string | null;
  audio: {
    id: string;
    duration: number | null;
    mime: string | null;
  } | null;
  createdAt: Date;
}

interface JournalEntriesListProps {
  initialEntries: JournalEntry[];
  initialNextCursor: string | null;
  searchFilters?: {
    q?: string;
    tags?: string[];
    from?: string;
    to?: string;
  };
}

export function JournalEntriesList({
  initialEntries,
  initialNextCursor,
  searchFilters,
}: JournalEntriesListProps) {
  const t = useTranslations("journal");
  const tCommon = useTranslations("common");
  const [entries, setEntries] = useState<JournalEntry[]>(initialEntries);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(!!searchFilters);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = "/api/journal/entries?limit=20";
      if (searchFilters) {
        // Use search endpoint
        const params = new URLSearchParams();
        if (searchFilters.q) params.set("q", searchFilters.q);
        if (searchFilters.tags?.length) params.set("tags", searchFilters.tags.join(","));
        if (searchFilters.from) params.set("from", searchFilters.from);
        if (searchFilters.to) params.set("to", searchFilters.to);
        params.set("limit", "20");
        url = `/api/journal/search?${params.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) return;

      const data = (await response.json()) as {
        entries: JournalEntry[];
        nextCursor: string | null;
        hasMore: boolean;
      };

      setEntries(data.entries);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error("Refresh error", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchFilters]);

  // Listen for new entry creation events
  useEffect(() => {
    const handleEntryCreated = () => {
      void refresh();
    };

    window.addEventListener("journalEntryCreated", handleEntryCreated);
    return () => {
      window.removeEventListener("journalEntryCreated", handleEntryCreated);
    };
  }, [refresh]);

  const loadMore = async () => {
    if (!nextCursor || isLoading) return;

    setIsLoading(true);
    try {
      let url = `/api/journal/entries?limit=20&cursor=${nextCursor}`;
      if (searchFilters) {
        // Use search endpoint with cursor
        const params = new URLSearchParams();
        if (searchFilters.q) params.set("q", searchFilters.q);
        if (searchFilters.tags?.length) params.set("tags", searchFilters.tags.join(","));
        if (searchFilters.from) params.set("from", searchFilters.from);
        if (searchFilters.to) params.set("to", searchFilters.to);
        params.set("limit", "20");
        params.set("cursor", nextCursor);
        url = `/api/journal/search?${params.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) return;

      const data = (await response.json()) as {
        entries: JournalEntry[];
        nextCursor: string | null;
        hasMore: boolean;
      };

      setEntries((prev) => [...prev, ...data.entries]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error("Load more error", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("myEntries")}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isLoading}>
            {tCommon("refresh")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noEntries")}</p>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="border-b pb-4 last:border-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {entry.type === "AUDIO" ? "🎤 Audio" : "📝 Text"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {entry.title && <h3 className="font-semibold mb-1">{entry.title}</h3>}
                    {entry.type === "TEXT" && entry.text ? (
                      <p className="text-sm text-muted-foreground">
                        {entry.text.length > 120 ? `${entry.text.substring(0, 120)}...` : entry.text}
                      </p>
                    ) : entry.type === "AUDIO" && entry.audioId && entry.audio ? (
                      <div className="mt-2">
                        <AudioPlayer audioId={entry.audio.id} duration={entry.audio.duration} />
                      </div>
                    ) : null}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-block text-xs px-2 py-1 bg-muted rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {entry.mood && (
                      <span className="inline-block mt-2 text-xs px-2 py-1 bg-muted rounded">
                        Mood: {entry.mood}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {nextCursor && (
              <Button variant="outline" onClick={() => void loadMore()} disabled={isLoading} className="w-full">
                {isLoading ? tCommon("loading") : t("loadMore")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

