import { Job } from "@/types/job";
import { useJobContext } from "@/context/JobContext";
import { useAuth } from "@/context/AuthContext";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Clock, DollarSign, Briefcase, Bookmark, BookmarkCheck, ExternalLink, BriefcaseBusiness } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface JobPreviewPanelProps {
  job: Job;
}

export function JobPreviewPanel({ job }: JobPreviewPanelProps) {
  const { applyToJob, saveJob, unsaveJob, isApplied, isSaved } = useJobContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const saved = isSaved(job.id);
  const applied = isApplied(job.id);

  const handleSaveClick = () => {
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

  const handleApplyClick = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    applyToJob(job);
  };

  const handleTitleClick = () => {
    window.open(job.external_apply_link, "_blank");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Job Preview</span>
        </div>
        <div className="flex items-start gap-3.5 mb-3">
          <CompanyLogo 
            logoUrl={job.company_logo} 
            companyName={job.company} 
            size="lg"
            className="rounded-xl"
          />
          <div className="flex-1 min-w-0">
            <h3 
              className="font-extrabold text-foreground text-lg leading-tight line-clamp-2 cursor-pointer hover:text-accent transition-colors"
              onClick={handleTitleClick}
            >
              {job.title}
            </h3>
            <p className="text-muted-foreground text-sm mt-0.5">{job.company}</p>
          </div>
        </div>
        
        {job.is_reviewing && (
          <Badge 
            className="px-2.5 py-1.5 text-xs font-medium bg-success-bg text-success-text border-0 rounded-full"
          >
            Actively Reviewing
          </Badge>
        )}
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 p-5">
        {/* Meta Row - Chip Style */}
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-border">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-chip-bg text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Posted {formatDistanceToNow(job.posted_date, { addSuffix: false })}
          </span>
          
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-chip-bg text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {job.location}
          </span>
          
          {job.salary_range && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-bg text-xs text-success-text font-medium">
              <DollarSign className="h-3.5 w-3.5" />
              {job.salary_range}
            </span>
          )}
          
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-chip-bg text-xs text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" />
            {job.employment_type}
          </span>
          
          {job.experience_years && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-chip-bg text-xs text-muted-foreground">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              {job.experience_years}
            </span>
          )}
        </div>

        {/* Full Description */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
            {job.description}
          </p>
        </div>

        {/* Skills */}
        {job.skills.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skills</h4>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((skill) => (
                <Badge 
                  key={skill} 
                  variant="secondary" 
                  className="text-xs font-normal px-2.5 py-1 rounded-full bg-chip-bg text-muted-foreground border-0"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Actions - Fixed Bottom */}
      <div className="p-5 border-t border-border flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSaveClick}
          className={`h-10 px-4 text-sm font-medium rounded-xl ${saved ? "text-accent" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
        >
          {saved ? (
            <><BookmarkCheck className="h-4 w-4 mr-1.5" />Saved</>
          ) : (
            <><Bookmark className="h-4 w-4 mr-1.5" />Save</>
          )}
        </Button>
        <Button
          size="sm"
          onClick={handleApplyClick}
          className={`h-10 text-sm font-medium rounded-xl ${
            applied 
              ? "bg-secondary text-secondary-foreground px-5" 
              : "bg-accent hover:bg-accent/90 text-accent-foreground px-6 shadow-sm"
          }`}
        >
          {applied ? "Applied" : (
            <><ExternalLink className="h-4 w-4 mr-1.5" />Apply</>
          )}
        </Button>
      </div>
    </div>
  );
}
