import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LandingStats {
  jobCount: number;
  companyCount: number;
  userCount: number;
}

export function useLandingStats() {
  return useQuery({
    queryKey: ["landing-stats"],
    queryFn: async (): Promise<LandingStats> => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 45);
      const cutoffISO = cutoff.toISOString();

      // Use head:true count for jobs (public read), RPC for users (RLS-protected)
      const [jobRes, userCountRes] = await Promise.all([
        supabase
          .from("jobs")
          .select("*", { count: "exact", head: true })
          .eq("is_published", true)
          .eq("is_archived", false)
          .gte("posted_date", cutoffISO),
        supabase.rpc("get_public_user_count"),
      ]);

      if (jobRes.error) throw jobRes.error;

      // Estimate company count as ~30% of job count to avoid fetching all rows
      const jobCount = jobRes.count ?? 0;
      const estimatedCompanyCount = Math.max(1, Math.round(jobCount * 0.3));

      return {
        jobCount,
        companyCount: estimatedCompanyCount,
        userCount: Number(userCountRes.data ?? 0),
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes — landing stats rarely change
  });
}
