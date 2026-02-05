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

  return (
    <Card 
      className="group p-4 sm:p-5 cursor-pointer transition-all duration-200 ease-out border border-border/50 bg-card hover:border-border/80 hover:shadow-md hover:-translate-y-0.5 rounded-lg"
      onClick={() => onViewDetails?.(job)}
    >
      {/* Header: Logo + Title + Badge */}
      <div className="flex items-start gap-3 mb-3">
        <CompanyLogo 
          logoUrl={job.company_logo} 
          companyName={job.company} 
          size="sm"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base leading-tight line-clamp-1">
                {job.title}
              </h3>
              <p className="text-muted-foreground text-xs mt-0.5">{job.company}</p>
            </div>
            {job.is_reviewing && (
              <Badge 
                variant="success" 
                className="shrink-0 px-2 py-0.5 text-[10px] font-medium"
              >
                Actively Reviewing
              </Badge>
            )}
          </div>
          
          {/* Posted time */}
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground/70 mt-1">
            <Clock className="h-3 w-3" />
            Posted {formatDistanceToNow(job.posted_date, { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Description - 2 lines with expand */}
      <div className="mb-3">
        <p className={`text-xs leading-relaxed text-muted-foreground ${!isDescriptionExpanded ? 'line-clamp-2' : ''}`}>
          {job.description}
        </p>
        {job.description.length > 120 && (
          <button 
            className="text-[10px] font-medium text-accent hover:text-accent/80 mt-1 flex items-center gap-0.5"
            onClick={toggleDescription}
          >
            {isDescriptionExpanded ? (
              <>Show less <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>Show more <ChevronDown className="h-3 w-3" /></>
            )}
          </button>
        )}
      </div>

      {/* Job Info Row - Compact with proper icons */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs mb-3 pb-3 border-b border-border/40">
        <span className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {job.location}
        </span>
        
        {job.salary_range && (
          <span className="flex items-center gap-1 text-success font-medium">
            <DollarSign className="h-3.5 w-3.5" />
            {job.salary_range}
          </span>
        )}
        
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {job.employment_type}
        </span>
        
        {job.experience_years && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" />
            {job.experience_years}
          </span>
        )}
      </div>

      {/* Skills - Compact pills */}
      {job.skills.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1.5 max-h-[52px] overflow-hidden">
            {job.skills.slice(0, 6).map((skill) => (
              <Badge 
                key={skill} 
                variant="secondary" 
                className="text-[10px] font-normal px-2 py-0.5 rounded-md bg-muted/60"
              >
                {skill}
              </Badge>
            ))}
            {job.skills.length > 6 && (
              <Badge 
                variant="outline" 
                className="text-[10px] font-normal px-2 py-0.5 rounded-md"
              >
                +{job.skills.length - 6}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Actions - Bottom Right */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSaveClick}
          className={`h-8 px-3 text-xs ${saved ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}
        >
          {saved ? (
            <><BookmarkCheck className="h-3.5 w-3.5 mr-1" />Saved</>
          ) : (
            <><Bookmark className="h-3.5 w-3.5 mr-1" />Save</>
          )}
        </Button>
        <Button
          variant={applied ? "secondary" : "default"}
          size="sm"
          onClick={handleApplyClick}
          className={`h-8 text-xs ${applied ? "" : "bg-accent hover:bg-accent/90 text-accent-foreground px-4"}`}
        >
          {applied ? "Applied" : (
            <><ExternalLink className="h-3.5 w-3.5 mr-1" />Apply</>
          )}
        </Button>
      </div>
    </Card>
  );
}