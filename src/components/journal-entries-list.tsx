"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    duration: number | null;
  } | null;
  createdAt: Date;
}

interface JournalEntriesListProps {
  initialEntries: JournalEntry[];
  initialNextCursor: string | null;
}

export function JournalEntriesList({ initialEntries, initialNextCursor }: JournalEntriesListProps) {
  const [entries, setEntries] = useState<JournalEntry[]>(initialEntries);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = async () => {
    if (!nextCursor || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/journal/entries?limit=20&cursor=${nextCursor}`);
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

  const refresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/journal/entries?limit=20");
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
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>My Entries</CardTitle>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet. Create your first entry above!</p>
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
                    ) : entry.type === "AUDIO" ? (
                      <p className="text-sm text-muted-foreground">
                        Audio note
                        {entry.audio?.duration ? ` (${entry.audio.duration}s)` : ""}
                      </p>
                    ) : null}
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
                {isLoading ? "Loading..." : "Load More"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

