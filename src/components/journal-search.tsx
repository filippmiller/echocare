"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Search, X, Calendar, Tag, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface SearchFilters {
  q: string;
  tags: string[];
  from: string;
  to: string;
}

interface JournalSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onClear: () => void;
  initialFilters?: Partial<SearchFilters>;
}

export function JournalSearch({ onSearch, onClear, initialFilters }: JournalSearchProps) {
  const t = useTranslations("journal.search");
  const tFilters = useTranslations("journal.filters");
  const tExport = useTranslations("export");
  const [isExporting, setIsExporting] = useState(false);
  const [query, setQuery] = useState(initialFilters?.q || "");
  const [tagsInput, setTagsInput] = useState(initialFilters?.tags?.join(", ") || "");
  const [fromDate, setFromDate] = useState(initialFilters?.from || "");
  const [toDate, setToDate] = useState(initialFilters?.to || "");

  // Load saved filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("journalSearchFilters");
    if (saved && !initialFilters) {
      try {
        const filters = JSON.parse(saved) as Partial<SearchFilters>;
        setQuery(filters.q || "");
        setTagsInput(filters.tags?.join(", ") || "");
        setFromDate(filters.from || "");
        setToDate(filters.to || "");
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [initialFilters]);

  const handleSearch = useCallback(() => {
    const filters: SearchFilters = {
      q: query.trim(),
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      from: fromDate,
      to: toDate,
    };

    // Save to localStorage
    localStorage.setItem("journalSearchFilters", JSON.stringify(filters));

    onSearch(filters);
  }, [query, tagsInput, fromDate, toDate, onSearch]);

  const handleClear = useCallback(() => {
    setQuery("");
    setTagsInput("");
    setFromDate("");
    setToDate("");
    localStorage.removeItem("journalSearchFilters");
    onClear();
  }, [onClear]);

  const handleExport = async (format: "csv" | "pdf") => {
    setIsExporting(true);
    try {
      const filters: SearchFilters = {
        q: query.trim(),
        tags: tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        from: fromDate,
        to: toDate,
      };

      const response = await fetch("/api/journal/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter: filters.q || filters.tags.length || filters.from || filters.to ? filters : undefined,
          format,
        }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `journal-export-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(tExport("success") || "Export completed");
    } catch (err) {
      console.error("Export error", err);
      toast.error("Failed to export entries");
    } finally {
      setIsExporting(false);
    }
  };

  const hasFilters = query || tagsInput || fromDate || toDate;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Search query */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              className="pl-10"
            />
          </div>

          {/* Tags filter */}
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={tFilters("tags") + " (comma-separated)"}
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder={tFilters("from")}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder={tFilters("to")}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button onClick={handleSearch} className="flex-1">
              <Search className="h-4 w-4 mr-2" />
              {t("search") || "Search"}
            </Button>
            {hasFilters && (
              <>
                <Button variant="outline" onClick={handleClear}>
                  <X className="h-4 w-4 mr-2" />
                  {t("clear") || "Clear"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleExport("csv")}
                  disabled={isExporting}
                  title={tExport("format.csv") || "Export as CSV"}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleExport("pdf")}
                  disabled={isExporting}
                  title={tExport("format.pdf") || "Export as PDF"}
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </>
            )}
          </div>

          {/* Active filters display */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {query && (
                <Badge variant="secondary">
                  {t("query")}: {query}
                </Badge>
              )}
              {tagsInput && (
                <Badge variant="secondary">
                  {tFilters("tags")}: {tagsInput}
                </Badge>
              )}
              {fromDate && (
                <Badge variant="secondary">
                  {tFilters("from")}: {fromDate}
                </Badge>
              )}
              {toDate && (
                <Badge variant="secondary">
                  {tFilters("to")}: {toDate}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

