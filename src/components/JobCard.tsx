import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Job } from "@/types/job";
import { useJobContext } from "@/context/JobContext";
import { useAuth } from "@/context/AuthContext";
import { CompanyLogo } from "@/components/CompanyLogo";
import { MapPin, Clock, DollarSign, Briefcase, Bookmark, BookmarkCheck, ExternalLink, ChevronDown, ChevronUp, BriefcaseBusiness } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface JobCardProps {
  job: Job;
  onViewDetails?: (job: Job) => void;
  onHover?: (job: Job | null) => void;
  onTap?: (job: Job) => void;
}

export function JobCard({ job, onViewDetails, onHover, onTap }: JobCardProps) {
  const { applyToJob, saveJob, unsaveJob, isApplied, isSaved } = useJobContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
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

  const toggleDescription = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDescriptionExpanded(!isDescriptionExpanded);
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

  const handleMouseEnter = () => {
    onHover?.(job);
  };

  const handleMouseLeave = () => {
    onHover?.(null);
  };

  return (
    <Card 
      className="group p-5 transition-all duration-[160ms] ease-out border border-border bg-card shadow-premium hover:shadow-premium-hover hover:border-accent/30 hover:-translate-y-0.5 rounded-2xl cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
    >
      {/* Header: Logo + Title + Badge */}
      <div className="flex items-start gap-4 mb-4">
        <CompanyLogo 
          logoUrl={job.company_logo} 
          companyName={job.company} 
          size="md"
          className="rounded-xl"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 
                className="font-bold text-foreground text-lg leading-tight line-clamp-1 cursor-pointer hover:text-accent transition-colors"
                onClick={handleTitleClick}
              >
                {job.title}
              </h3>
              <p className="text-muted-foreground text-sm mt-0.5">{job.company}</p>
            </div>
            {job.is_reviewing && (
              <Badge 
                className="shrink-0 px-2.5 py-1.5 text-xs font-medium bg-success-bg text-success-text border-0 rounded-full"
              >
                Actively Reviewing
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Description - above meta row */}
      <div className="mb-4">
        <p className={`text-sm leading-relaxed text-muted-foreground ${!isDescriptionExpanded ? 'line-clamp-2' : ''}`}>
          {job.description}
        </p>
        {job.description.length > 120 && (
          <button 
            className="text-xs font-medium text-accent hover:text-accent/80 mt-1.5 flex items-center gap-1 transition-colors"
            onClick={toggleDescription}
          >
            {isDescriptionExpanded ? (
              <>Show less <ChevronUp className="h-3.5 w-3.5" /></>
            ) : (
              <>Show more <ChevronDown className="h-3.5 w-3.5" /></>
            )}
          </button>
        )}
      </div>

      {/* Meta Row - Chip Style */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-chip-bg text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Posted {formatDistanceToNow(job.posted_date, { addSuffix: false })} ago
        </span>
        
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

      {/* Skills - Clean rounded pills */}
      {job.skills.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {job.skills.slice(0, 8).map((skill) => (
              <Badge 
                key={skill} 
                variant="secondary" 
                className="text-xs font-normal px-2.5 py-1 rounded-full bg-chip-bg text-foreground border-0 hover:bg-secondary transition-colors"
              >
                {skill}
              </Badge>
            ))}
            {job.skills.length > 8 && (
              <Badge 
                variant="outline" 
                className="text-xs font-normal px-2.5 py-1 rounded-full"
              >
                +{job.skills.length - 8} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Actions - Bottom Right */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSaveClick}
          className={`h-9 px-3 text-sm font-medium rounded-xl ${saved ? "text-accent" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
        >
          {saved ? (
            <BookmarkCheck className="h-4 w-4" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </Button>
        <Button
          size="sm"
          onClick={handleApplyClick}
          className={`h-9 text-sm font-medium rounded-xl ${
            applied 
              ? "bg-secondary text-secondary-foreground px-4" 
              : "bg-accent hover:bg-accent/90 text-accent-foreground px-5 shadow-sm"
          }`}
        >
          {applied ? "Applied" : (
            <><ExternalLink className="h-4 w-4 mr-1.5" />Apply</>
          )}
        </Button>
      </div>
    </Card>
  );
}
