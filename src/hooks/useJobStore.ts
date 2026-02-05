 import { useState, useEffect, useCallback } from "react";
 import { Job, AppliedJob, SavedJob } from "@/types/job";
 
 const APPLIED_JOBS_KEY = "jobtracker_applied";
 const SAVED_JOBS_KEY = "jobtracker_saved";
 
 export function useJobStore() {
   const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
   const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
 
   // Load from localStorage on mount
   useEffect(() => {
     const storedApplied = localStorage.getItem(APPLIED_JOBS_KEY);
     const storedSaved = localStorage.getItem(SAVED_JOBS_KEY);
     
     if (storedApplied) {
       const parsed = JSON.parse(storedApplied);
       setAppliedJobs(parsed.map((j: AppliedJob) => ({
         ...j,
         postedDate: new Date(j.postedDate),
         appliedAt: new Date(j.appliedAt),
       })));
     }
     
     if (storedSaved) {
       const parsed = JSON.parse(storedSaved);
       setSavedJobs(parsed.map((j: SavedJob) => ({
         ...j,
         postedDate: new Date(j.postedDate),
         savedAt: new Date(j.savedAt),
       })));
     }
   }, []);
 
   // Save to localStorage whenever state changes
   useEffect(() => {
     localStorage.setItem(APPLIED_JOBS_KEY, JSON.stringify(appliedJobs));
   }, [appliedJobs]);
 
   useEffect(() => {
     localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(savedJobs));
   }, [savedJobs]);
 
   const applyToJob = useCallback((job: Job) => {
     // Open external link
     window.open(job.externalApplyLink, "_blank");
     
     // Add to applied jobs if not already applied
     setAppliedJobs((prev) => {
       if (prev.some((j) => j.id === job.id)) return prev;
       return [...prev, { ...job, appliedAt: new Date() }];
     });
   }, []);
 
   const saveJob = useCallback((job: Job) => {
     setSavedJobs((prev) => {
       if (prev.some((j) => j.id === job.id)) return prev;
       return [...prev, { ...job, savedAt: new Date() }];
     });
   }, []);
 
   const unsaveJob = useCallback((jobId: string) => {
     setSavedJobs((prev) => prev.filter((j) => j.id !== jobId));
   }, []);
 
   const removeAppliedJob = useCallback((jobId: string) => {
     setAppliedJobs((prev) => prev.filter((j) => j.id !== jobId));
   }, []);
 
   const isApplied = useCallback((jobId: string) => {
     return appliedJobs.some((j) => j.id === jobId);
   }, [appliedJobs]);
 
   const isSaved = useCallback((jobId: string) => {
     return savedJobs.some((j) => j.id === jobId);
   }, [savedJobs]);
 
   return {
     appliedJobs,
     savedJobs,
     applyToJob,
     saveJob,
     unsaveJob,
     removeAppliedJob,
     isApplied,
     isSaved,
   };
 }