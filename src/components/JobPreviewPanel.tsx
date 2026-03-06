import { useState } from "react";
import { Job } from "@/types/job";
import { JobMatchResult } from "@/lib/jobMatcher";
import { useJobContext } from "@/context/JobContext";
import { useAuth } from "@/context/AuthContext";
import { useAtsCheck } from "@/hooks/useAtsCheck";
import { AtsCheckDialog } from "@/components/AtsCheckDialog";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Clock, DollarSign, Briefcase, Bookmark, BookmarkCheck, ExternalLink, BriefcaseBusiness, Target } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface JobPreviewPanelProps {
  job: Job;
  matchResult?: JobMatchResult;
}

export function JobPreviewPanel({ job, matchResult }: JobPreviewPanelProps) {
  const { applyToJob, saveJob, unsaveJob, isApplied, isSaved } = useJobContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { runCheck, isChecking, result, clearResult } = useAtsCheck();
  const [showAtsDialog, setShowAtsDialog] = useState(false);

  const saved = isSaved(job.id);
  const applied = isApplied(job.id);

  const handleSaveClick = () => {
    if (!user) { navigate("/auth"); return; }
    if (saved) unsaveJob(job.id); else saveJob(job);
  };

  const handleApplyClick = () => {
    if (!user) { navigate("/auth"); return; }
    applyToJob(job);
  };

  const handleTitleClick = () => {
    window.open(job.external_apply_link, "_blank");
  };

  const handleAtsCheck = () => {
    if (!user) { navigate("/auth"); return; }
    clearResult();
    setShowAtsDialog(true);
    runCheck({
      job_description: job.description,
      job_title: job.title,
      job_skills: job.skills,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="p-5 border-b border-border/50 shrink-0 bg-card/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-start gap-4 mb-3">
          <CompanyLogo
            logoUrl={job.company_logo}
            companyName={job.company}
            size="lg"
            className="rounded-xl"
          />
          <div className="flex-1 min-w-0">
            <h3
              className="font-display font-bold text-foreground text-lg leading-tight line-clamp-2 cursor-pointer hover:text-accent transition-colors"
              onClick={handleTitleClick}
            >
              {job.title}
            </h3>
            <p className="text-muted-foreground text-sm mt-0.5">{job.company}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Posted {formatDistanceToNow(job.posted_date, { addSuffix: false })} ago
            </p>
          </div>
        </div>

        {/* Action Buttons - sticky with header */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleApplyClick}
            className={`h-9 text-sm font-medium rounded-xl transition-all active:scale-95 ${
              applied
                ? "bg-secondary text-secondary-foreground px-5"
                : "bg-accent hover:bg-accent/90 text-accent-foreground px-6 shadow-sm"
            }`}
          >
            {applied ? "Applied" : (
              <><ExternalLink className="h-4 w-4 mr-1.5" />Apply</>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveClick}
            className={`h-9 px-4 text-sm font-medium rounded-xl active:scale-95 ${saved ? "text-accent" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
          >
            {saved ? (
              <><BookmarkCheck className="h-4 w-4 mr-1.5" />Saved</>
            ) : (
              <><Bookmark className="h-4 w-4 mr-1.5" />Save</>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleAtsCheck}
            className="h-9 px-4 text-sm font-medium rounded-xl active:scale-95 text-accent hover:text-accent-foreground hover:bg-accent/20 animate-[ats-glow_4s_ease-in-out_infinite] relative"
          >
            <Target className="h-4 w-4 mr-1.5 animate-pulse" />ATS Check
          </Button>

          {job.is_reviewing && (
            <Badge className="ml-auto px-2.5 py-1.5 text-xs font-medium bg-success-bg text-success-text border-0 rounded-full">
              Actively Reviewing
            </Badge>
          )}
        </div>
      </div>

      <AtsCheckDialog
        open={showAtsDialog}
        onOpenChange={setShowAtsDialog}
        result={result}
        isChecking={isChecking}
      />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-5 overscroll-contain">
        <div className="flex flex-wrap gap-2 mb-5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-chip-bg text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {job.location}
          </span>

          {job.salary_range && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-success-bg text-xs text-success-text font-medium">
              <DollarSign className="h-3.5 w-3.5" />
              {job.salary_range}
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-chip-bg text-xs text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" />
            {job.employment_type}
          </span>

          {job.experience_years && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-chip-bg text-xs text-muted-foreground">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              {job.experience_years}
            </span>
          )}
        </div>

        {/* Job Description - LinkedIn-style */}
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">About the role</h4>
          <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line prose prose-sm max-w-none">
            {job.description}
          </div>
        </div>

        {/* Skills */}
        {job.skills.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Skills & Technologies</h4>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="text-xs font-normal px-2.5 py-1 rounded-full bg-chip-bg text-foreground border-0 hover:bg-secondary transition-colors"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
