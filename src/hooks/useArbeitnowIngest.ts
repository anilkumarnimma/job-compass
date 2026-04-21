import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface IngestRun {
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

export function useArbeitnowRuns() {
  return useQuery({
    queryKey: ["arbeitnow-runs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("arbeitnow_ingest_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as unknown) as IngestRun[];
    },
    refetchInterval: 5000,
  });
}

export function useRunArbeitnowIngest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (seedId?: string) => {
      const { data, error } = await supabase.functions.invoke("ingest-arbeitnow", {
        body: seedId ? { seed_id: seedId } : {},
      });
      if (error) throw error;
      return data as { success: boolean; run_id: string; seeds_count: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["arbeitnow-runs"] });
      toast.success(
        `Arbeitnow ingest started for ${data.seeds_count} queries — watch progress below`
      );
    },
    onError: (e: Error) => {
      toast.error(e.message || "Arbeitnow ingest failed");
    },
  });
}
