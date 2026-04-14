import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTailoredResume, TailoredResumeData } from "@/hooks/useTailoredResume";
import { useProfile, ProfileData } from "@/hooks/useProfile";
import { useAtsCheck } from "@/hooks/useAtsCheck";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";
import {
  Download,
  Loader2,
  Target,
  ArrowUpRight,
  Eye,
  RefreshCw,
  ChevronUp,
  FileDown,
  FileType,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TailoredResumeDialogProps {
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

function compact(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).filter(Boolean) as string[];
}

function buildBaseResume(profile: ProfileData | null | undefined, intelligence: ResumeIntelligence | null) {
  const fullName = profile?.full_name?.trim()
    || compact([profile?.first_name, profile?.last_name]).join(" ")
    || profile?.contact_email
    || profile?.email
    || "Your Resume";

  const contactDetails = compact([
    profile?.contact_email || profile?.email,
    profile?.phone,
    profile?.location || compact([profile?.city, profile?.state, profile?.zip]).join(", "),
    profile?.linkedin_url,
    profile?.github_url,
    profile?.portfolio_url,
  ]);

  const rawExp = profile?.work_experience;
  const experienceItems = (Array.isArray(rawExp) ? rawExp : []).map((item: any) => ({
    heading: item.title,
    subheading: item.company,
    date: compact([item.start_date, item.end_date || (item.is_current ? "Present" : "")]).join(" - "),
    bullets: [],
  }));

  const rawEdu = profile?.education;
  const educationItems = (Array.isArray(rawEdu) ? rawEdu : []).map((item: any) => ({
    heading: item.degree || item.school,
    subheading: item.school,
    date: item.graduation_year || undefined,
    bullets: item.major ? [`Field of Study: ${item.major}`] : [],
  }));

  const rawCert = profile?.certifications;
  const certificationItems = (Array.isArray(rawCert) ? rawCert : []).map((item: any) => ({
    heading: item.name,
    subheading: item.issuer || undefined,
    date: compact([item.date_obtained, item.expiration_date ? `Expires ${item.expiration_date}` : ""]).join(" • ") || undefined,
    bullets: [],
  }));

  const sections = [
    experienceItems.length ? { title: "Experience", items: experienceItems } : null,
    educationItems.length ? { title: "Education", items: educationItems } : null,
    certificationItems.length ? { title: "Certifications", items: certificationItems } : null,
  ].filter(Boolean);

  return {
    header: {
      full_name: fullName,
      headline: compact([profile?.current_title, profile?.current_company]).join(" • ") || intelligence?.primaryRole,
      contact_details: contactDetails,
    },
    summary: undefined,
    sections,
    skills_section: profile?.skills || [],
    source_signature:
      [
        profile?.resume_filename,
        profile?.updated_at || "",
        profile?.contact_email || profile?.email,
        JSON.stringify(profile?.work_experience || []),
        JSON.stringify(profile?.education || []),
        JSON.stringify(profile?.skills || []),
      ].join("::") || profile?.email || "resume",
  };
}

function ResumePreview({ data }: { data: TailoredResumeData }) {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-2xl font-display font-semibold tracking-tight text-foreground break-words">
            {data.header.full_name}
          </h2>
          {data.header.headline && (
            <p className="text-sm font-medium text-muted-foreground mt-1">{data.header.headline}</p>
          )}
        </div>
        {data.header.contact_details.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {data.header.contact_details.map((detail, index) => (
              <span key={`${detail}-${index}`} className="inline-flex items-center gap-2">
                {index > 0 && <span className="text-border">•</span>}
                <span className="break-all">{detail}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {data.summary && <p className="text-sm text-muted-foreground italic leading-relaxed">{data.summary}</p>}

      {data.skills_section.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground border-b border-border pb-1 mb-3">
            Skills
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {data.skills_section.map((skill, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal px-2.5 py-1 rounded-full bg-chip-bg text-foreground border-0">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {data.sections.map((section, si) => (
        <div key={si}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground border-b border-border pb-1 mb-3">
            {section.title}
          </h3>
          <div className="space-y-3">
            {section.items.map((item, ii) => (
              <div key={ii}>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground">{item.heading}</span>
                    {item.subheading && (
                      <span className="text-sm text-muted-foreground"> — {item.subheading}</span>
                    )}
                  </div>
                  {item.date && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{item.date}</span>
                  )}
                </div>
                {item.bullets && item.bullets.length > 0 && (
                  <ul className="mt-1 space-y-0.5 ml-4">
                    {item.bullets.map((b, bi) => (
                      <li key={bi} className="text-sm text-foreground/85 list-disc">{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {data.keywords_added.length > 0 && (
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-medium text-accent">ATS Keywords Added</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {data.keywords_added.map((kw, i) => (
              <Badge key={i} className="bg-accent/10 text-accent border-accent/20 text-[10px] px-2 py-0.5 rounded-full">
                {kw}
              </Badge>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 italic">{data.optimization_notes}</p>
        </div>
      )}
    </div>
  );
}

/* ── Score comparison hero ── */
function ScoreHero({
  oldScore,
  newScore,
  isLoading,
  scoreHistory,
  roundCount,
}: {
  oldScore: number | null;
  newScore: number | null;
  isLoading: boolean;
  scoreHistory: number[];
  roundCount: number;
}) {
  const improvement = oldScore != null && newScore != null ? newScore - oldScore : null;
  const displayOld = oldScore ?? 0;
  const displayNew = newScore ?? 0;

  return (
    <div className="rounded-xl bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border border-accent/20 p-5">
      {/* Score numbers */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Original</p>
          <span className="text-3xl font-bold text-muted-foreground/70 tabular-nums">
            {isLoading && oldScore == null ? "—" : `${displayOld}%`}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5 px-3">
          {improvement != null && improvement > 0 ? (
            <ArrowUpRight className="h-5 w-5 text-success" />
          ) : (
            <ArrowUpRight className="h-5 w-5 text-muted-foreground/40" />
          )}
        </div>

        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-accent font-medium mb-1">Current Best</p>
          <span className="text-3xl font-bold text-accent tabular-nums">
            {isLoading ? (
              <Loader2 className="h-7 w-7 animate-spin inline" />
            ) : (
              `${displayNew}%`
            )}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative mb-2">
        <Progress value={isLoading ? 0 : displayNew} className="h-2.5 bg-muted/50" />
        {!isLoading && oldScore != null && (
          <div
            className="absolute top-0 h-2.5 border-r-2 border-dashed border-muted-foreground/40"
            style={{ left: `${Math.min(displayOld, 100)}%` }}
            title={`Original: ${displayOld}%`}
          />
        )}
      </div>

      {/* Improvement text */}
      {!isLoading && improvement != null && (
        <p className="text-center text-sm font-medium text-foreground">
          {improvement > 0 ? (
            <>
              <ChevronUp className="inline h-4 w-4 text-success -mt-0.5" />
              <span className="text-success">+{improvement} points</span>{" "}
              {roundCount > 1 ? `across ${roundCount} round${roundCount > 1 ? "s" : ""}` : "for this job"}
            </>
          ) : improvement === 0 ? (
            "Your resume is already well-optimized for this job"
          ) : (
            "Score recalculated for this version"
          )}
        </p>
      )}


      {isLoading && (
        <p className="text-center text-xs text-muted-foreground animate-pulse">
          Calculating ATS compatibility…
        </p>
      )}
    </div>
  );
}

type PopupView = "score" | "preview";

const MAX_ROUNDS = 6;
const MAX_SCORE = 95;

/** Convert a TailoredResumeData back into a base_resume shape for progressive regeneration */
function resultToBaseResume(result: TailoredResumeData) {
  return {
    header: result.header,
    summary: result.summary,
    sections: result.sections,
    skills_section: result.skills_section,
    source_signature: undefined,
  };
}

/** Extract a formProfile from tailored result for ATS scoring */
function resultToFormProfile(result: TailoredResumeData, profile: ProfileData | null | undefined) {
  return {
    skills: result.skills_section,
    current_title: result.header.headline || profile?.current_title || null,
    current_company: profile?.current_company || null,
    experience_years: profile?.experience_years || null,
    work_experience: result.sections
      .find((s) => s.title.toLowerCase().includes("experience"))
      ?.items.map((it) => ({
        title: it.heading,
        company: it.subheading,
        start_date: it.date?.split(" - ")[0],
        end_date: it.date?.split(" - ")[1],
        bullets: it.bullets,
      })) || profile?.work_experience || null,
    education: result.sections
      .find((s) => s.title.toLowerCase().includes("education"))
      ?.items.map((it) => ({
        degree: it.heading,
        school: it.subheading,
        graduation_year: it.date,
        major: it.bullets?.[0]?.replace("Field of Study: ", ""),
      })) || profile?.education || null,
    certifications: result.sections
      .find((s) => s.title.toLowerCase().includes("certif"))
      ?.items.map((it) => ({
        name: it.heading,
        issuer: it.subheading,
      })) || profile?.certifications || null,
  };
}

/** Build a formProfile from the raw user profile (for consistent baseline scoring) */
function profileToFormProfile(profile: ProfileData | null | undefined) {
  return {
    skills: profile?.skills || [],
    current_title: profile?.current_title || null,
    current_company: profile?.current_company || null,
    experience_years: profile?.experience_years || null,
    work_experience: profile?.work_experience || null,
    education: profile?.education || null,
    certifications: profile?.certifications || null,
  };
}

export function TailoredResumeDialog({ open, onOpenChange, job }: TailoredResumeDialogProps) {
  const { generate, isGenerating, result, clearResult, downloadAsPdf, downloadAsDoc } = useTailoredResume();
  const { runCheck, isChecking } = useAtsCheck();
  const { profile } = useProfile();
  const intelligence = profile?.resume_intelligence as ResumeIntelligence | null;

  const [oldScore, setOldScore] = useState<number | null>(null);
  const [newScore, setNewScore] = useState<number | null>(null);
  const [scoringNew, setScoringNew] = useState(false);
  const [view, setView] = useState<PopupView>("score");
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Progressive regeneration state
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);
  const [roundCount, setRoundCount] = useState(0);
  const [bestResult, setBestResult] = useState<TailoredResumeData | null>(null);
  const [bestScore, setBestScore] = useState<number>(0);
  const [isMaxed, setIsMaxed] = useState(false);

  const baseResume = useMemo(() => buildBaseResume(profile, intelligence), [profile, intelligence]);

  // Reset state when job changes
  useEffect(() => {
    clearResult();
    setOldScore(null);
    setNewScore(null);
    setView("score");
    setIsRegenerating(false);
    setScoreHistory([]);
    setRoundCount(0);
    setBestResult(null);
    setBestScore(0);
    setIsMaxed(false);
  }, [job?.id, baseResume.source_signature, clearResult]);

  // Kick off generation + old ATS score when dialog opens
  useEffect(() => {
    if (open && job && !result && !isGenerating && roundCount === 0) {
      generate({
        job_title: job.title,
        job_description: job.description || "",
        job_skills: job.skills || [],
        resume_intelligence: intelligence,
        base_resume: baseResume,
        resume_version: baseResume.source_signature,
        regeneration_round: 1,
      });

      // Get old score using the SAME formProfile approach for consistency
      if (oldScore == null) {
        runCheck({
          job_description: job.description || "",
          job_title: job.title,
          job_skills: job.skills || [],
          formProfile: profileToFormProfile(profile),
        }).then((res) => {
          if (res) {
            setOldScore(res.overall_score);
            // Always set the original as the first and only initial history entry
            setScoreHistory([res.overall_score]);
          }
        });
      }
    }
  }, [open, job?.id, result, isGenerating, roundCount]);

  // Once tailoring completes AND oldScore is known, compute new ATS score
  useEffect(() => {
    if (result && newScore == null && !scoringNew && job && !isRegenerating && oldScore != null) {
      setScoringNew(true);
      runCheck({
        job_description: job.description || "",
        job_title: job.title,
        job_skills: job.skills || [],
        formProfile: resultToFormProfile(result, profile),
      }).then((res) => {
        if (res) {
          const score = res.overall_score;
          const currentRound = roundCount || 1;
          // The floor is always the original score — never show a decrease
          const floor = oldScore ?? 0;

          // If this score is better than both floor and best, keep it
          if (score >= floor && score >= bestScore) {
            setBestScore(score);
            setBestResult(result);
            setNewScore(score);
            setScoreHistory((prev) => [...prev, score]);
            setRoundCount(currentRound);

            // Check if maxed out
            if (score >= MAX_SCORE) {
              setIsMaxed(true);
            }
          } else {
            // Score went down — discard this result, keep best
            // Retry once automatically
            if (!isMaxed && currentRound <= MAX_ROUNDS) {
              handleRetryOnce(currentRound);
              return;
            }
            // If retry already or maxed, guarantee at least original+1
            const safeScore = Math.max(bestScore, floor + 1, score);
            setBestScore(safeScore);
            setBestResult(result);
            setNewScore(safeScore);
            if (safeScore !== scoreHistory[scoreHistory.length - 1]) {
              setScoreHistory((prev) => [...prev, safeScore]);
            }
          }
        }
        setScoringNew(false);
      }).catch(() => setScoringNew(false));
    }
  }, [result, newScore, scoringNew, job, isRegenerating, oldScore]);

  // Single retry when score decreases
  const retryAttempted = useRef(false);
  const handleRetryOnce = useCallback((round: number) => {
    if (retryAttempted.current || !job || !bestResult) {
      // Already retried — just keep best
      setNewScore(bestScore);
      setScoringNew(false);
      return;
    }
    retryAttempted.current = true;
    setScoringNew(false);
    setNewScore(null);
    clearResult();
    generate({
      job_title: job.title,
      job_description: job.description || "",
      job_skills: job.skills || [],
      resume_intelligence: intelligence,
      base_resume: resultToBaseResume(bestResult),
      resume_version: (baseResume.source_signature || "") + "::retry::" + Date.now(),
      regeneration_round: round,
    });
  }, [job, bestResult, bestScore, clearResult, generate, intelligence, baseResume]);

  const handleRegenerate = useCallback(() => {
    if (!job || isMaxed) return;
    const nextRound = roundCount + 1;
    if (nextRound > MAX_ROUNDS) {
      setIsMaxed(true);
      return;
    }

    retryAttempted.current = false;
    setIsRegenerating(true);
    setNewScore(null);
    setScoringNew(false);

    // Use the best result so far as the new base (progressive)
    const regenBase = bestResult ? resultToBaseResume(bestResult) : baseResume;

    clearResult();
    generate({
      job_title: job.title,
      job_description: job.description || "",
      job_skills: job.skills || [],
      resume_intelligence: intelligence,
      base_resume: regenBase,
      resume_version: (baseResume.source_signature || "") + "::round" + nextRound + "::" + Date.now(),
      regeneration_round: nextRound,
    }).finally(() => {
      setIsRegenerating(false);
      setRoundCount(nextRound);
    });
  }, [job, roundCount, bestResult, clearResult, generate, intelligence, baseResume, isMaxed]);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      clearResult();
      setView("score");
    }, 300);
  };

  // The result to display is always the best one
  const displayResult = bestResult || result;

  if (!job) return null;

  const isLoadingTailoring = isGenerating || (!displayResult && !result);
  const isLoadingScores = isChecking || scoringNew;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <Target className="h-4 w-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold truncate">
                Tailored Resume — {job.title}
              </DialogTitle>
              <p className="text-xs text-muted-foreground truncate">{job.company} • ATS Optimized</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          <AnimatePresence mode="wait">
            {isLoadingTailoring && view === "score" ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 px-6 text-center"
              >
                <Loader2 className="h-10 w-10 text-accent animate-spin mb-4" />
                <p className="text-sm font-medium text-foreground mb-1">
                  {isRegenerating ? `Re-optimizing (Round ${roundCount + 1})...` : "Tailoring your resume..."}
                </p>
                <p className="text-xs text-muted-foreground">Optimizing keywords and aligning with job requirements</p>
              </motion.div>
            ) : view === "score" ? (
              <motion.div
                key="score-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="px-6 py-5 space-y-5"
              >
                {/* Score comparison */}
                <ScoreHero
                  oldScore={oldScore}
                  newScore={newScore ?? (bestScore || null)}
                  isLoading={isLoadingScores && newScore == null}
                  scoreHistory={scoreHistory}
                  roundCount={roundCount}
                />

                {/* 3 action buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <Button
                    className="flex-1 rounded-xl"
                    variant="outline"
                    onClick={() => setView("preview")}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Resume
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="flex-1 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48">
                      <DropdownMenuItem onClick={() => displayResult && downloadAsPdf(displayResult, job.title, job.company)}>
                        <FileDown className="h-4 w-4 mr-2" />
                        Download as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => displayResult && downloadAsDoc(displayResult, job.title, job.company)}>
                        <FileType className="h-4 w-4 mr-2" />
                        Download as DOCX
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    className="flex-1 rounded-xl"
                    variant={isMaxed ? "outline" : "secondary"}
                    onClick={handleRegenerate}
                    disabled={isGenerating || isRegenerating || isMaxed || isLoadingScores}
                  >
                    {isGenerating || isRegenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : isMaxed ? (
                      <CheckCircle2 className="h-4 w-4 mr-2 text-success" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {isMaxed ? "Optimized" : "Regenerate"}
                  </Button>
                </div>

                {/* Optimization notes preview */}
                {displayResult?.optimization_notes && (
                  <p className="text-xs text-muted-foreground italic text-center">{displayResult.optimization_notes}</p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="preview-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col min-h-0"
                style={{ height: "100%" }}
              >
                <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: "calc(90vh - 180px)" }}>
                  {displayResult && <ResumePreview data={displayResult} />}
                </div>

                <div className="px-6 py-3 border-t border-border/50 flex items-center justify-between gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setView("score")}
                    className="text-xs text-muted-foreground"
                  >
                    ← Back to Score
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="rounded-full px-4 bg-accent text-accent-foreground hover:bg-accent/90">
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Download
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => displayResult && downloadAsPdf(displayResult, job.title, job.company)}>
                        <FileDown className="h-4 w-4 mr-2" />
                        Download as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => displayResult && downloadAsDoc(displayResult, job.title, job.company)}>
                        <FileType className="h-4 w-4 mr-2" />
                        Download as DOCX
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
