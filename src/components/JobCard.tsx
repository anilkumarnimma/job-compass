import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Job } from "@/types/job";
import { useJobContext } from "@/context/JobContext";
import { useAuth } from "@/context/AuthContext";
import { CompanyLogo } from "@/components/CompanyLogo";
import { MapPin, Clock, DollarSign, Bookmark, BookmarkCheck, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface JobCardProps {
  job: Job;
  onViewDetails?: (job: Job) => void;
  onTap?: (job: Job) => void;
  isSelected?: boolean;
}

export function JobCard({ job, onViewDetails, onTap, isSelected }: JobCardProps) {
  const { applyToJob, saveJob, unsaveJob, isApplied, isSaved } = useJobContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const saved = isSaved(job.id);
  const applied = isApplied(job.id);

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate("/auth");
      return;
    }
    if (saved) {
      unsaveJob(job.id);
    } else {
      saveJob(job);
    }
  };

  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate("/auth");
      return;
    }
    applyToJob(job);
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(job.external_apply_link, "_blank");
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (onTap) {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a')) return;
      onTap(job);
    }
  };

  return (
    <Card 
      className={`group p-5 transition-all duration-[160ms] ease-out border bg-card rounded-xl cursor-pointer ${
        isSelected 
          ? "border-accent bg-accent/5 shadow-md ring-1 ring-accent/20" 
          : "border-border hover:shadow-md hover:border-border/80"
      }`}
      onClick={handleCardClick}
    >
      {/* Header Row: Logo + Title/Company/Time + Badge */}
      <div className="flex items-start gap-3 mb-3">
        <CompanyLogo 
          logoUrl={job.company_logo} 
          companyName={job.company} 
          size="md"
          className="rounded-lg shrink-0"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 
                className="font-semibold text-foreground text-base leading-tight cursor-pointer hover:text-accent transition-colors"
                onClick={handleTitleClick}
              >
                {job.title.toLowerCase()}
              </h3>
              <p className="text-muted-foreground text-sm">{job.company.toLowerCase()}</p>
              <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                Posted {formatDistanceToNow(job.posted_date, { addSuffix: false })} ago
              </p>
            </div>
            {job.is_reviewing && (
              <Badge 
                className="shrink-0 px-2 py-1 text-[11px] font-medium bg-success-bg text-success-text border-0 rounded-md whitespace-nowrap"
              >
                Actively Reviewing
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Description with hover tooltip */}
      <div className="mb-3">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-default">
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                  {job.description}
                </p>
                {job.description.length > 100 && (
                  <span className="text-xs text-primary hover:text-primary/80 font-medium mt-0.5 inline-block">
                    ...more
                  </span>
                )}
              </div>
            </TooltipTrigger>
            {job.description.length > 100 && (
              <TooltipContent 
                side="top" 
                align="start" 
                className="max-w-[400px] p-3 text-sm leading-relaxed"
              >
                {job.description}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Meta Row - Inline chips with icons */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-foreground text-xs font-medium">
          <MapPin className="h-3.5 w-3.5" />
          {job.location}
        </span>
        
        {job.salary_range && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-success-bg text-success-text text-xs font-medium">
            <DollarSign className="h-3.5 w-3.5" />
            {job.salary_range}
          </span>
        )}
        
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-foreground text-xs font-medium">
          <Clock className="h-3.5 w-3.5" />
          {job.employment_type}
        </span>
        
        {job.experience_years && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-foreground text-xs font-medium">
            <Calendar className="h-3.5 w-3.5" />
            {job.experience_years}
          </span>
        )}
      </div>

      {/* Skills - Clean inline pills */}
      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.skills.slice(0, 6).map((skill) => (
            <Badge 
              key={skill} 
              variant="outline" 
              className="text-xs font-normal px-2.5 py-1 rounded-md bg-secondary/50 text-foreground border-border/50 hover:bg-secondary transition-colors"
            >
              {skill}
            </Badge>
          ))}
          {job.skills.length > 6 && (
            <Badge 
              variant="outline" 
              className="text-xs font-normal px-2.5 py-1 rounded-md text-muted-foreground"
            >
              +{job.skills.length - 6} more
            </Badge>
          )}
        </div>
      )}

      {/* Actions - Centered */}
      <div className="flex items-center justify-center gap-3 pt-3 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSaveClick}
          className={`h-8 px-3 text-sm font-normal gap-1.5 ${saved ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}
        >
          {saved ? (
            <BookmarkCheck className="h-4 w-4" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
          Save
        </Button>
        <Button
          variant={applied ? "outline" : "default"}
          size="sm"
          onClick={handleApplyClick}
          disabled={applied}
          className={`h-8 px-4 text-sm font-medium ${
            applied 
              ? "bg-secondary/80 text-foreground border-border hover:bg-secondary" 
              : "bg-foreground text-background hover:bg-foreground/90"
          }`}
        >
          {applied ? "Applied" : "Apply"}
        </Button>
      </div>
    </Card>
  );
}
