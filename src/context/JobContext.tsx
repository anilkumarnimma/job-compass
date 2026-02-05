 import { createContext, useContext, ReactNode, useMemo } from "react";
 import { useJobs as useJobsQuery, useApplications, useSavedJobs, useJobActions } from "@/hooks/useJobStore";
 import { Job, Application, SavedJob } from "@/types/job";
 
 interface JobContextType {
   jobs: Job[];
   applications: Application[];
   savedJobs: SavedJob[];
   isLoading: boolean;
   applyToJob: (job: Job) => void;
   saveJob: (job: Job) => void;
   unsaveJob: (jobId: string) => void;
   removeAppliedJob: (jobId: string) => void;
   isApplied: (jobId: string) => boolean;
   isSaved: (jobId: string) => boolean;
 }
 
 const JobContext = createContext<JobContextType | undefined>(undefined);
 
 export function JobProvider({ children }: { children: ReactNode }) {
   const { data: jobs = [], isLoading: jobsLoading } = useJobsQuery();
   const { data: applications = [], isLoading: appsLoading } = useApplications();
   const { data: savedJobs = [], isLoading: savedLoading } = useSavedJobs();
   const { applyToJob, saveJob, unsaveJob, removeAppliedJob } = useJobActions();
 
   const appliedJobIds = useMemo(
     () => new Set(applications.map((a) => a.job_id)),
     [applications]
   );
 
   const savedJobIds = useMemo(
     () => new Set(savedJobs.map((s) => s.job_id)),
     [savedJobs]
   );
 
   const isApplied = (jobId: string) => appliedJobIds.has(jobId);
   const isSaved = (jobId: string) => savedJobIds.has(jobId);
 
   const value = {
     jobs,
     applications,
     savedJobs,
     isLoading: jobsLoading || appsLoading || savedLoading,
     applyToJob,
     saveJob,
     unsaveJob,
     removeAppliedJob,
     isApplied,
     isSaved,
   };
 
   return <JobContext.Provider value={value}>{children}</JobContext.Provider>;
 }
 
 export function useJobContext() {
   const context = useContext(JobContext);
   if (context === undefined) {
     throw new Error("useJobContext must be used within a JobProvider");
   }
   return context;
 }