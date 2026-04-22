import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
  Target,
  AlertCircle,
  Info,
  Sparkles,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTailoredResume } from "@/hooks/useTailoredResume";
import { useResumeStructure } from "@/hooks/useResumeStructure";
import { useAtsCheck } from "@/hooks/useAtsCheck";
import { useProfile } from "@/hooks/useProfile";
import {
  EditableResume,
  buildEditableResume,
  countActiveChanges,
  extractKeywords,
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

export function TailoredResumeEditor({ open, onOpenChange, job }: TailoredResumeEditorProps) {
  const { profile } = useProfile();
  const { generate, isGenerating, result, clearResult } = useTailoredResume();
  const { runCheck, isChecking } = useAtsCheck();
  const {
    structure,
    isLoading: isLoadingStructure,
    error: structureError,
    load: loadStructure,
    reset: resetStructure,
  } = useResumeStructure();

  const [resume, setResume] = useState<EditableResume | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [pageInfo, setPageInfo] = useState<{ current: number; total: number }>({ current: 1, total: 1 });
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const hasResume = !!(profile?.resume_url || profile?.resume_filename);
  const resumeVersion = `${profile?.updated_at || ""}::${profile?.resume_filename || ""}`;

  /* 1) Load the structured resume from the user's uploaded file */
  useEffect(() => {
    if (!open || !hasResume || !profile?.resume_url) return;
    if (structure || isLoadingStructure) return;
    loadStructure({
      resume_path: profile.resume_url,
      filename: profile.resume_filename || undefined,
      cache_key: `${resumeVersion}`,
    });
  }, [open, hasResume, profile?.resume_url, profile?.resume_filename, structure, isLoadingStructure, loadStructure, resumeVersion]);

  /* 2) Once we have the structure + a job, kick off tailoring */
  useEffect(() => {
    if (!open || !job || !structure) return;
    if (result || isGenerating) return;
    generate({
      job_title: job.title,
      job_description: job.description || "",
      job_skills: job.skills || [],
      resume_structure: structure,
      cache_key: `${job.id}::${resumeVersion}`,
    });
  }, [open, job, structure, result, isGenerating, generate, resumeVersion]);

  /* 3) Hydrate the editable resume */
  useEffect(() => {
    if (!structure) return;
    setResume(buildEditableResume(structure, result, profile));
  }, [structure, result, profile]);

  /* 4) Initial ATS match score */
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
  }, [open, job, matchScore, isChecking, profile, runCheck]);

  /* 5) Live debounced match-score recompute */
  const isFirstResumeRef = useRef(true);
  useEffect(() => {
    if (!open || !job || !resume || !profile) return;
    if (isFirstResumeRef.current) {
      isFirstResumeRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const flatBullets = resume.sections
        .filter((s) => s.visible)
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
  }, [resume, open, job, profile, runCheck]);

  /* 6) Reset on close / job change */
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        clearResult();
        resetStructure();
        setResume(null);
        setMatchScore(null);
        isFirstResumeRef.current = true;
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open, clearResult, resetStructure]);

  useEffect(() => {
    setMatchScore(null);
    setResume(null);
    clearResult();
    isFirstResumeRef.current = true;
  }, [job?.id, clearResult]);

  /* 7) Page count by canvas height */
  useEffect(() => {
    if (!resume) return;
    const el = canvasContainerRef.current?.querySelector("[data-resume-canvas]") as HTMLElement | null;
    if (!el) return;
    const measure = () => {
      const heightPx = el.scrollHeight;
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

  const changesCount = useMemo(() => countActiveChanges(resume), [resume]);

  const handleDownload = (format: "pdf" | "docx" | "txt") => {
    if (!resume || !job) return;
    if (format === "pdf") exportResumeAsPdf(resume, job.title, job.company);
    else if (format === "docx")
      exportResumeAsDocx(resume, job.title, job.company).catch(() =>
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

  const handleRegenerate = async () => {
    if (!job || !structure) return;
    setConfirmRegenerate(false);
    setResume(null);
    clearResult();
    setMatchScore(null);
    isFirstResumeRef.current = true;
    await generate({
      job_title: job.title,
      job_description: job.description || "",
      job_skills: job.skills || [],
      resume_structure: structure,
      cache_key: `${job.id}::${resumeVersion}`,
      force: true,
    });
  };

  if (!job) return null;

  const isWorking = isLoadingStructure || isGenerating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] max-w-[96vw] max-h-[94vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 py-3 border-b border-border/60 shrink-0 bg-background sticky top-0 z-20">
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
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border"
                  style={{
                    backgroundColor: "hsl(174 72% 56% / 0.12)",
                    color: "hsl(174 72% 28%)",
                    borderColor: "hsl(174 72% 56% / 0.35)",
                  }}
                  title="Live ATS match score — updates as you edit"
                >
                  {isChecking && <Loader2 className="h-3 w-3 animate-spin opacity-70" />}
                  <span>Match score:</span>
                  <span className="font-bold tabular-nums">{matchScore}%</span>
                </span>
              )}

              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!resume || isGenerating || isLoadingStructure}
                      onClick={() => setConfirmRegenerate(true)}
                      className="h-8 rounded-lg"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Regenerate
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Ask the AI for a fresh tailored version
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

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

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 rounded-lg"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Changes banner */}
          {resume && changesCount > 0 && (
            <div
              className="mt-2 inline-flex items-center gap-1.5 self-start rounded-md px-2.5 py-1 text-[11px] font-medium"
              style={{
                backgroundColor: "hsl(174 72% 56% / 0.10)",
                color: "hsl(174 72% 28%)",
              }}
            >
              <Sparkles className="h-3 w-3" />
              {changesCount} change{changesCount === 1 ? "" : "s"} made to match this role
            </div>
          )}
        </DialogHeader>

        <div
          ref={canvasContainerRef}
          className="flex-1 min-h-0 overflow-y-auto p-6"
          style={{ backgroundColor: "#f5f5f5" }}
        >
          {!hasResume ? (
            <EmptyState
              icon={<AlertCircle className="h-10 w-10 text-muted-foreground/60" />}
              title="No resume on file"
              body="Upload your resume in Profile Settings to get started."
            />
          ) : structureError ? (
            <EmptyState
              icon={<AlertCircle className="h-10 w-10 text-destructive/70" />}
              title="Could not load your resume"
              body={structureError}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    resetStructure();
                    if (profile?.resume_url) {
                      loadStructure({
                        resume_path: profile.resume_url,
                        filename: profile.resume_filename || undefined,
                        cache_key: `${resumeVersion}::retry-${Date.now()}`,
                      });
                    }
                  }}
                  className="mt-2"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  Try again
                </Button>
              }
            />
          ) : isWorking && !resume ? (
            <EmptyState
              icon={<Loader2 className="h-10 w-10 text-accent animate-spin" />}
              title={isLoadingStructure ? "Reading your resume…" : "Tailoring for this role…"}
              body={
                isLoadingStructure
                  ? "Preserving your sections, structure, and bullet points exactly."
                  : "Only the wording is being adjusted — your structure stays the same."
              }
            />
          ) : !resume ? (
            <EmptyState
              icon={<Loader2 className="h-10 w-10 text-accent animate-spin" />}
              title="Preparing editor…"
              body=""
            />
          ) : (
            <ResumeCanvas resume={resume} onChange={setResume} keywords={keywords} />
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
            Read-only preview. Use Download to get PDF or Word.
          </span>
        </div>
      </DialogContent>

      <AlertDialog open={confirmRegenerate} onOpenChange={setConfirmRegenerate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate tailored resume?</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard any manual edits you've made and ask the AI for a fresh
              tailored version for this role. Your original resume on file is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
