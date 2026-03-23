import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InterviewPrepData } from "@/hooks/useInterviewPrep";
import { Loader2, Brain, MessageSquare, ChevronDown } from "lucide-react";
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
        {expanded ? "Hide" : "Show"} answer
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

export function InterviewPrepDialog({ open, onOpenChange, prep, isLoading, jobTitle }: InterviewPrepDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-accent" />
            Interview Prep — {jobTitle}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Generating questions…</p>
          </div>
        ) : prep ? (
          <ScrollArea className="max-h-[calc(85vh-80px)]">
            <div className="p-5 space-y-6">
              {/* Technical Questions */}
              {prep.technicalQuestions?.length > 0 && (
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
              )}

              {/* Behavioral Questions */}
              {prep.behavioralQuestions?.length > 0 && (
                <section>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                    <MessageSquare className="h-4 w-4 text-accent" /> Behavioral Questions
                  </h4>
                  <div className="space-y-3">
                    {prep.behavioralQuestions.map((q, i) => (
                      <div key={i} className="rounded-lg border border-border/50 p-3 bg-card">
                        <p className="text-sm text-foreground font-medium leading-snug">{q.question}</p>
                        <CollapsibleAnswer answer={q.suggestedAnswer} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
