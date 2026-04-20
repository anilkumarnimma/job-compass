/**
 * Shared types + helpers for the editable tailored resume.
 *
 * The editor now operates STRICTLY on the user's uploaded resume structure —
 * the AI tailor only rewords bullets/summary and reorders skills. Every
 * bullet carries its `original` text and a `changed` flag so the editor can
 * highlight what was modified in teal.
 */

import type {
  ResumeStructure,
  ResumeStructureItem,
} from "@/hooks/useResumeStructure";
import type { TailoredResumeData } from "@/hooks/useTailoredResume";

export interface ResumeBullet {
  id: string;
  text: string;
  original?: string;
  changed?: boolean;
}

export interface ResumeItem {
  id: string;
  heading: string;
  subheading?: string;
  date?: string;
  bullets: ResumeBullet[];
}

export interface ResumeSection {
  id: string;
  /** "summary" / "skills" are surfaced separately. Other sections preserve their original title. */
  key: "summary" | "skills" | "custom";
  title: string;
  visible: boolean;
  items: ResumeItem[];
  /** True if this section came from the resume itself (so we don't reorder it). */
  fromResume?: boolean;
}

export interface ResumeHeader {
  full_name: string;
  contact_line: string;
}

export interface EditableResume {
  header: ResumeHeader;
  summary: string;
  /** True when the AI rewrote the summary (drives teal highlight on summary box). */
  summary_changed?: boolean;
  /** Original summary before tailoring. */
  summary_original?: string;
  skills: string[];
  /** Sections IN THE EXACT ORDER they appeared in the user's uploaded resume. */
  sections: ResumeSection[];
  /** True if the section/value should be visible. Persistent across renders. */
  visibility: { summary: boolean; skills: boolean };
}

let __idCounter = 0;
export const newId = (prefix = "id") => {
  __idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${__idCounter}`;
};

const compact = (values: Array<string | null | undefined>) =>
  values
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean) as string[];

/**
 * Build the editable resume from:
 *  - the original ResumeStructure (source of truth for header / order)
 *  - the AI tailored output (only updates summary text + bullet wording + skill order)
 *  - the user's profile (used ONLY as a fallback if the parsed header is missing fields)
 */
export function buildEditableResume(
  structure: ResumeStructure,
  tailored: TailoredResumeData | null,
  profile: any | null | undefined,
): EditableResume {
  // Header — always from the parsed resume; fall back to the profile.
  const fullName =
    structure.header?.full_name?.trim() ||
    profile?.full_name?.trim() ||
    compact([profile?.first_name, profile?.last_name]).join(" ") ||
    "Your Name";

  const contactParts =
    structure.header?.contact_details?.length
      ? structure.header.contact_details
      : compact([
          profile?.contact_email || profile?.email,
          profile?.phone,
          profile?.location || compact([profile?.city, profile?.state]).join(", "),
          profile?.linkedin_url,
          profile?.github_url,
          profile?.portfolio_url,
        ]);

  const contact_line = contactParts.filter(Boolean).join(" • ");

  // Summary — tailored text if present, else the original.
  const summary = tailored?.summary ?? structure.summary ?? "";
  const summary_original = tailored?.summary_original ?? structure.summary ?? "";
  const summary_changed = !!tailored?.summary_changed;

  // Skills — tailored order if present, else original.
  const skills = (tailored?.skills?.length ? tailored.skills : structure.skills) || [];

  // Sections — preserve the EXACT order from the original structure.
  const tailoredSections = tailored?.sections || [];

  const sections: ResumeSection[] = (structure.sections || []).map(
    (origSec, sIdx): ResumeSection => {
      const tailoredSec = tailoredSections[sIdx];
      const items: ResumeItem[] = (origSec.items || []).map((origItem: ResumeStructureItem, iIdx) => {
        const tailoredItem = tailoredSec?.items?.[iIdx];
        const origBullets = origItem.bullets || [];

        const bullets: ResumeBullet[] = origBullets.map((origText, bIdx) => {
          const tb = tailoredItem?.bullets?.[bIdx];
          if (tb) {
            return {
              id: newId("bul"),
              text: tb.text || origText,
              original: tb.original ?? origText,
              changed: !!tb.changed,
            };
          }
          return { id: newId("bul"), text: origText, original: origText, changed: false };
        });

        return {
          id: newId("item"),
          heading: origItem.heading || "",
          subheading: origItem.subheading || "",
          date: origItem.date || "",
          bullets,
        };
      });

      return {
        id: newId("sec"),
        key: "custom",
        title: origSec.title || "Section",
        visible: true,
        items,
        fromResume: true,
      };
    },
  );

  return {
    header: { full_name: fullName, contact_line },
    summary,
    summary_original,
    summary_changed,
    skills,
    sections,
    visibility: {
      summary: !!(summary && summary.trim()),
      skills: skills.length > 0,
    },
  };
}

/** Used for live keyword highlighting in the editor preview. */
export function extractKeywords(jobDescription: string, jobSkills: string[]): string[] {
  const skills = jobSkills.map((s) => s.trim()).filter(Boolean);
  const fromDesc = (jobDescription || "")
    .replace(/[^a-zA-Z0-9+#./\- ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && /^[A-Z]/.test(w));
  const dedup = new Set<string>();
  [...skills, ...fromDesc].forEach((w) => dedup.add(w.toLowerCase()));
  return [...dedup].slice(0, 60);
}

/** Sanitize a filename segment. */
export function sanitizeFilenamePart(value: string) {
  return (value || "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "Untitled";
}

/**
 * FirstName_LastName_CompanyName_RoleName.ext
 * (Per spec: company before role, no dates / no version numbers / no AI labels.)
 */
export function buildResumeFilename(
  fullName: string,
  jobTitle: string,
  company: string,
  ext: "pdf" | "docx" | "txt",
) {
  const parts = (fullName || "").trim().split(/\s+/);
  const first = sanitizeFilenamePart(parts[0] || "Resume");
  const last = sanitizeFilenamePart(parts.slice(1).join(" ") || "");
  const co = sanitizeFilenamePart(company || "Company");
  const role = sanitizeFilenamePart(jobTitle || "Role");
  const name = [first, last, co, role].filter(Boolean).join("_");
  return `${name}.${ext}`;
}

/** Convert structured editable resume to plain text (for clipboard). */
export function resumeToPlainText(resume: EditableResume): string {
  const lines: string[] = [];
  lines.push(resume.header.full_name);
  if (resume.header.contact_line) lines.push(resume.header.contact_line);
  lines.push("");

  if (resume.visibility.summary && resume.summary?.trim()) {
    lines.push("SUMMARY");
    lines.push(stripHtml(resume.summary).trim());
    lines.push("");
  }

  if (resume.visibility.skills && resume.skills.length) {
    lines.push("SKILLS");
    lines.push(resume.skills.join(" • "));
    lines.push("");
  }

  for (const section of resume.sections) {
    if (!section.visible) continue;
    if (!section.items.length) continue;
    lines.push(section.title.toUpperCase());
    for (const item of section.items) {
      const headerLine = [item.heading, item.subheading].filter(Boolean).join(" — ");
      const dateLine = item.date ? `   ${item.date}` : "";
      lines.push(headerLine + dateLine);
      for (const b of item.bullets) {
        const t = stripHtml(b.text).trim();
        if (t) lines.push(`  • ${t}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    // Strip preview-only highlight wrappers (keyword + change) keeping inner text.
    .replace(/<mark\b[^>]*data-(?:kw|chg)[^>]*>([\s\S]*?)<\/mark>/gi, "$1")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>(?!\n)/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Convenience: count tailoring changes still present in the editable resume. */
export function countActiveChanges(resume: EditableResume | null): number {
  if (!resume) return 0;
  let n = resume.summary_changed && resume.summary?.trim() === (resume.summary_original ?? "").trim()
    ? 0 // user reverted summary
    : (resume.summary_changed ? 1 : 0);
  for (const s of resume.sections) {
    for (const it of s.items) {
      for (const b of it.bullets) {
        if (b.changed) n += 1;
      }
    }
  }
  return n;
}
