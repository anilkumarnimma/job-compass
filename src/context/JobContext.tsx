import { createContext, useContext, ReactNode, useMemo, useState, useCallback } from "react";
import { useApplications, useSavedJobs, useJobActions, useTotalApplicationCount } from "@/hooks/useJobStore";
import { useProfile } from "@/hooks/useProfile";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { Application, SavedJob, Job } from "@/types/job";
import { emitWidgetEvent } from "@/hooks/useWidgetTracker";

interface JobContextType {
  applications: Application[];
  savedJobs: SavedJob[];
  isLoading: boolean;
  applyToJob: (job: any) => void;
  confirmApply: () => void;
  cancelApply: () => void;
  saveJob: (job: any) => void;
  unsaveJob: (jobId: string) => void;
  removeAppliedJob: (jobId: string) => void;
  isApplied: (jobId: string) => boolean;
  isSaved: (jobId: string) => boolean;
  showUpgradeDialog: boolean;
  setShowUpgradeDialog: (open: boolean) => void;
  showApplyConfirm: boolean;
  showProfileGate: boolean;
  setShowProfileGate: (open: boolean) => void;
  profileGateMissingFields: string[];
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const { data: applications = [], isLoading: appsLoading } = useApplications();
  const { data: savedJobs = [], isLoading: savedLoading } = useSavedJobs();
  const { data: totalAppCount = 0 } = useTotalApplicationCount();
  const { applyToJob: rawApply, saveJob: rawSave, unsaveJob, removeAppliedJob } = useJobActions();
  const { profile } = useProfile();
  const { isComplete: profileComplete, missingFields: profileGateMissingFields } = useProfileComplete();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [showProfileGate, setShowProfileGate] = useState(false);
  const [pendingJob, setPendingJob] = useState<Job | null>(null);

  const appliedJobIds = useMemo(() => new Set(applications.map((a) => a.job_id)), [applications]);

  const savedJobIds = useMemo(() => new Set(savedJobs.map((s) => s.job_id)), [savedJobs]);

  const isApplied = (jobId: string) => appliedJobIds.has(jobId);
  const isSaved = (jobId: string) => savedJobIds.has(jobId);

  // Step 1: Open external link + show confirmation dialog
  const applyToJob = useCallback(
    (job: any) => {
      const isPremium = profile?.is_premium === true;
      if (!isPremium && totalAppCount >= 1) {
        setShowUpgradeDialog(true);
        return;
      }
      // Open external link immediately
      window.open(job.external_apply_link, "_blank");
      // Store pending job and show confirmation
      setPendingJob(job);
      setShowApplyConfirm(true);
    },
    [profile?.is_premium, totalAppCount],
  );

  // Step 2a: User confirms they applied
  const confirmApply = useCallback(() => {
    if (pendingJob) {
      rawApply(pendingJob);
      emitWidgetEvent("apply");
    }
    setPendingJob(null);
    setShowApplyConfirm(false);
  }, [pendingJob, rawApply]);

  // Step 2b: User didn't apply yet
  const cancelApply = useCallback(() => {
    setPendingJob(null);
    setShowApplyConfirm(false);
  }, []);

  const value = {
    applications,
    savedJobs,
    isLoading: appsLoading || savedLoading,
    applyToJob,
    confirmApply,
    cancelApply,
    saveJob: (job: any) => { rawSave(job); emitWidgetEvent("save"); },
    unsaveJob,
    removeAppliedJob,
    isApplied,
    isSaved,
    showUpgradeDialog,
    setShowUpgradeDialog,
    showApplyConfirm,
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
