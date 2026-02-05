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
      className="group p-6 sm:p-7 cursor-pointer transition-all duration-300 ease-out border border-border/40 bg-card hover:border-border hover:shadow-elevated hover:-translate-y-1 rounded-xl animate-fade-in"
      onClick={() => onViewDetails?.(job)}
    >
      {/* Header: Logo + Title + Badge */}
      <div className="flex items-start gap-4 mb-5">
        <CompanyLogo 
          logoUrl={job.company_logo} 
          companyName={job.company} 
          size="md"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <h3 className="font-semibold text-foreground text-lg sm:text-xl leading-tight tracking-tight line-clamp-2">
                {job.title}
              </h3>
              <p className="text-muted-foreground text-sm font-medium">{job.company}</p>
            </div>
            {job.is_reviewing && (
              <Badge 
                variant="success" 
                className="shrink-0 px-3 py-1 text-xs font-semibold bg-success/15 text-success border-0 shadow-sm"
              >
                Actively Reviewing
              </Badge>
            )}
          </div>
          
          {/* Posted time */}
          <p className="text-xs text-muted-foreground/70 mt-2 font-medium">
            Posted {formatDistanceToNow(job.posted_date, { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Description - Expandable */}
      <Collapsible open={isDescriptionExpanded} onOpenChange={setIsDescriptionExpanded}>
        <div className="mb-5">
          <p className={`text-sm leading-relaxed text-muted-foreground ${!isDescriptionExpanded ? 'line-clamp-3' : ''}`}>
            {job.description}
          </p>
          {job.description.length > 200 && (
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 mt-2 text-xs font-medium text-accent hover:text-accent/80 hover:bg-transparent"
                onClick={toggleDescription}
              >
                {isDescriptionExpanded ? (
                  <>Show less <ChevronUp className="h-3.5 w-3.5 ml-1" /></>
                ) : (
                  <>Show more <ChevronDown className="h-3.5 w-3.5 ml-1" /></>
                )}
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
      </Collapsible>

      {/* Job Info Row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm mb-5 pb-5 border-b border-border/50">
        <span className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4 text-muted-foreground/60" />
          <span className="font-medium">{job.location}</span>
        </span>
        
        {job.salary_range && (
          <span className="flex items-center gap-2 text-success font-semibold">
            <DollarSign className="h-4 w-4" />
            {job.salary_range}
          </span>
        )}
        
        <span className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 text-muted-foreground/60" />
          <span className="font-medium">{job.employment_type}</span>
        </span>
        
        {job.experience_years && (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-4 w-4 text-muted-foreground/60" />
            <span className="font-medium">{job.experience_years}</span>
          </span>
        )}
      </div>

      {/* Skills */}
      {job.skills.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-3">Skills</p>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <Badge 
                key={skill} 
                variant="secondary" 
                className="text-xs font-medium px-3 py-1 rounded-full bg-secondary/80 hover:bg-secondary transition-colors"
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Actions - Bottom Right */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSaveClick}
          className={`font-medium transition-colors ${saved ? "text-accent hover:text-accent/80" : "text-muted-foreground hover:text-foreground"}`}
        >
          {saved ? (
            <>
              <BookmarkCheck className="h-4 w-4 mr-1.5" />
              Saved
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4 mr-1.5" />
              Save
            </>
          )}
        </Button>
        <Button
          variant={applied ? "secondary" : "default"}
          size="sm"
          onClick={handleApplyClick}
          className={applied ? "font-medium" : "bg-accent hover:bg-accent/90 text-accent-foreground font-medium shadow-sm px-5"}
        >
          {applied ? (
            <>Applied</>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Apply Now
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
