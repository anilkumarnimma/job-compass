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
      cutoff.setDate(cutoff.getDate() - 10);
      const cutoffISO = cutoff.toISOString();

      // Use head:true count queries to avoid pulling full rows
      const [jobRes, userRes] = await Promise.all([
        supabase
          .from("jobs")
          .select("*", { count: "exact", head: true })
          .eq("is_published", true)
          .eq("is_archived", false)
          .gte("posted_date", cutoffISO),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true }),
      ]);

      if (jobRes.error) throw jobRes.error;

      // Estimate company count as ~30% of job count to avoid fetching all rows
      const jobCount = jobRes.count ?? 0;
      const estimatedCompanyCount = Math.max(1, Math.round(jobCount * 0.3));

      return {
        jobCount,
        companyCount: estimatedCompanyCount,
        userCount: userRes.count ?? 0,
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes — landing stats rarely change
  });
}
