import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MuseSeed {
  id: string;
  category: string;
  level: string;
  location: string;
  is_active: boolean;
  sort_order: number;
  last_run_at: string | null;
  last_imported_count: number | null;
}

export interface MuseRun {
  id: string;
  trigger_type: string;
  total_fetched: number;
  total_imported: number;
  total_skipped: number;
  total_filtered: number;
  duplicates_removed: number;
  duration_ms: number | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  errors: Array<{ query: string; error: string }> | null;
  details: { per_query?: Array<{ query: string; fetched: number; imported: number }> } | null;
}

export function useMuseSeeds() {
  return useQuery({
    queryKey: ["muse-seeds"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("muse_query_seeds")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as MuseSeed[];
    },
  });
}

export function useMuseRuns() {
  return useQuery({
    queryKey: ["muse-runs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("muse_ingest_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as unknown) as MuseRun[];
    },
    refetchInterval: 5000,
  });
}

export function useToggleMuseSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("muse_query_seeds")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["muse-seeds"] }),
  });
}

export function useAddMuseSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (seed: { category: string; level: string; location: string }) => {
      const { data: existing } = await (supabase as any)
        .from("muse_query_seeds")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = ((existing as any)?.sort_order || 0) + 1;
      const { error } = await (supabase as any)
        .from("muse_query_seeds")
        .insert({ ...seed, sort_order: nextOrder });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["muse-seeds"] });
      toast.success("Muse query added");
    },
  });
}

export function useDeleteMuseSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("muse_query_seeds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["muse-seeds"] });
      toast.success("Muse query removed");
    },
  });
}

export function useRunMuseIngest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (seedId?: string) => {
      const { data, error } = await supabase.functions.invoke("ingest-muse", {
        body: seedId ? { seed_id: seedId } : {},
      });
      if (error) throw error;
      return data as {
        success: boolean;
        run_id: string;
        seeds_count: number;
      };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["muse-runs"] });
      qc.invalidateQueries({ queryKey: ["muse-seeds"] });
      toast.success(`Muse ingest started for ${data.seeds_count} queries — watch progress below`);
    },
    onError: (e: Error) => {
      toast.error(e.message || "Muse ingest failed");
    },
  });
}
