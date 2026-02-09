import { createContext, useContext, ReactNode, useMemo, useState, useCallback } from "react";
import { useApplications, useSavedJobs, useJobActions } from "@/hooks/useJobStore";
import { useProfile } from "@/hooks/useProfile";
import { Application, SavedJob } from "@/types/job";

interface JobContextType {
  applications: Application[];
  savedJobs: SavedJob[];
  isLoading: boolean;
  applyToJob: (job: any) => void;
  saveJob: (job: any) => void;
  unsaveJob: (jobId: string) => void;
  removeAppliedJob: (jobId: string) => void;
  isApplied: (jobId: string) => boolean;
  isSaved: (jobId: string) => boolean;
  showUpgradeDialog: boolean;
  setShowUpgradeDialog: (open: boolean) => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const { data: applications = [], isLoading: appsLoading } = useApplications();
  const { data: savedJobs = [], isLoading: savedLoading } = useSavedJobs();
  const { applyToJob: rawApply, saveJob, unsaveJob, removeAppliedJob } = useJobActions();
  const { profile } = useProfile();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

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

  const applyToJob = useCallback((job: any) => {
    const isPremium = profile?.is_premium ?? false;
    if (!isPremium && applications.length >= 1) {
      setShowUpgradeDialog(true);
      return;
    }
    rawApply(job);
  }, [profile, applications.length, rawApply]);

  const value = {
    applications,
    savedJobs,
    isLoading: appsLoading || savedLoading,
    applyToJob,
    saveJob,
    unsaveJob,
    removeAppliedJob,
    isApplied,
    isSaved,
    showUpgradeDialog,
    setShowUpgradeDialog,
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
