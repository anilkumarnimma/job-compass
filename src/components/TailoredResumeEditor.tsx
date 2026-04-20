import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Loader2,
  Download,
  FileDown,
  FileType,
  ClipboardCopy,
  RefreshCw,
  Target,
  Plus,
  AlertCircle,
  Info,
  Settings2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTailoredResume } from "@/hooks/useTailoredResume";
import { useAtsCheck } from "@/hooks/useAtsCheck";
import { useProfile } from "@/hooks/useProfile";
import {
  EditableResume,
  buildEditableResume,
  extractKeywords,
  newId,
  ResumeSectionKey,
  stripHtml,
} from "@/lib/resumeEditor";
import {
  exportResumeAsPdf,
  exportResumeAsDocx,
  exportResumeAsText,
  copyResumeToClipboard,
} from "@/lib/resumeExport";
import { ResumeCanvas } from "./resume-editor/ResumeCanvas";

interface TailoredResumeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: {
    id: string;
    title: string;
    company: string;
    description?: string;
    skills?: string[];
  } | null;
}

const SECTION_OPTIONS: { key: ResumeSectionKey; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "projects", label: "Projects" },
  { key: "certifications", label: "Certifications" },
];

export function TailoredResumeEditor({ open, onOpenChange, job }: TailoredResumeEditorProps) {
  const { profile } = useProfile();
  const { generate, isGenerating, result, clearResult } = useTailoredResume();
  const { runCheck, isChecking } = useAtsCheck();

  const [resume, setResume] = useState<EditableResume | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [pageInfo, setPageInfo] = useState<{ current: number; total: number }>({ current: 1, total: 1 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const hasResume = !!(profile?.resume_url || profile?.resume_filename);
  const intelligence = profile?.resume_intelligence as any;

  const baseResume = useMemo(() => {
    if (!profile) return null;
    // Build the simplified base structure that the existing tailor-resume edge fn expects
    const compact = (vals: Array<string | null | undefined>) =>
      vals.map((v) => v?.trim()).filter(Boolean) as string[];
    const fullName =
      profile.full_name?.trim() ||
      compact([profile.first_name, profile.last_name]).join(" ") ||
      profile.contact_email ||
      profile.email ||
      "Your Resume";
    const contact = compact([
      profile.contact_email || profile.email,
      profile.phone,
      profile.location || compact([profile.city, profile.state]).join(", "),
      profile.linkedin_url,
      profile.github_url,
      profile.portfolio_url,
    ]);
    const exp = (Array.isArray(profile.work_experience) ? profile.work_experience : []).map((w: any) => ({
      heading: w.title,
      subheading: w.company,
      date: compact([w.start_date, w.end_date || (w.is_current ? "Present" : "")]).join(" - "),
      bullets: [],
    }));
    const edu = (Array.isArray(profile.education) ? profile.education : []).map((e: any) => ({
      heading: e.degree || e.school,
      subheading: e.school,
      date: e.graduation_year || undefined,
      bullets: e.major ? [`Field of Study: ${e.major}`] : [],
    }));
    const cert = (Array.isArray(profile.certifications) ? profile.certifications : []).map((c: any) => ({
      heading: c.name,
      subheading: c.issuer,
      date: c.date_obtained,
      bullets: [],
    }));
    return {
      header: { full_name: fullName, headline: profile.current_title || "", contact_details: contact },
      sections: [
        exp.length ? { title: "Experience", items: exp } : null,
        edu.length ? { title: "Education", items: edu } : null,
        cert.length ? { title: "Certifications", items: cert } : null,
      ].filter(Boolean),
      skills_section: profile.skills || [],
      source_signature: `${profile.updated_at}::${profile.resume_filename || ""}`,
    };
  }, [profile]);

  // When dialog opens with a job + resume, kick off tailoring
  useEffect(() => {
    if (!open || !job || !hasResume || !baseResume) return;
    if (result || isGenerating) return;
    generate({
      job_title: job.title,
      job_description: job.description || "",
      job_skills: job.skills || [],
      resume_intelligence: intelligence,
      base_resume: baseResume as any,
      resume_version: baseResume.source_signature,
      regeneration_round: 1,
    });
  }, [open, job?.id, hasResume, baseResume, result, isGenerating, generate, intelligence]);

  // Hydrate the editable resume once tailoring returns
  useEffect(() => {
    if (!result) return;
    setResume(buildEditableResume(result, profile));
  }, [result, profile]);

  // Initial ATS match score when the dialog opens / job changes
  useEffect(() => {
    if (!open || !job || matchScore != null || isChecking || !profile) return;
    runCheck({
      job_title: job.title,
      job_description: job.description || "",
      job_skills: job.skills || [],
      formProfile: {
        skills: profile.skills,
        current_title: profile.current_title,
        current_company: profile.current_company,
        experience_years: profile.experience_years,
        work_experience: profile.work_experience as any,
        education: profile.education as any,
        certifications: profile.certifications as any,
      },
    }).then((res) => {
      if (res) setMatchScore(res.overall_score);
    });
  }, [open, job?.id, matchScore, isChecking, profile, runCheck]);

  // Live debounced match-score recompute as the user edits the resume.
  // Debounced at 1s so it does not fire on every keystroke.
  const isFirstResumeRef = useRef(true);
  useEffect(() => {
    if (!open || !job || !resume || !profile) return;
    // Skip the very first hydration — initial score comes from the effect above.
    if (isFirstResumeRef.current) {
      isFirstResumeRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      // Build a synthetic profile snapshot from the live edits so the score
      // reflects what's actually on the canvas.
      const flatBullets = (resume.sections || [])
        .filter((s) => {
          const k = s.key as ResumeSectionKey;
          if (k in resume.visibility && !resume.visibility[k]) return false;
          return s.visible !== false;
        })
        .flatMap((s) =>
          s.items.map((it) => ({
            title: it.heading,
            company: it.subheading,
            description: it.bullets.map((b) => stripHtml(b.text).trim()).filter(Boolean).join("\n"),
          })),
        );
      runCheck({
        job_title: job.title,
        job_description: job.description || "",
        job_skills: job.skills || [],
        formProfile: {
          skills: resume.visibility.skills ? resume.skills : [],
          current_title: profile.current_title,
          current_company: profile.current_company,
          experience_years: profile.experience_years,
          work_experience: flatBullets,
          education: profile.education as any,
          certifications: profile.certifications as any,
        },
      }).then((res) => {
        if (res) setMatchScore(res.overall_score);
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [resume, open, job?.id, profile, runCheck]);

  // Reset on close / job change
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        clearResult();
        setResume(null);
        setMatchScore(null);
        isFirstResumeRef.current = true;
      }, 300);
    }
  }, [open, clearResult]);

  useEffect(() => {
    setMatchScore(null);
    setResume(null);
    clearResult();
    isFirstResumeRef.current = true;
  }, [job?.id, clearResult]);

  // Measure pages by checking the rendered canvas height vs 11in.
  useEffect(() => {
    if (!resume) return;
    const el = canvasContainerRef.current?.querySelector("[data-resume-canvas]") as HTMLElement | null;
    if (!el) return;
    const measure = () => {
      const heightPx = el.scrollHeight;
      // 11 inches at on-screen size — the canvas width is set to min(100%, 8.5in)
      // so 1in ≈ canvasWidth/8.5
      const widthPx = el.getBoundingClientRect().width;
      const pxPerIn = widthPx / 8.5;
      const pages = Math.max(1, Math.ceil(heightPx / (pxPerIn * 11)));
      setPageInfo({ current: 1, total: pages });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [resume]);

  const keywords = useMemo(
    () => extractKeywords(job?.description || "", job?.skills || []),
    [job?.description, job?.skills],
  );

  const handleRegenerate = () => {
    if (!job || !baseResume) return;
    clearResult();
    setResume(null);
    generate({
      job_title: job.title,
      job_description: job.description || "",
      job_skills: job.skills || [],
      resume_intelligence: intelligence,
      base_resume: baseResume as any,
      resume_version: `${baseResume.source_signature}::${Date.now()}`,
      regeneration_round: 2,
    });
  };

  const handleDownload = (format: "pdf" | "docx" | "txt") => {
    if (!resume || !job) return;
    if (format === "pdf") exportResumeAsPdf(resume, job.title, job.company);
    else if (format === "docx") exportResumeAsDocx(resume, job.title, job.company).catch(() =>
      toast({ title: "Download failed", description: "Could not generate Word file.", variant: "destructive" }),
    );
    else exportResumeAsText(resume, job.title, job.company);
  };

  const handleCopy = async () => {
    if (!resume) return;
    const ok = await copyResumeToClipboard(resume);
    toast({
      title: ok ? "Copied to clipboard" : "Copy failed",
      description: ok ? "Plain text resume is on your clipboard." : "Please try again.",
      variant: ok ? "default" : "destructive",
    });
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] max-w-[96vw] max-h-[94vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 py-3 border-b border-border/60 shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center">
                <Target className="h-4 w-4 text-foreground/70" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-semibold truncate">
                  Tailored Resume — {job.title}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground truncate">{job.company}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {matchScore != null && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors"
                  style={{
                    backgroundColor: "hsl(174 72% 56% / 0.12)",
                    color: "hsl(174 72% 28%)",
                    borderColor: "hsl(174 72% 56% / 0.35)",
                  }}
                  title="Live ATS match score — updates as you edit"
                >
                  {isChecking && (
                    <Loader2 className="h-3 w-3 animate-spin opacity-70" />
                  )}
                  <span>Match score:</span>
                  <span className="font-bold tabular-nums">{matchScore}%</span>
                </span>
              )}
              {resume && (
                <SectionVisibilityMenu resume={resume} setResume={setResume} />
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleRegenerate}
                disabled={isGenerating || !hasResume}
                className="h-8 rounded-lg"
              >
                {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                Re-tailor
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" disabled={!resume} className="h-8 rounded-lg">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleDownload("pdf")}>
                    <FileDown className="h-4 w-4 mr-2" /> Download as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("docx")}>
                    <FileType className="h-4 w-4 mr-2" /> Download as Word (.docx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopy}>
                    <ClipboardCopy className="h-4 w-4 mr-2" /> Copy as plain text
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogHeader>

        <div
          ref={canvasContainerRef}
          className="flex-1 min-h-0 overflow-y-auto bg-muted/30 p-6"
        >
          {!hasResume ? (
            <EmptyState
              icon={<AlertCircle className="h-10 w-10 text-muted-foreground/60" />}
              title="No resume on file"
              body="Upload your resume in Profile Settings to get started."
            />
          ) : isGenerating && !resume ? (
            <EmptyState
              icon={<Loader2 className="h-10 w-10 text-accent animate-spin" />}
              title="Tailoring your resume…"
              body="Aligning keywords and matching this role's requirements."
            />
          ) : !resume ? (
            <EmptyState
              icon={<Loader2 className="h-10 w-10 text-accent animate-spin" />}
              title="Preparing editor…"
              body=""
            />
          ) : (
            <ResumeCanvas
              resume={resume}
              onChange={setResume}
              keywords={keywords}
            />
          )}
        </div>

        {/* Page indicator */}
        <div className="px-5 py-2 border-t border-border/60 bg-background flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
          <div className="flex items-center gap-2">
            <span>
              Page {pageInfo.current} of {pageInfo.total}
            </span>
            {pageInfo.total > 2 && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <Info className="h-3 w-3" />
                      Tip
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Tip — recruiters prefer resumes under 2 pages.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <span className="text-muted-foreground/70">
            Click any text to edit. Drag bullets to reorder. Black & white only.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-white rounded-md border border-border/60 mx-auto max-w-2xl px-10 py-16 text-center flex flex-col items-center gap-3">
      {icon}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {body && <p className="text-xs text-muted-foreground max-w-sm">{body}</p>}
    </div>
  );
}

function SectionVisibilityMenu({
  resume,
  setResume,
}: {
  resume: EditableResume;
  setResume: (r: EditableResume) => void;
}) {
  const sectionExists = (key: ResumeSectionKey) => {
    if (key === "summary" || key === "skills") return true;
    return resume.sections.some((s) => s.key === key);
  };

  const addSection = (key: ResumeSectionKey, label: string) => {
    if (sectionExists(key)) {
      setResume({ ...resume, visibility: { ...resume.visibility, [key]: true } });
      return;
    }
    setResume({
      ...resume,
      sections: [
        ...resume.sections,
        {
          id: newId("sec"),
          key,
          title: label,
          visible: true,
          items: [
            {
              id: newId("item"),
              heading: "",
              subheading: "",
              date: "",
              bullets: [{ id: newId("bul"), text: "" }],
            },
          ],
        },
      ],
      visibility: { ...resume.visibility, [key]: true },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 rounded-lg">
          <Settings2 className="h-3.5 w-3.5 mr-1.5" />
          Sections
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-2">
        <p className="text-[11px] font-medium text-muted-foreground px-2 pb-1.5">Show / hide sections</p>
        {SECTION_OPTIONS.map((opt) => {
          const visible = resume.visibility[opt.key] !== false;
          const exists = sectionExists(opt.key);
          return (
            <div
              key={opt.key}
              className="flex items-center justify-between py-1.5 px-2 hover:bg-accent/5 rounded text-sm"
            >
              <span className="text-foreground">{opt.label}</span>
              {exists ? (
                <Switch
                  checked={visible}
                  onCheckedChange={(v) =>
                    setResume({ ...resume, visibility: { ...resume.visibility, [opt.key]: v } })
                  }
                />
              ) : (
                <button
                  type="button"
                  className="text-[11px] text-accent hover:underline inline-flex items-center gap-0.5"
                  onClick={() => addSection(opt.key, opt.label)}
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              )}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
