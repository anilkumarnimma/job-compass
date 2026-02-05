 import React, { createContext, useContext, ReactNode } from "react";
 import { useJobStore } from "@/hooks/useJobStore";
 import { Job, AppliedJob, SavedJob } from "@/types/job";
 
 interface JobContextType {
   appliedJobs: AppliedJob[];
   savedJobs: SavedJob[];
   applyToJob: (job: Job) => void;
   saveJob: (job: Job) => void;
   unsaveJob: (jobId: string) => void;
   removeAppliedJob: (jobId: string) => void;
   isApplied: (jobId: string) => boolean;
   isSaved: (jobId: string) => boolean;
 }
 
 const JobContext = createContext<JobContextType | undefined>(undefined);
 
 export function JobProvider({ children }: { children: ReactNode }) {
   const store = useJobStore();
 
   return (
     <JobContext.Provider value={store}>
       {children}
     </JobContext.Provider>
   );
 }
 
 export function useJobs() {
   const context = useContext(JobContext);
   if (context === undefined) {
     throw new Error("useJobs must be used within a JobProvider");
   }
   return context;
 }