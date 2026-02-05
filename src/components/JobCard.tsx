import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Job } from "@/types/job";
import { useJobContext } from "@/context/JobContext";
import { useAuth } from "@/context/AuthContext";
import { CompanyLogo } from "@/components/CompanyLogo";
import { MapPin, Clock, DollarSign, Target, Bookmark, BookmarkCheck, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
      className="p-5 cursor-pointer transition-all duration-200 hover:shadow-card-hover border-border/60 animate-fade-in"
      onClick={() => onViewDetails?.(job)}
    >
      {/* Header: Logo + Title + Badge */}
      <div className="flex items-start gap-4 mb-3">
        <CompanyLogo 
          logoUrl={job.company_logo} 
          companyName={job.company} 
          size="md"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-lg leading-tight truncate">
                {job.title}
              </h3>
              <p className="text-muted-foreground font-medium">{job.company}</p>
            </div>
            {job.is_reviewing && (
              <Badge variant="success" className="shrink-0">
                Actively Reviewing
              </Badge>
            )}
          </div>
          
          {/* Posted time */}
          <p className="text-xs text-muted-foreground mt-1">
            Posted {formatDistanceToNow(job.posted_date, { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Description - Expandable */}
      <Collapsible open={isDescriptionExpanded} onOpenChange={setIsDescriptionExpanded}>
        <div className="mb-4">
          <p className={`text-sm text-muted-foreground ${!isDescriptionExpanded ? 'line-clamp-3' : ''}`}>
            {job.description}
          </p>
          {job.description.length > 200 && (
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 mt-1 text-xs text-primary hover:text-primary/80"
                onClick={toggleDescription}
              >
                {isDescriptionExpanded ? (
                  <>Show less <ChevronUp className="h-3 w-3 ml-1" /></>
                ) : (
                  <>Show more <ChevronDown className="h-3 w-3 ml-1" /></>
                )}
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
      </Collapsible>

      {/* Job Info Row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4 pb-4 border-b border-border/60">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-primary/70" />
          {job.location}
        </span>
        
        {job.salary_range && (
          <span className="flex items-center gap-1.5 text-success font-medium">
            <DollarSign className="h-4 w-4" />
            {job.salary_range}
          </span>
        )}
        
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-primary/70" />
          {job.employment_type}
        </span>
        
        {job.experience_years && (
          <span className="flex items-center gap-1.5">
            <Target className="h-4 w-4 text-primary/70" />
            {job.experience_years}
          </span>
        )}
      </div>

      {/* Skills */}
      {job.skills.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {job.skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Actions - Bottom Right */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSaveClick}
          className={saved ? "text-accent" : "text-muted-foreground"}
        >
          {saved ? (
            <>
              <BookmarkCheck className="h-4 w-4 mr-1" />
              Saved
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4 mr-1" />
              Save
            </>
          )}
        </Button>
        <Button
          variant={applied ? "secondary" : "accent"}
          size="sm"
          onClick={handleApplyClick}
        >
          {applied ? (
            <>Applied</>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-1" />
              Apply Now
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
