 import { Layout } from "@/components/Layout";
 import { Button } from "@/components/ui/button";
 import { Card } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { useJobContext } from "@/context/JobContext";
 import { useAuth } from "@/context/AuthContext";
 import { CompanyLogo } from "@/components/CompanyLogo";
 import { Bookmark, ExternalLink, Trash2, MapPin, Loader2 } from "lucide-react";
 import { Link, Navigate } from "react-router-dom";
 import { formatDistanceToNow } from "date-fns";
 
 export default function Saved() {
   const { savedJobs, unsaveJob, applyToJob, isApplied, isLoading } = useJobContext();
   const { user, isLoading: authLoading } = useAuth();
 
   if (authLoading) {
     return (
       <Layout>
         <div className="flex items-center justify-center min-h-[50vh]">
           <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
         </div>
       </Layout>
     );
   }
 
   if (!user) {
     return <Navigate to="/auth" replace />;
   }
 
   return (
     <Layout>
       <div className="container max-w-4xl mx-auto px-4 py-8">
         {/* Header */}
         <div className="mb-8">
           <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
             Saved Jobs
           </h1>
           <p className="text-muted-foreground">
             Jobs you've bookmarked for later
           </p>
         </div>
 
         {/* Job List */}
         {isLoading ? (
           <div className="text-center py-12">
             <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
             <p className="text-muted-foreground">Loading saved jobs...</p>
           </div>
         ) : savedJobs.length === 0 ? (
           <Card className="p-12 text-center border-border/60">
             <Bookmark className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
             <h3 className="font-semibold text-foreground mb-2">No saved jobs</h3>
             <p className="text-muted-foreground mb-6">
               Save jobs you're interested in to review them later
             </p>
             <Link to="/dashboard">
               <Button variant="accent">Browse Jobs</Button>
             </Link>
           </Card>
         ) : (
           <div className="space-y-4">
             {savedJobs.map((savedJob) => {
               const job = savedJob.job;
               if (!job) return null;
               
               const applied = isApplied(job.id);
               
               return (
                 <Card key={savedJob.id} className="p-5 border-border/60 animate-fade-in">
                   <div className="flex items-start gap-4">
                     <CompanyLogo 
                       logoUrl={job.company_logo} 
                       companyName={job.company} 
                       size="md"
                     />
                     <div className="flex-1 min-w-0">
                       <div className="flex items-start gap-3 mb-2">
                         <div className="flex-1 min-w-0">
                           <h3 className="font-semibold text-foreground text-lg leading-tight truncate">
                             {job.title}
                           </h3>
                           <p className="text-muted-foreground font-medium">{job.company}</p>
                         </div>
                         <div className="flex gap-2 shrink-0">
                           {applied && (
                             <Badge variant="accent">Applied</Badge>
                           )}
                           {job.is_reviewing && (
                             <Badge variant="success">Actively Reviewing</Badge>
                           )}
                         </div>
                       </div>
 
                       <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                         <span className="flex items-center gap-1.5">
                           <MapPin className="h-3.5 w-3.5" />
                           {job.location}
                         </span>
                         <span>
                           Posted {formatDistanceToNow(job.posted_date, { addSuffix: true })}
                         </span>
                       </div>
 
                       <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                         {job.description}
                       </p>
 
                       <div className="flex flex-wrap gap-1.5">
                         {job.skills.slice(0, 4).map((skill) => (
                           <Badge key={skill} variant="secondary" className="text-xs">
                             {skill}
                           </Badge>
                         ))}
                       </div>
                     </div>
                   </div>
 
                   <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/60">
                     <Button
                       variant={applied ? "secondary" : "accent"}
                       size="sm"
                       onClick={() => applyToJob(job)}
                     >
                       {applied ? (
                         "Already Applied"
                       ) : (
                         <>
                           <ExternalLink className="h-3.5 w-3.5" />
                           Apply Now
                         </>
                       )}
                     </Button>
                     <Button
                       variant="ghost"
                       size="sm"
                       className="text-destructive hover:text-destructive hover:bg-destructive/10"
                       onClick={() => unsaveJob(job.id)}
                     >
                       <Trash2 className="h-3.5 w-3.5" />
                       Remove
                     </Button>
                   </div>
                 </Card>
               );
             })}
           </div>
         )}
       </div>
     </Layout>
   );
 }