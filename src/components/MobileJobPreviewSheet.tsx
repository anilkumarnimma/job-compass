import { Job } from "@/types/job";
import { useJobContext } from "@/context/JobContext";
import { useAuth } from "@/context/AuthContext";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MapPin, Clock, DollarSign, Briefcase, Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface MobileJobPreviewSheetProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileJobPreviewSheet({ job, open, onOpenChange }: MobileJobPreviewSheetProps) {
  const { applyToJob, saveJob, unsaveJob, isApplied, isSaved } = useJobContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!job) return null;
  
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-4 border-b border-border/50">
            <div className="flex items-start gap-3">
              <CompanyLogo 
                logoUrl={job.company_logo} 
                companyName={job.company} 
                size="lg"
              />
              <div className="flex-1 min-w-0 text-left">
                <SheetTitle className="font-semibold text-foreground text-lg leading-tight line-clamp-2">
                  {job.title}
                </SheetTitle>
                <p className="text-muted-foreground text-sm mt-0.5">{job.company}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground/70 mt-1">
                  <Clock className="h-3.5 w-3.5" />
                  Posted {formatDistanceToNow(job.posted_date, { addSuffix: true })}
                </p>
              </div>
            </div>
            
            {job.is_reviewing && (
              <Badge 
                variant="success" 
                className="w-fit px-3 py-1 text-xs font-medium bg-success/10 text-success border-0 mt-2"
              >
                Actively Reviewing
              </Badge>
            )}
          </SheetHeader>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 p-4">
            {/* Info Row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mb-4 pb-4 border-b border-border/50">
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

            {/* Full Description */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-foreground mb-2">Description</h4>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {job.description}
              </p>
            </div>

            {/* Skills */}
            {job.skills.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <Badge 
                      key={skill} 
                      variant="secondary" 
                      className="text-xs font-normal px-3 py-1 rounded-full bg-secondary/80 text-muted-foreground"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Actions - Fixed at bottom */}
          <div className="p-4 border-t border-border/50 flex items-center justify-end gap-3 bg-card">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveClick}
              className={`h-10 px-4 text-sm font-medium ${saved ? "text-accent" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
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
              className={`h-10 text-sm font-medium ${applied ? "px-4" : "bg-accent hover:bg-accent/90 text-accent-foreground px-6 shadow-sm"}`}
            >
              {applied ? "Applied" : (
                <><ExternalLink className="h-4 w-4 mr-1.5" />Apply</>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
