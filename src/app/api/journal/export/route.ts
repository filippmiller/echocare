import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, badRequest, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin, JOURNAL_AUDIO_BUCKET } from "@/lib/supabaseServer";

interface ExportRequest {
  ids?: string[]; // Specific entry IDs to export
  filter?: {
    q?: string;
    tags?: string[];
    from?: string;
    to?: string;
  };
  format: "csv" | "pdf";
}

/**
 * POST /api/journal/export
 * Export journal entries as CSV or PDF
 */
export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return unauthorized();
    }

    const body = (await request.json()) as ExportRequest;

    if (!body.format || !["csv", "pdf"].includes(body.format)) {
      return badRequest("Format must be 'csv' or 'pdf'");
    }

    if (!body.ids && !body.filter) {
      return badRequest("Either 'ids' or 'filter' must be provided");
    }

    // Build where clause
    const where: any = {
      userId: session.user.id,
    };

    if (body.ids && body.ids.length > 0) {
      // Export specific entries
      where.id = { in: body.ids };
    } else if (body.filter) {
      // Apply filters (same logic as search)
      if (body.filter.q) {
        where.OR = [
          { text: { contains: body.filter.q, mode: "insensitive" } },
          { summary: { contains: body.filter.q, mode: "insensitive" } },
          { title: { contains: body.filter.q, mode: "insensitive" } },
        ];
      }

      if (body.filter.tags && body.filter.tags.length > 0) {
        where.tags = { hasSome: body.filter.tags };
      }

      if (body.filter.from || body.filter.to) {
        where.createdAt = {};
        if (body.filter.from) {
          where.createdAt.gte = new Date(body.filter.from);
        }
        if (body.filter.to) {
          const toDate = new Date(body.filter.to);
          toDate.setHours(23, 59, 59, 999);
          where.createdAt.lte = toDate;
        }
      }
    }

    // Fetch entries
    const entries = await prisma.journalEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        audio: {
          select: {
            path: true,
            mime: true,
          },
        },
      },
    });

    if (entries.length === 0) {
      return NextResponse.json({ error: "No entries found to export" }, { status: 404 });
    }

    // Limit to prevent abuse (max 1000 entries)
    if (entries.length > 1000) {
      return badRequest("Too many entries. Maximum 1000 entries can be exported at once.");
    }

    if (body.format === "csv") {
      return exportAsCSV(entries);
    } else {
      return exportAsPDF(entries, session.user.id);
    }
  } catch (error) {
    console.error("[Export API] Error:", error);
    return internalServerError("Failed to export entries");
  }
}

async function exportAsCSV(entries: any[]) {
  const headers = ["ID", "Created At", "Type", "Title", "Text", "Summary", "Tags", "Mood", "Energy", "Audio URL"];
  const rows = entries.map((entry) => {
    const audioUrl = entry.audio
      ? `https://storage.supabase.co/object/public/${JOURNAL_AUDIO_BUCKET}/${entry.audio.path}`
      : "";

    return [
      entry.id,
      entry.createdAt.toISOString(),
      entry.type,
      entry.title || "",
      entry.text?.replace(/"/g, '""') || "", // Escape quotes for CSV
      entry.summary?.replace(/"/g, '""') || "",
      entry.tags.join("; ") || "",
      entry.mood || "",
      entry.energy?.toString() || "",
      audioUrl,
    ];
  });

  const csvContent = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="journal-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

async function exportAsPDF(entries: any[], userId: string) {
  // Dynamic import for PDF generation
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPos = margin;
  const lineHeight = 7;
  const pageHeight = doc.internal.pageSize.getHeight();

  // Helper to add new page if needed
  const checkNewPage = () => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
  };

  // Title
  doc.setFontSize(18);
  doc.text("Journal Entries Export", margin, yPos);
  yPos += lineHeight * 2;

  // Export date
  doc.setFontSize(10);
  doc.text(`Exported: ${new Date().toLocaleString()}`, margin, yPos);
  yPos += lineHeight * 1.5;

  // Entries
  for (const entry of entries) {
    checkNewPage();

    // Entry separator
    if (yPos > margin) {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += lineHeight;
    }

    // Date and type
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    const dateStr = new Date(entry.createdAt).toLocaleString();
    doc.text(`${dateStr} - ${entry.type}`, margin, yPos);
    yPos += lineHeight;

    // Title
    if (entry.title) {
      doc.setFont(undefined, "bold");
      doc.setFontSize(11);
      const titleLines = doc.splitTextToSize(entry.title, maxWidth);
      doc.text(titleLines, margin, yPos);
      yPos += lineHeight * titleLines.length;
    }

    // Summary
    if (entry.summary) {
      doc.setFont(undefined, "italic");
      doc.setFontSize(10);
      const summaryLines = doc.splitTextToSize(entry.summary, maxWidth);
      doc.text(summaryLines, margin, yPos);
      yPos += lineHeight * summaryLines.length;
    }

    // Text
    if (entry.text) {
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      const textLines = doc.splitTextToSize(entry.text, maxWidth);
      doc.text(textLines, margin, yPos);
      yPos += lineHeight * textLines.length;
    }

    // Tags
    if (entry.tags && entry.tags.length > 0) {
      doc.setFontSize(9);
      doc.text(`Tags: ${entry.tags.join(", ")}`, margin, yPos);
      yPos += lineHeight;
    }

    // Mood and Energy
    if (entry.mood || entry.energy !== null) {
      doc.setFontSize(9);
      const meta = [entry.mood && `Mood: ${entry.mood}`, entry.energy !== null && `Energy: ${entry.energy}`]
        .filter(Boolean)
        .join(", ");
      if (meta) {
        doc.text(meta, margin, yPos);
        yPos += lineHeight;
      }
    }

    // Audio note
    if (entry.type === "AUDIO" && entry.audio) {
      doc.setFontSize(9);
      doc.setFont(undefined, "italic");
      doc.text("📤 Audio recording available", margin, yPos);
      yPos += lineHeight;
    }

    yPos += lineHeight * 0.5;
  }

  const pdfBlob = doc.output("blob");
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="journal-export-${new Date().toISOString().split("T")[0]}.pdf"`,
    },
  });
}

