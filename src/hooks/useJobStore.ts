import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Job, Application, SavedJob } from "@/types/job";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { enrichJobList } from "@/lib/jobEnrichment";

// Helper to parse job from DB
function parseJob(row: any): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    company_logo: row.company_logo,
    location: row.location,
    description: row.description,
    skills: row.skills || [],
    external_apply_link: row.external_apply_link,
    is_published: row.is_published,
    is_reviewing: row.is_reviewing,
    salary_range: row.salary_range,
    employment_type: row.employment_type || 'Full Time',
    experience_years: row.experience_years,
    posted_date: new Date(row.posted_date),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 15);
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("is_published", true)
        .eq("is_archived", false)
        .gte("posted_date", cutoff.toISOString())
        .order("posted_date", { ascending: false })
        .limit(200);

      if (error) throw error;
      return enrichJobList((data || []).map(parseJob));
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch only visible (status='applied') applications for UI display
export function useApplications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["applications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          job:jobs(*)
        `)
        .eq("user_id", user.id)
        .eq("status", "applied")
        .order("applied_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        job_id: row.job_id,
        status: row.status as 'applied' | 'withdrawn',
        applied_at: new Date(row.applied_at),
        updated_at: new Date(row.updated_at),
        job: row.job ? parseJob(row.job) : undefined,
      })) as Application[];
    },
    enabled: !!user,
  });
}

// Count ALL applications (including withdrawn) for free limit enforcement
export function useTotalApplicationCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["application-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });
}

export function useSavedJobs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["saved_jobs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("saved_jobs")
        .select(`
          *,
          job:jobs(*)
        `)
        .eq("user_id", user.id)
        .order("saved_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        job_id: row.job_id,
        saved_at: new Date(row.saved_at),
        job: row.job ? parseJob(row.job) : undefined,
      })) as SavedJob[];
    },
    enabled: !!user,
  });
}

export function useJobActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const applyMutation = useMutation({
    mutationFn: async (job: Job) => {
      if (!user) throw new Error("Must be logged in to apply");

      const { error } = await supabase.from("applications").insert({
        user_id: user.id,
        job_id: job.id,
        status: "applied",
      });

      if (error && error.code !== "23505") throw error;
      return job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["application-count"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Application tracked!");
    },
    onError: (error) => {
      toast.error("Failed to track application: " + error.message);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (job: Job) => {
      if (!user) throw new Error("Must be logged in to save jobs");

      const { error } = await supabase.from("saved_jobs").insert({
        user_id: user.id,
        job_id: job.id,
      });

      if (error && error.code !== "23505") throw error;
      return job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_jobs"] });
      toast.success("Job saved!");
    },
    onError: (error) => {
      toast.error("Failed to save job: " + error.message);
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!user) throw new Error("Must be logged in");

      const { error } = await supabase
        .from("saved_jobs")
        .delete()
        .eq("user_id", user.id)
        .eq("job_id", jobId);

      if (error) throw error;
      return jobId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_jobs"] });
      toast.success("Job removed from saved");
    },
  });

  // "Remove" from Applied = set status to 'withdrawn' (NOT delete)
  const removeApplicationMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!user) throw new Error("Must be logged in");

      const { error } = await supabase
        .from("applications")
        .update({ status: "withdrawn", updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("job_id", jobId);

      if (error) throw error;
      return jobId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      // Don't invalidate application-count — withdrawn still counts
      toast.success("Application removed from list");
    },
  });

  const applyToJob = useCallback(
    (job: Job) => applyMutation.mutate(job),
    [applyMutation]
  );

  const saveJob = useCallback(
    (job: Job) => saveMutation.mutate(job),
    [saveMutation]
  );

  const unsaveJob = useCallback(
    (jobId: string) => unsaveMutation.mutate(jobId),
    [unsaveMutation]
  );

  const removeAppliedJob = useCallback(
    (jobId: string) => removeApplicationMutation.mutate(jobId),
    [removeApplicationMutation]
  );

  return {
    applyToJob,
    saveJob,
    unsaveJob,
    removeAppliedJob,
    isApplying: applyMutation.isPending,
    isSaving: saveMutation.isPending,
  };
}
