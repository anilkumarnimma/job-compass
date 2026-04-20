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
import { cn } from "@/lib/utils";
import {
  EditableResume,
  ResumeBullet,
  ResumeItem,
  ResumeSection,
  newId,
} from "@/lib/resumeEditor";
import { InlineEditable } from "./InlineEditable";
import { RichTextEditor } from "./RichTextEditor";

interface ResumeCanvasProps {
  resume: EditableResume;
  onChange: (next: EditableResume) => void;
  /** Lower-cased keywords highlighted inside TipTap editors (preview-only). */
  keywords: string[];
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
  bullet: ResumeBullet;
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

  const stillChanged =
    !!bullet.changed &&
    !!bullet.original &&
    bullet.text.trim() !== bullet.original.trim();

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-1.5 -ml-2 pl-2 rounded hover:bg-black/[0.02]"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag bullet"
        className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing mt-1 text-black"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className="mt-1.5 leading-none text-black font-bold">•</span>
      <div
        className={cn(
          "flex-1 min-w-0 rounded px-1 -mx-1 transition-colors",
          stillChanged && "resume-changed-bullet",
        )}
        title={stillChanged && bullet.original ? `Original: ${bullet.original}` : undefined}
      >
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
          className="mt-0.5 p-0.5 rounded text-black hover:text-destructive hover:bg-destructive/10"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Add bullet below"
          onClick={onAddBelow}
          className="mt-0.5 p-0.5 rounded text-black"
          style={{ transition: "background-color 120ms" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e0faf5")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

/* ───────── Item ───────── */
function ItemBlock({
  item,
  onItemChange,
  onRemoveItem,
  keywords,
}: {
  item: ResumeItem;
  onItemChange: (next: ResumeItem) => void;
  onRemoveItem: () => void;
  keywords?: string[];
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const setBullets = (bullets: ResumeBullet[]) => onItemChange({ ...item, bullets });

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
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <InlineEditable
              value={item.heading}
              onChange={(v) => onItemChange({ ...item, heading: v })}
              placeholder="Job title"
              className="text-[13px] font-semibold text-black"
              ariaLabel="Heading"
            />
            {item.subheading !== undefined && (
              <>
                <span className="text-black text-xs">—</span>
                <InlineEditable
                  value={item.subheading || ""}
                  onChange={(v) => onItemChange({ ...item, subheading: v })}
                  placeholder="Company"
                  className="text-[13px] text-black"
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
          className="text-[11px] text-black whitespace-nowrap"
          ariaLabel="Dates"
        />
        <button
          type="button"
          aria-label="Remove entry"
          onClick={onRemoveItem}
          className="opacity-0 group-hover/item:opacity-100 p-0.5 rounded text-black hover:text-destructive hover:bg-destructive/10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={item.bullets.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-0.5 ml-4 mt-1 text-[12.5px] text-black">
            {item.bullets.map((b, i) => (
              <SortableBullet
                key={b.id}
                bullet={b}
                keywords={keywords}
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

      <button
        type="button"
        onClick={() => setBullets([...item.bullets, { id: newId("bul"), text: "" }])}
        className="resume-add-btn inline-flex items-center gap-1 mt-1 ml-4 px-1.5 py-0.5 rounded text-[11px] font-medium"
      >
        <Plus className="h-3 w-3" />
        Add bullet
      </button>
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

  // Highlight summary as "changed" only while it still matches the AI rewrite.
  const summaryStillChanged =
    !!resume.summary_changed &&
    !!resume.summary_original &&
    resume.summary.trim() !== (resume.summary_original || "").trim();

  return (
    <div
      className="bg-white mx-auto rounded-sm px-12 py-10"
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
      <div className="text-center pb-3 border-b-2 border-black">
        <div className="text-[24pt] font-bold leading-tight text-black">
          <InlineEditable
            value={resume.header.full_name}
            onChange={(v) => onChange({ ...resume, header: { ...resume.header, full_name: v } })}
            placeholder="Full Name"
            ariaLabel="Full Name"
            className="text-center text-black"
          />
        </div>
        <div className="text-[10pt] mt-1 text-black">
          <InlineEditable
            value={resume.header.contact_line}
            onChange={(v) => onChange({ ...resume, header: { ...resume.header, contact_line: v } })}
            placeholder="email • phone • city • linkedin"
            ariaLabel="Contact line"
            className="text-center text-black"
            multiline
          />
        </div>
      </div>

      {/* Summary — always rendered; dimmed/struck when hidden */}
      <SectionWrap
        title="Summary"
        hidden={!resume.visibility.summary}
        onToggleHidden={() =>
          onChange({
            ...resume,
            visibility: { ...resume.visibility, summary: !resume.visibility.summary },
          })
        }
      >
        <div
          className={cn(
            "text-[10.5pt] leading-relaxed rounded px-1 -mx-1 transition-colors text-black",
            summaryStillChanged && "resume-changed-bullet",
          )}
          title={summaryStillChanged ? `Original: ${resume.summary_original}` : undefined}
        >
          <RichTextEditor
            value={resume.summary}
            onChange={(html) => onChange({ ...resume, summary: html })}
            placeholder="Tailored summary…"
            minHeight={48}
            keywords={keywords}
          />
        </div>
      </SectionWrap>

      {/* Skills — always rendered; dimmed/struck when hidden */}
      <SectionWrap
        title="Skills"
        hidden={!resume.visibility.skills}
        onToggleHidden={() =>
          onChange({
            ...resume,
            visibility: { ...resume.visibility, skills: !resume.visibility.skills },
          })
        }
      >
        <SkillsEditor
          skills={resume.skills}
          onChange={(skills) => onChange({ ...resume, skills })}
        />
      </SectionWrap>

      {/* Other sections — preserved in the user's original order */}
      {resume.sections.map((section) => (
        <SectionWrap
          key={section.id}
          title={section.title}
          hidden={!section.visible}
          onTitleChange={(t) => setSection(section.id, (s) => ({ ...s, title: t }))}
          onToggleHidden={() =>
            setSection(section.id, (s) => ({ ...s, visible: !s.visible }))
          }
        >
          {section.items.map((item) => (
            <ItemBlock
              key={item.id}
              item={item}
              keywords={keywords}
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
          <button
            type="button"
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
            className="resume-add-btn inline-flex items-center gap-1 mt-1 px-2 py-1 rounded text-[11px] font-medium"
          >
            <Plus className="h-3 w-3" />
            Add entry
          </button>
        </SectionWrap>
      ))}
    </div>
  );
}

function SectionWrap({
  title,
  onTitleChange,
  hidden,
  onToggleHidden,
  children,
}: {
  title: string;
  onTitleChange?: (next: string) => void;
  hidden?: boolean;
  onToggleHidden?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "mt-5 group/section",
        hidden && "resume-hidden-item",
      )}
      title={hidden ? "Hidden from PDF — click eye to show" : undefined}
    >
      <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-2">
        {onTitleChange ? (
          <InlineEditable
            value={title}
            onChange={onTitleChange}
            placeholder="Section title"
            className="text-[11pt] font-bold uppercase tracking-[0.12em] text-black"
            ariaLabel="Section title"
          />
        ) : (
          <h2 className="text-[11pt] font-bold uppercase tracking-[0.12em] text-black">
            {title}
          </h2>
        )}
        {onToggleHidden && (
          <button
            type="button"
            onClick={onToggleHidden}
            aria-label={hidden ? "Show in PDF" : "Hide from PDF"}
            title={hidden ? "Show in PDF" : "Hide from PDF (text stays here)"}
            className="opacity-0 group-hover/section:opacity-100 p-1 rounded text-black"
            style={{ transition: "background-color 120ms" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e0faf5")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        )}
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
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 text-[10.5pt] text-black w-full overflow-hidden">
      {skills.map((s, i) => (
        <span
          key={`${s}-${i}`}
          className="group/skill inline-flex items-center max-w-full break-words"
        >
          <InlineEditable
            value={s}
            onChange={(v) => {
              const next = [...skills];
              next[i] = v;
              onChange(next);
            }}
            placeholder="Skill"
            className="inline text-black break-words"
            ariaLabel={`Skill ${i + 1}`}
          />
          {i < skills.length - 1 && <span className="mx-1.5 text-black">•</span>}
          <button
            type="button"
            aria-label="Remove skill"
            onClick={() => onChange(skills.filter((_, idx) => idx !== i))}
            className="ml-1 opacity-0 group-hover/skill:opacity-100 text-black hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => onChange([...skills, "New skill"])}
        className="resume-add-btn ml-2 inline-flex items-center gap-1 text-[10.5pt] px-1.5 py-0.5 rounded font-medium"
      >
        <Plus className="h-3 w-3" />
        Add skill
      </button>
    </div>
  );
}
