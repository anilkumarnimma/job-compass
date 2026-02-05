import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Job } from "@/types/job";
import { useJobContext } from "@/context/JobContext";
import { useAuth } from "@/context/AuthContext";
import { CompanyLogo } from "@/components/CompanyLogo";
import { MapPin, Clock, DollarSign, Briefcase, Bookmark, BookmarkCheck, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface JobCardProps {
  job: Job;
  onViewDetails?: (job: Job) => void;
}

export function JobCard({ job, onViewDetails }: JobCardProps) {
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

  return (
    <Card 
      className="group p-5 sm:p-6 transition-all duration-300 ease-out border border-border/40 bg-card shadow-sm hover:border-accent/30 hover:shadow-lg hover:-translate-y-1 rounded-xl"
    >
      {/* Header: Logo + Title + Badge */}
      <div className="flex items-start gap-4 mb-4">
        <CompanyLogo 
          logoUrl={job.company_logo} 
          companyName={job.company} 
          size="md"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 
                className="font-semibold text-foreground text-base sm:text-lg leading-tight line-clamp-1 cursor-pointer hover:text-accent transition-colors"
                onClick={handleTitleClick}
              >
                {job.title}
              </h3>
              <p className="text-muted-foreground text-sm mt-0.5">{job.company}</p>
            </div>
            {job.is_reviewing && (
              <Badge 
                variant="success" 
                className="shrink-0 px-3 py-1 text-xs font-medium bg-success/10 text-success border-0"
              >
                Actively Reviewing
              </Badge>
            )}
          </div>
          
          {/* Posted time */}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground/70 mt-1.5">
            <Clock className="h-3.5 w-3.5" />
            Posted {formatDistanceToNow(job.posted_date, { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Description - 2 lines with expand */}
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

      {/* Job Info Row - Clean with proper icons */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm mb-4 pb-4 border-b border-border/50">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-4 w-4 text-muted-foreground/70" />
          {job.location}
        </span>
        
        {job.salary_range && (
          <span className="flex items-center gap-1.5 text-success font-semibold">
            <DollarSign className="h-4 w-4" />
            {job.salary_range}
          </span>
        )}
        
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-4 w-4 text-muted-foreground/70" />
          {job.employment_type}
        </span>
        
        {job.experience_years && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Briefcase className="h-4 w-4 text-muted-foreground/70" />
            {job.experience_years}
          </span>
        )}
      </div>

      {/* Skills - Clean rounded pills */}
      {job.skills.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 max-h-[56px] overflow-hidden">
            {job.skills.slice(0, 6).map((skill) => (
              <Badge 
                key={skill} 
                variant="secondary" 
                className="text-xs font-normal px-3 py-1 rounded-full bg-secondary/80 text-muted-foreground"
              >
                {skill}
              </Badge>
            ))}
            {job.skills.length > 6 && (
              <Badge 
                variant="outline" 
                className="text-xs font-normal px-3 py-1 rounded-full"
              >
                +{job.skills.length - 6}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Actions - Bottom Right */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSaveClick}
          className={`h-9 px-4 text-sm font-medium ${saved ? "text-accent" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
        >
          {saved ? (
            <><BookmarkCheck className="h-4 w-4 mr-1.5" />Saved</>
          ) : (
            <><Bookmark className="h-4 w-4 mr-1.5" />Save</>
          )}
        </Button>
        <Button
          variant={applied ? "secondary" : "default"}
          size="sm"
          onClick={handleApplyClick}
          className={`h-9 text-sm font-medium ${applied ? "px-4" : "bg-accent hover:bg-accent/90 text-accent-foreground px-5 shadow-sm"}`}
        >
          {applied ? "Applied" : (
            <><ExternalLink className="h-4 w-4 mr-1.5" />Apply</>
          )}
        </Button>
      </div>
    </Card>
  );
}