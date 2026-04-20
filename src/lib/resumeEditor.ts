/**
 * Shared types + helpers for the editable tailored resume.
 * Kept in /lib so both the editor UI and the export utilities can use them.
 */

export interface ResumeBullet {
  id: string;
  text: string;
}

export interface ResumeItem {
  id: string;
  heading: string;
  subheading?: string;
  date?: string;
  bullets: ResumeBullet[];
}

export type ResumeSectionKey =
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "projects"
  | "certifications";

export interface ResumeSection {
  id: string;
  key: ResumeSectionKey | "custom";
  title: string;
  visible: boolean;
  items: ResumeItem[];
}

export interface ResumeHeader {
  full_name: string;
  contact_line: string; // single contact line shown right under the name
}

export interface EditableResume {
  header: ResumeHeader;
  summary: string; // plain text/HTML for the summary section
  skills: string[];
  sections: ResumeSection[]; // experience, education, projects, certifications
  /** sectionKey -> visible */
  visibility: Record<ResumeSectionKey, boolean>;
}

export const DEFAULT_VISIBILITY: Record<ResumeSectionKey, boolean> = {
  summary: true,
  skills: true,
  experience: true,
  education: true,
  projects: true,
  certifications: true,
};

let __idCounter = 0;
export const newId = (prefix = "id") => {
  __idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${__idCounter}`;
};

const compact = (values: Array<string | null | undefined>) =>
  values.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean) as string[];

/**
 * Build an editable resume from the AI-tailored response combined with the user's profile.
 * The profile is the source of truth for the header (name + contact line).
 */
export function buildEditableResume(
  tailored: any,
  profile: any | null | undefined,
): EditableResume {
  const fullName =
    profile?.full_name?.trim() ||
    compact([profile?.first_name, profile?.last_name]).join(" ") ||
    tailored?.header?.full_name ||
    "Your Name";

  const contactParts = compact([
    profile?.contact_email || profile?.email,
    profile?.phone,
    profile?.location || compact([profile?.city, profile?.state]).join(", "),
    profile?.linkedin_url,
    profile?.github_url,
    profile?.portfolio_url,
  ]);
  const contact_line = contactParts.length
    ? contactParts.join(" • ")
    : (tailored?.header?.contact_details || []).filter(Boolean).join(" • ");

  const summary: string = typeof tailored?.summary === "string" ? tailored.summary : "";
  const skills: string[] = Array.isArray(tailored?.skills_section) ? tailored.skills_section : [];

  // Map AI sections into editable sections, classifying by title.
  const sections: ResumeSection[] = (tailored?.sections || []).map((s: any) => {
    const lowerTitle = String(s?.title || "").toLowerCase();
    let key: ResumeSection["key"] = "custom";
    if (lowerTitle.includes("experience") || lowerTitle.includes("work")) key = "experience";
    else if (lowerTitle.includes("education")) key = "education";
    else if (lowerTitle.includes("project")) key = "projects";
    else if (lowerTitle.includes("certif")) key = "certifications";

    const items: ResumeItem[] = (s?.items || []).map((it: any) => ({
      id: newId("item"),
      heading: String(it?.heading || ""),
      subheading: it?.subheading ? String(it.subheading) : "",
      date: it?.date ? String(it.date) : "",
      bullets: (it?.bullets || []).map((b: any) => ({
        id: newId("bul"),
        text: String(b || ""),
      })),
    }));

    return {
      id: newId("sec"),
      key,
      title: String(s?.title || "Section"),
      visible: true,
      items,
    };
  });

  return {
    header: { full_name: fullName, contact_line },
    summary,
    skills,
    sections,
    visibility: { ...DEFAULT_VISIBILITY },
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

/** FirstName_LastName_RoleName_CompanyName.ext */
export function buildResumeFilename(
  fullName: string,
  jobTitle: string,
  company: string,
  ext: "pdf" | "docx" | "txt",
) {
  const parts = (fullName || "").trim().split(/\s+/);
  const first = sanitizeFilenamePart(parts[0] || "Resume");
  const last = sanitizeFilenamePart(parts.slice(1).join(" ") || "");
  const role = sanitizeFilenamePart(jobTitle || "Role");
  const co = sanitizeFilenamePart(company || "Company");
  const name = [first, last, role, co].filter(Boolean).join("_");
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
    const visKey = section.key as ResumeSectionKey;
    if (visKey in resume.visibility && !resume.visibility[visKey]) continue;
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

export function isSectionVisible(resume: EditableResume, section: ResumeSection): boolean {
  if (!section.visible) return false;
  const k = section.key as ResumeSectionKey;
  if (k in resume.visibility) return resume.visibility[k];
  return true;
}
