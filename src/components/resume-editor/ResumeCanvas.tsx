import { cn } from "@/lib/utils";
import { EditableResume, ResumeItem, ResumeSection, stripHtml } from "@/lib/resumeEditor";

interface ResumeCanvasProps {
  resume: EditableResume;
  /** Kept for API compatibility — preview is read-only and ignores edits. */
  onChange?: (next: EditableResume) => void;
  /** Lower-cased keywords highlighted inline (preview-only). */
  keywords: string[];
}

/* ───────── Helpers ───────── */

/** Highlight occurrences of keywords inside a plain string. */
function highlight(text: string, keywords: string[]): React.ReactNode {
  if (!text) return text;
  const kw = (keywords || []).filter((k) => k && k.length > 1);
  if (kw.length === 0) return text;
  const escaped = kw.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) ? (
      <mark
        key={i}
        style={{ backgroundColor: "transparent", color: "inherit", fontWeight: 600 }}
      >
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

/** Render HTML bullet text safely as plain text with keyword highlight. */
function BulletText({ html, keywords }: { html: string; keywords: string[] }) {
  const text = stripHtml(html || "").trim();
  return <>{highlight(text, keywords)}</>;
}

/* ───────── Item ───────── */
function ItemBlock({ item, keywords }: { item: ResumeItem; keywords: string[] }) {
  return (
    <div className="mb-1.5">
      <div className="flex items-baseline justify-between gap-3 w-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap leading-tight">
            <span className="text-[10.5pt] font-semibold text-black">{item.heading}</span>
            {item.subheading && (
              <>
                <span className="text-black text-[10pt]">—</span>
                <span className="text-[10.5pt] text-black">{item.subheading}</span>
              </>
            )}
          </div>
        </div>
        {item.date && (
          <span className="text-[9.5pt] text-black whitespace-nowrap text-right shrink-0 leading-tight">
            {item.date}
          </span>
        )}
      </div>

      <ul className="ml-4 mt-0.5 text-[10pt] text-black list-disc list-outside space-y-0">
        {item.bullets
          .map((b) => stripHtml(b.text).trim())
          .filter(Boolean)
          .map((text, i) => (
            <li key={i} className="leading-snug">
              {highlight(text, keywords)}
            </li>
          ))}
      </ul>
    </div>
  );
}

/* ───────── Main canvas ───────── */
export function ResumeCanvas({ resume, keywords }: ResumeCanvasProps) {
  const renderSummary = () =>
    resume.visibility.summary && stripHtml(resume.summary).trim() ? (
      <SectionWrap key="__summary" title="Summary">
        <p className="text-[10pt] leading-snug text-black">
          <BulletText html={resume.summary} keywords={keywords} />
        </p>
      </SectionWrap>
    ) : null;

  const renderSkills = () =>
    resume.visibility.skills && resume.skills.length > 0 ? (
      <SectionWrap key="__skills" title="Skills">
        <p className="text-[10pt] leading-snug text-black">
          {resume.skills.map((s, i) => (
            <span key={`${s}-${i}`}>
              {highlight(s, keywords)}
              {i < resume.skills.length - 1 && <span className="mx-1.5">•</span>}
            </span>
          ))}
        </p>
      </SectionWrap>
    ) : null;

  const renderCustom = (section: ResumeSection) =>
    section.visible ? (
      <SectionWrap key={section.id} title={section.title}>
        {section.items.map((item) => (
          <ItemBlock key={item.id} item={item} keywords={keywords} />
        ))}
      </SectionWrap>
    ) : null;

  const sectionsById = new Map(resume.sections.map((s) => [s.id, s]));
  const orderedNodes = (resume.order || []).map((tok) => {
    if (tok === "summary") return renderSummary();
    if (tok === "skills") return renderSkills();
    const sec = sectionsById.get(tok.sectionId);
    return sec ? renderCustom(sec) : null;
  });

  return (
    <div
      className="bg-white mx-auto rounded-sm px-10 py-6"
      style={{
        width: "min(100%, 8.5in)",
        minHeight: "11in",
        fontFamily: "'Calibri', 'Helvetica Neue', Arial, sans-serif",
        color: "#000",
        boxShadow: "0 10px 30px -10px rgba(0,0,0,0.18), 0 4px 10px -2px rgba(0,0,0,0.08)",
      }}
      data-resume-canvas
    >
      {/* Header */}
      <div className="text-center pb-1.5 border-b border-black">
        <h1 className="text-[20pt] font-bold leading-tight text-black m-0">
          {resume.header.full_name}
        </h1>
        <p className="text-[9.5pt] mt-0.5 text-black leading-snug whitespace-pre-wrap">
          {resume.header.contact_line}
        </p>
      </div>

      {orderedNodes}
    </div>
  );
}

function SectionWrap({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("mt-2")}>
      <h2 className="text-[10.5pt] font-bold uppercase tracking-[0.08em] text-black border-b border-black pb-0.5 mb-1 leading-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}
