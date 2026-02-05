import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Job } from "@/types/job";
import { useJobContext } from "@/context/JobContext";
import { useAuth } from "@/context/AuthContext";
import { CompanyLogo } from "@/components/CompanyLogo";
import { MapPin, Calendar, Bookmark, BookmarkCheck, ExternalLink, DollarSign, Briefcase } from "lucide-react";
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
 
   return (
     <Card 
       className="p-5 cursor-pointer transition-all duration-200 hover:shadow-card-hover border-border/60 animate-fade-in"
       onClick={() => onViewDetails?.(job)}
     >
       <div className="flex items-start gap-4">
         {/* Company Logo */}
         <CompanyLogo 
           logoUrl={job.company_logo} 
           companyName={job.company} 
           size="md"
         />
         
         <div className="flex-1 min-w-0">
           {/* Header with title and badges */}
           <div className="flex items-start gap-3 mb-2">
             <div className="flex-1 min-w-0">
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
              <Badge variant="outline" className="shrink-0 text-primary border-primary/30">
                <Briefcase className="h-3 w-3 mr-1" />
                {job.employment_type}
              </Badge>
            </div>
 
           {/* Location and date */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDistanceToNow(job.posted_date, { addSuffix: true })}
              </span>
              {job.salary_range && (
                <span className="flex items-center gap-1.5 text-success font-medium">
                  <DollarSign className="h-3.5 w-3.5" />
                  {job.salary_range}
                </span>
              )}
            </div>
 
           {/* Description */}
           <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
             {job.description}
           </p>
 
           {/* Skills */}
           <div className="flex flex-wrap gap-1.5">
             {job.skills.slice(0, 4).map((skill) => (
               <Badge key={skill} variant="secondary" className="text-xs">
                 {skill}
               </Badge>
             ))}
           </div>
         </div>
       </div>
 
       {/* Actions */}
       <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/60">
         <Button
           variant={applied ? "secondary" : "accent"}
           size="sm"
           onClick={handleApplyClick}
           className="flex-1 sm:flex-none"
         >
           {applied ? (
             <>Applied</>
           ) : (
             <>
               <ExternalLink className="h-3.5 w-3.5" />
               Apply Now
             </>
           )}
         </Button>
         <Button
           variant="ghost"
           size="icon"
           onClick={handleSaveClick}
           className={saved ? "text-accent" : "text-muted-foreground"}
         >
           {saved ? (
             <BookmarkCheck className="h-4 w-4" />
           ) : (
             <Bookmark className="h-4 w-4" />
           )}
         </Button>
       </div>
     </Card>
   );
 }