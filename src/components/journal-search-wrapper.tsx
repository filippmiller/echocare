"use client";

import { useState } from "react";
import { JournalSearch } from "./journal-search";
import { JournalEntriesList } from "./journal-entries-list";
import type { EntryType } from "@prisma/client";

interface JournalEntry {
  id: string;
  type: EntryType;
  title: string | null;
  text: string | null;
  summary: string | null;
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

interface JournalSearchWrapperProps {
  initialEntries: JournalEntry[];
  initialNextCursor: string | null;
}

export function JournalSearchWrapper({
  initialEntries,
  initialNextCursor,
}: JournalSearchWrapperProps) {
  const [entries, setEntries] = useState<JournalEntry[]>(initialEntries);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [searchFilters, setSearchFilters] = useState<
    { q?: string; tags?: string[]; from?: string; to?: string } | undefined
  >(undefined);

  const handleSearch = async (filters: {
    q: string;
    tags: string[];
    from: string;
    to: string;
  }) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.tags.length) params.set("tags", filters.tags.join(","));
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    params.set("limit", "20");

    const response = await fetch(`/api/journal/search?${params.toString()}`);
    if (!response.ok) return;

    const data = (await response.json()) as {
      entries: JournalEntry[];
      nextCursor: string | null;
      hasMore: boolean;
    };

    setEntries(data.entries);
    setNextCursor(data.nextCursor);
    setSearchFilters({
      q: filters.q || undefined,
      tags: filters.tags.length ? filters.tags : undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    });
  };

  const handleClear = () => {
    // Reset to initial entries
    setEntries(initialEntries);
    setNextCursor(initialNextCursor);
    setSearchFilters(undefined);
  };

  return (
    <div className="space-y-4">
      <JournalSearch onSearch={handleSearch} onClear={handleClear} />
      <JournalEntriesList
        initialEntries={entries}
        initialNextCursor={nextCursor}
        searchFilters={searchFilters}
      />
    </div>
  );
}

