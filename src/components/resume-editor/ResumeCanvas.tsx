import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Minus, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  EditableResume,
  ResumeItem,
  ResumeSection,
  ResumeSectionKey,
  newId,
} from "@/lib/resumeEditor";
import { InlineEditable } from "./InlineEditable";
import { RichTextEditor } from "./RichTextEditor";

interface ResumeCanvasProps {
  resume: EditableResume;
  onChange: (next: EditableResume) => void;
  /** Lower-cased keywords to highlight in bullets / summary */
  keywords: string[];
}

/* Wraps each segment so React can key them; uses <mark> for highlights */
function HighlightOverlay({ html, keywords }: { html: string; keywords: string[] }) {
  // Render is handled by TipTap; this overlay component is unused — kept here
  // to make the highlighting hook explicit. Highlighting is achieved purely via
  // CSS using a data-keywords attribute below. (See globals if added.)
  return null;
}

/* ───────── Sortable bullet ───────── */
function SortableBullet({
  bullet,
  onChange,
  onRemove,
  onAddBelow,
  placeholder,
  keywords,
}: {
  bullet: { id: string; text: string };
  onChange: (text: string) => void;
  onRemove: () => void;
  onAddBelow: () => void;
  placeholder?: string;
  keywords?: string[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bullet.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-1.5 -ml-2 pl-2 rounded hover:bg-accent/5"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag bullet"
        className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing mt-1 text-muted-foreground/60 hover:text-foreground"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className="mt-1.5 leading-none text-foreground">•</span>
      <div className="flex-1 min-w-0">
        <RichTextEditor
          value={bullet.text}
          onChange={onChange}
          placeholder={placeholder || "Bullet point…"}
          minHeight={20}
          keywords={keywords}
        />
      </div>
      <div className="flex items-start gap-0.5 opacity-0 group-hover:opacity-100">
        <button
          type="button"
          aria-label="Remove bullet"
          onClick={onRemove}
          className="mt-0.5 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Add bullet below"
          onClick={onAddBelow}
          className="mt-0.5 p-0.5 rounded hover:bg-accent/10 text-muted-foreground hover:text-accent"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

/* ───────── Item (work / education entry) ───────── */
function ItemBlock({
  item,
  onItemChange,
  onRemoveItem,
}: {
  item: ResumeItem;
  onItemChange: (next: ResumeItem) => void;
  onRemoveItem: () => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const setBullets = (bullets: ResumeItem["bullets"]) => onItemChange({ ...item, bullets });

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = item.bullets.findIndex((b) => b.id === active.id);
    const newIdx = item.bullets.findIndex((b) => b.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    setBullets(arrayMove(item.bullets, oldIdx, newIdx));
  };

  return (
    <div className="group/item space-y-1 mb-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <InlineEditable
              value={item.heading}
              onChange={(v) => onItemChange({ ...item, heading: v })}
              placeholder="Job title"
              className="text-[13px] font-semibold text-foreground"
              ariaLabel="Heading"
            />
            {item.subheading !== undefined && (
              <>
                <span className="text-muted-foreground text-xs">—</span>
                <InlineEditable
                  value={item.subheading || ""}
                  onChange={(v) => onItemChange({ ...item, subheading: v })}
                  placeholder="Company"
                  className="text-[13px] text-muted-foreground"
                  ariaLabel="Subheading"
                />
              </>
            )}
          </div>
        </div>
        <InlineEditable
          value={item.date || ""}
          onChange={(v) => onItemChange({ ...item, date: v })}
          placeholder="Dates"
          className="text-[11px] text-muted-foreground whitespace-nowrap"
          ariaLabel="Dates"
        />
        <button
          type="button"
          aria-label="Remove entry"
          onClick={onRemoveItem}
          className="opacity-0 group-hover/item:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={item.bullets.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-0.5 ml-2 mt-1 text-[12.5px]">
            {item.bullets.map((b, i) => (
              <SortableBullet
                key={b.id}
                bullet={b}
                onChange={(text) =>
                  setBullets(item.bullets.map((x) => (x.id === b.id ? { ...x, text } : x)))
                }
                onRemove={() => setBullets(item.bullets.filter((x) => x.id !== b.id))}
                onAddBelow={() => {
                  const next = [...item.bullets];
                  next.splice(i + 1, 0, { id: newId("bul"), text: "" });
                  setBullets(next);
                }}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setBullets([...item.bullets, { id: newId("bul"), text: "" }])}
        className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-accent"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add bullet
      </Button>
    </div>
  );
}

/* ───────── Main canvas ───────── */
export function ResumeCanvas({ resume, onChange, keywords }: ResumeCanvasProps) {
  const setSection = (sectionId: string, mut: (s: ResumeSection) => ResumeSection) =>
    onChange({
      ...resume,
      sections: resume.sections.map((s) => (s.id === sectionId ? mut(s) : s)),
    });

  const removeSection = (sectionId: string) =>
    onChange({ ...resume, sections: resume.sections.filter((s) => s.id !== sectionId) });

  const isVisible = (key: ResumeSectionKey) => resume.visibility[key] !== false;

  return (
    <div
      className={cn(
        "bg-white text-black mx-auto shadow-lg rounded-sm",
        "px-12 py-10",
      )}
      style={{
        // Approximate US Letter at ~72dpi for the on-screen preview
        width: "min(100%, 8.5in)",
        minHeight: "11in",
        fontFamily: "'Calibri', 'Helvetica Neue', Arial, sans-serif",
        color: "#000",
        // CSS variable used by .resume-keyword-highlight rules in index.css
        ["--rk-keywords" as any]: keywords.join("|"),
      }}
      data-resume-canvas
    >
      {/* Header */}
      <div className="text-center pb-3 border-b border-black/80">
        <div
          className="text-[24pt] font-bold leading-tight"
          style={{ color: "#000" }}
        >
          <InlineEditable
            value={resume.header.full_name}
            onChange={(v) => onChange({ ...resume, header: { ...resume.header, full_name: v } })}
            placeholder="Full Name"
            ariaLabel="Full Name"
            className="text-center"
          />
        </div>
        <div className="text-[10pt] text-black/80 mt-1">
          <InlineEditable
            value={resume.header.contact_line}
            onChange={(v) => onChange({ ...resume, header: { ...resume.header, contact_line: v } })}
            placeholder="email • phone • city • linkedin"
            ariaLabel="Contact line"
            className="text-center"
          />
        </div>
      </div>

      {/* Summary */}
      {isVisible("summary") && (
        <SectionWrap
          title="Summary"
          onHide={() =>
            onChange({ ...resume, visibility: { ...resume.visibility, summary: false } })
          }
        >
          <div className="text-[10.5pt] leading-relaxed">
            <RichTextEditor
              value={resume.summary}
              onChange={(html) => onChange({ ...resume, summary: html })}
              placeholder="Write a tailored 3–5 sentence summary…"
              minHeight={48}
            />
          </div>
        </SectionWrap>
      )}

      {/* Skills */}
      {isVisible("skills") && (
        <SectionWrap
          title="Skills"
          onHide={() =>
            onChange({ ...resume, visibility: { ...resume.visibility, skills: false } })
          }
        >
          <SkillsEditor
            skills={resume.skills}
            onChange={(skills) => onChange({ ...resume, skills })}
          />
        </SectionWrap>
      )}

      {/* Other sections */}
      {resume.sections.map((section) => {
        const k = section.key as ResumeSectionKey;
        if (k in resume.visibility && !resume.visibility[k]) return null;
        if (!section.visible) return null;
        return (
          <SectionWrap
            key={section.id}
            title={section.title}
            onTitleChange={(t) => setSection(section.id, (s) => ({ ...s, title: t }))}
            onHide={() => {
              if (k in resume.visibility) {
                onChange({ ...resume, visibility: { ...resume.visibility, [k]: false } });
              } else {
                setSection(section.id, (s) => ({ ...s, visible: false }));
              }
            }}
            onDelete={() => removeSection(section.id)}
          >
            {section.items.map((item) => (
              <ItemBlock
                key={item.id}
                item={item}
                onItemChange={(next) =>
                  setSection(section.id, (s) => ({
                    ...s,
                    items: s.items.map((x) => (x.id === next.id ? next : x)),
                  }))
                }
                onRemoveItem={() =>
                  setSection(section.id, (s) => ({
                    ...s,
                    items: s.items.filter((x) => x.id !== item.id),
                  }))
                }
              />
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setSection(section.id, (s) => ({
                  ...s,
                  items: [
                    ...s.items,
                    {
                      id: newId("item"),
                      heading: "",
                      subheading: "",
                      date: "",
                      bullets: [{ id: newId("bul"), text: "" }],
                    },
                  ],
                }))
              }
              className="h-7 px-2 text-[11px] text-black/60 hover:text-black"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add entry
            </Button>
          </SectionWrap>
        );
      })}
    </div>
  );
}

function SectionWrap({
  title,
  onTitleChange,
  onHide,
  onDelete,
  children,
}: {
  title: string;
  onTitleChange?: (next: string) => void;
  onHide?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 group/section">
      <div className="flex items-center justify-between border-b border-black/80 pb-1 mb-2">
        {onTitleChange ? (
          <InlineEditable
            value={title}
            onChange={onTitleChange}
            placeholder="Section title"
            className="text-[11pt] font-bold uppercase tracking-[0.12em]"
            ariaLabel="Section title"
          />
        ) : (
          <h2 className="text-[11pt] font-bold uppercase tracking-[0.12em]">{title}</h2>
        )}
        <div className="flex items-center gap-0.5 opacity-0 group-hover/section:opacity-100">
          {onHide && (
            <button
              type="button"
              onClick={onHide}
              aria-label="Hide section"
              className="p-0.5 rounded hover:bg-black/5 text-black/50 hover:text-black"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete section"
              className="p-0.5 rounded hover:bg-destructive/10 text-black/50 hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function SkillsEditor({
  skills,
  onChange,
}: {
  skills: string[];
  onChange: (skills: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[10.5pt]">
      {skills.map((s, i) => (
        <span key={`${s}-${i}`} className="group/skill inline-flex items-center">
          <InlineEditable
            value={s}
            onChange={(v) => {
              const next = [...skills];
              next[i] = v;
              onChange(next);
            }}
            placeholder="Skill"
            className="inline"
            ariaLabel={`Skill ${i + 1}`}
          />
          {i < skills.length - 1 && <span className="mx-1.5 text-black/50">•</span>}
          <button
            type="button"
            aria-label="Remove skill"
            onClick={() => onChange(skills.filter((_, idx) => idx !== i))}
            className="ml-1 opacity-0 group-hover/skill:opacity-100 text-black/40 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => onChange([...skills, "New skill"])}
        className="ml-2 inline-flex items-center gap-1 text-[10.5pt] text-black/50 hover:text-black"
      >
        <Plus className="h-3 w-3" />
        Add skill
      </button>
    </div>
  );
}
