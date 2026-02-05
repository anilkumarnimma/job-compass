 import { Layout } from "@/components/Layout";
 import { Button } from "@/components/ui/button";
 import { Card } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { useJobs } from "@/context/JobContext";
 import { format } from "date-fns";
 import { ExternalLink, Trash2, Briefcase, Calendar } from "lucide-react";
 import { Link } from "react-router-dom";
 
 export default function Applied() {
   const { appliedJobs, removeAppliedJob } = useJobs();
 
   const sortedJobs = [...appliedJobs].sort(
     (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
   );
 
   return (
     <Layout>
       <div className="container max-w-4xl mx-auto px-4 py-8">
         {/* Header */}
         <div className="mb-8">
           <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
             Applied Jobs
           </h1>
           <p className="text-muted-foreground">
             Track all the positions you've applied to
           </p>
         </div>
 
         {/* Job List */}
         {sortedJobs.length === 0 ? (
           <Card className="p-12 text-center border-border/60">
             <Briefcase className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
             <h3 className="font-semibold text-foreground mb-2">No applications yet</h3>
             <p className="text-muted-foreground mb-6">
               Start applying to jobs and they'll appear here
             </p>
             <Link to="/dashboard">
               <Button variant="accent">Browse Jobs</Button>
             </Link>
           </Card>
         ) : (
           <div className="space-y-4">
             {sortedJobs.map((job) => (
               <Card key={job.id} className="p-5 border-border/60 animate-fade-in">
                 <div className="flex items-start justify-between gap-4">
                   <div className="flex-1 min-w-0">
                     <div className="flex items-start gap-3 mb-2">
                       <div className="flex-1 min-w-0">
                         <h3 className="font-semibold text-foreground text-lg leading-tight truncate">
                           {job.title}
                         </h3>
                         <p className="text-muted-foreground font-medium">{job.company}</p>
                       </div>
                       {job.isReviewing && (
                         <Badge variant="success" className="shrink-0">
                           Actively Reviewing
                         </Badge>
                       )}
                     </div>
 
                     <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                       <span className="flex items-center gap-1.5">
                         <Calendar className="h-3.5 w-3.5" />
                         Applied {format(job.appliedAt, "MMM d, yyyy 'at' h:mm a")}
                       </span>
                     </div>
 
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
                     variant="outline"
                     size="sm"
                     onClick={() => window.open(job.externalApplyLink, "_blank")}
                   >
                     <ExternalLink className="h-3.5 w-3.5" />
                     View Job
                   </Button>
                   <Button
                     variant="ghost"
                     size="sm"
                     className="text-destructive hover:text-destructive hover:bg-destructive/10"
                     onClick={() => removeAppliedJob(job.id)}
                   >
                     <Trash2 className="h-3.5 w-3.5" />
                     Remove
                   </Button>
                 </div>
               </Card>
             ))}
           </div>
         )}
       </div>
     </Layout>
   );
 }