import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InterviewPrepData } from "@/hooks/useInterviewPrep";
import { Loader2, Brain, Target, MessageSquare, Lightbulb, BookOpen, TrendingUp, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface InterviewPrepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prep: InterviewPrepData | null;
  isLoading: boolean;
  jobTitle: string;
  hasResume: boolean;
}

function CollapsibleAnswer({ answer }: { answer: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium mt-1.5 transition-colors"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
        {expanded ? "Hide" : "Show"} suggested answer
      </button>
      {expanded && (
        <p className="text-xs text-muted-foreground mt-1.5 pl-3 border-l-2 border-accent/30 leading-relaxed">
          {answer}
        </p>
      )}
    </div>
  );
}

function DifficultyBadge({ level }: { level: string }) {
  const styles = {
    easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    hard: "bg-red-500/10 text-red-600 dark:text-red-400",
  };
  return (
    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", styles[level as keyof typeof styles] || styles.medium)}>
      {level}
    </span>
  );
}

export function InterviewPrepDialog({ open, onOpenChange, prep, isLoading, jobTitle, hasResume }: InterviewPrepDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-accent" />
            Interview Prep — {jobTitle}
          </DialogTitle>
          {!hasResume && !isLoading && (
            <p className="text-xs text-muted-foreground mt-1">
              Upload a resume in your profile for personalized answers.
            </p>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Generating your personalized prep…</p>
          </div>
        ) : prep ? (
          <ScrollArea className="max-h-[calc(85vh-80px)]">
            <div className="p-5 space-y-6">
              {/* Resume Match Summary */}
              {prep.resumeMatch && (
                <section>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                    <Target className="h-4 w-4 text-accent" /> Resume Match
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{prep.resumeMatch.matchSummary}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Strengths
                      </p>
                      <ul className="space-y-1">
                        {prep.resumeMatch.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Gaps
                      </p>
                      <ul className="space-y-1">
                        {prep.resumeMatch.gaps.map((g, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {g}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              )}

              {/* Key Skills */}
              <section>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                  <TrendingUp className="h-4 w-4 text-accent" /> Key Skills to Focus On
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {prep.keySkills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs rounded-full bg-chip-bg border-0">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </section>

              {/* Technical Questions */}
              <section>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                  <Brain className="h-4 w-4 text-accent" /> Technical Questions
                </h4>
                <div className="space-y-3">
                  {prep.technicalQuestions.map((q, i) => (
                    <div key={i} className="rounded-lg border border-border/50 p-3 bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-foreground font-medium leading-snug">{q.question}</p>
                        <DifficultyBadge level={q.difficulty} />
                      </div>
                      <CollapsibleAnswer answer={q.suggestedAnswer} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Behavioral Questions */}
              <section>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                  <MessageSquare className="h-4 w-4 text-accent" /> Behavioral Questions
                </h4>
                <div className="space-y-3">
                  {prep.behavioralQuestions.map((q, i) => (
                    <div key={i} className="rounded-lg border border-border/50 p-3 bg-card">
                      <p className="text-sm text-foreground font-medium leading-snug">{q.question}</p>
                      <CollapsibleAnswer answer={q.suggestedAnswer} />
                      <p className="text-[10px] text-accent mt-1.5 italic">💡 {q.tip}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Tailored Answers */}
              <section>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                  <Lightbulb className="h-4 w-4 text-accent" /> Tailored Answers
                </h4>
                <div className="space-y-3">
                  {prep.tailoredAnswers.map((a, i) => (
                    <div key={i} className="rounded-lg border border-border/50 p-3 bg-card">
                      <p className="text-sm text-foreground font-medium">&ldquo;{a.question}&rdquo;</p>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{a.answer}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Study Topics */}
              <section>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                  <BookOpen className="h-4 w-4 text-accent" /> Topics to Study
                </h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {prep.studyTopics.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
                      <span className="text-accent font-bold text-[10px]">{i + 1}</span> {t}
                    </div>
                  ))}
                </div>
              </section>

              {/* Interview Tips */}
              <section>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                  <Lightbulb className="h-4 w-4 text-accent" /> Pro Tips
                </h4>
                <ul className="space-y-1.5">
                  {prep.interviewTips.map((tip, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-accent mt-0.5">✦</span> {tip}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
