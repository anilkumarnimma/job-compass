import { jsPDF } from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";
import {
  EditableResume,
  ResumeSectionKey,
  buildResumeFilename,
  resumeToPlainText,
  stripHtml,
} from "./resumeEditor";

/* ────────────────────────────────────────────
 * Plain text export
 * ──────────────────────────────────────────── */
export function exportResumeAsText(
  resume: EditableResume,
  jobTitle: string,
  company: string,
) {
  const text = resumeToPlainText(resume);
  const filename = buildResumeFilename(resume.header.full_name, jobTitle, company, "txt");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  saveAs(blob, filename);
}

export async function copyResumeToClipboard(resume: EditableResume): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(resumeToPlainText(resume));
    return true;
  } catch {
    return false;
  }
}

/* ────────────────────────────────────────────
 * PDF export — strict black & white, US Letter
 * Drawn directly to jsPDF for clean text (no rasterized blobs).
 * ──────────────────────────────────────────── */
const PT_PER_IN = 72;
const PAGE_W = 8.5 * PT_PER_IN;
const PAGE_H = 11 * PT_PER_IN;
const MARGIN_X = 0.6 * PT_PER_IN;
const MARGIN_Y = 0.55 * PT_PER_IN;

function isHidden(resume: EditableResume, key: string, fallbackVisible = true) {
  if (key === "summary" || key === "skills") {
    return !resume.visibility[key as ResumeSectionKey];
  }
  if (key in resume.visibility) {
    return !resume.visibility[key as ResumeSectionKey];
  }
  return !fallbackVisible;
}

export function exportResumeAsPdf(
  resume: EditableResume,
  jobTitle: string,
  company: string,
) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  doc.setProperties({ title: `${resume.header.full_name} — Resume` });

  let y = MARGIN_Y;

  const ensureRoom = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN_Y) {
      doc.addPage();
      y = MARGIN_Y;
    }
  };

  const writeWrapped = (
    text: string,
    opts: { size: number; bold?: boolean; indent?: number; gap?: number },
  ) => {
    if (!text) return;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size);
    const indent = opts.indent || 0;
    const maxW = PAGE_W - MARGIN_X * 2 - indent;
    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      ensureRoom(opts.size + 2);
      doc.text(line, MARGIN_X + indent, y);
      y += opts.size * 1.25;
    }
    if (opts.gap) y += opts.gap;
  };

  const drawDivider = () => {
    ensureRoom(10);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
    y += 8;
  };

  const sectionTitle = (title: string) => {
    ensureRoom(28);
    y += 4;
    drawDivider();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title.toUpperCase(), MARGIN_X, y);
    y += 14;
  };

  // Header — name centered, contact line centered
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  const nameW = doc.getTextWidth(resume.header.full_name || "");
  doc.text(resume.header.full_name || "", (PAGE_W - nameW) / 2, y + 14);
  y += 24;

  if (resume.header.contact_line) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const contactW = doc.getTextWidth(resume.header.contact_line);
    doc.text(resume.header.contact_line, (PAGE_W - contactW) / 2, y + 8);
    y += 16;
  }
  y += 4;

  // Summary
  if (!isHidden(resume, "summary") && resume.summary?.trim()) {
    sectionTitle("Summary");
    writeWrapped(stripHtml(resume.summary).trim(), { size: 10.5, gap: 6 });
  }

  // Skills
  if (!isHidden(resume, "skills") && resume.skills.length) {
    sectionTitle("Skills");
    writeWrapped(resume.skills.join(" • "), { size: 10.5, gap: 6 });
  }

  // Other sections
  for (const section of resume.sections) {
    if (isHidden(resume, section.key, section.visible)) continue;
    if (!section.items.length) continue;
    sectionTitle(section.title);
    for (const item of section.items) {
      ensureRoom(28);
      const headerLeft = [item.heading, item.subheading].filter(Boolean).join(" — ");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(headerLeft, MARGIN_X, y);
      if (item.date) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        const dW = doc.getTextWidth(item.date);
        doc.text(item.date, PAGE_W - MARGIN_X - dW, y);
      }
      y += 13;
      for (const b of item.bullets) {
        const text = stripHtml(b.text).trim();
        if (!text) continue;
        ensureRoom(14);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("•", MARGIN_X + 6, y);
        const lines = doc.splitTextToSize(text, PAGE_W - MARGIN_X * 2 - 18);
        for (let i = 0; i < lines.length; i++) {
          if (i > 0) ensureRoom(12);
          doc.text(lines[i], MARGIN_X + 18, y);
          y += 12;
        }
      }
      y += 4;
    }
  }

  const filename = buildResumeFilename(resume.header.full_name, jobTitle, company, "pdf");
  doc.save(filename);
}

/* ────────────────────────────────────────────
 * DOCX export — strict black & white
 * ──────────────────────────────────────────── */
function p(opts: {
  text: string;
  bold?: boolean;
  size?: number; // half-points
  alignment?: keyof typeof AlignmentType;
  spacingBefore?: number;
  spacingAfter?: number;
  bullet?: boolean;
}) {
  return new Paragraph({
    alignment: AlignmentType[opts.alignment || "LEFT"] as any,
    spacing: { before: opts.spacingBefore || 0, after: opts.spacingAfter || 0 },
    bullet: opts.bullet ? { level: 0 } : undefined,
    children: [
      new TextRun({
        text: opts.text,
        bold: opts.bold,
        size: opts.size || 22, // 11pt default
        font: "Calibri",
        color: "000000",
      }),
    ],
  });
}

function sectionHeader(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    border: {
      bottom: { color: "000000", style: BorderStyle.SINGLE, size: 6, space: 1 },
    },
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: 22, // 11pt
        font: "Calibri",
        color: "000000",
        characterSpacing: 24,
      }),
    ],
  });
}

export async function exportResumeAsDocx(
  resume: EditableResume,
  jobTitle: string,
  company: string,
) {
  const children: Paragraph[] = [];

  // Header
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: resume.header.full_name || "",
          bold: true,
          size: 40, // 20pt
          font: "Calibri",
          color: "000000",
        }),
      ],
    }),
  );
  if (resume.header.contact_line) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: resume.header.contact_line,
            size: 19,
            font: "Calibri",
            color: "000000",
          }),
        ],
      }),
    );
  }

  if (!isHidden(resume, "summary") && resume.summary?.trim()) {
    children.push(sectionHeader("Summary"));
    children.push(p({ text: stripHtml(resume.summary).trim(), size: 21 }));
  }

  if (!isHidden(resume, "skills") && resume.skills.length) {
    children.push(sectionHeader("Skills"));
    children.push(p({ text: resume.skills.join(" • "), size: 21 }));
  }

  for (const section of resume.sections) {
    if (isHidden(resume, section.key, section.visible)) continue;
    if (!section.items.length) continue;
    children.push(sectionHeader(section.title));
    for (const item of section.items) {
      const headerLeft = [item.heading, item.subheading].filter(Boolean).join(" — ");
      const headerRight = item.date || "";
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          tabStops: [{ type: "right" as any, position: 9000 }],
          children: [
            new TextRun({
              text: headerLeft,
              bold: true,
              size: 22,
              font: "Calibri",
              color: "000000",
            }),
            ...(headerRight
              ? [
                  new TextRun({
                    text: `\t${headerRight}`,
                    size: 20,
                    font: "Calibri",
                    color: "000000",
                  }),
                ]
              : []),
          ],
        }),
      );
      for (const b of item.bullets) {
        const t = stripHtml(b.text).trim();
        if (!t) continue;
        children.push(p({ text: t, size: 21, bullet: true }));
      }
    }
  }

  const doc = new Document({
    creator: resume.header.full_name || "Resume",
    title: `${resume.header.full_name || "Resume"}`,
    styles: {
      default: { document: { run: { font: "Calibri", size: 22, color: "000000" } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = buildResumeFilename(resume.header.full_name, jobTitle, company, "docx");
  saveAs(blob, filename);
}
