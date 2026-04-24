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

      const [jobRes, companiesRes, userCountRes] = await Promise.all([
        supabase
          .from("jobs")
          .select("*", { count: "exact", head: true })
          .eq("is_published", true)
          .eq("is_archived", false)
          .eq("is_direct_apply", true)
          .is("deleted_at", null)
          .gte("posted_date", cutoffISO),
        supabase
          .from("jobs")
          .select("company")
          .eq("is_published", true)
          .eq("is_archived", false)
          .eq("is_direct_apply", true)
          .is("deleted_at", null)
          .gte("posted_date", cutoffISO),
        supabase.rpc("get_public_user_count"),
      ]);

      if (jobRes.error) throw jobRes.error;
      if (companiesRes.error) throw companiesRes.error;
      if (userCountRes.error) throw userCountRes.error;

      const jobCount = jobRes.count ?? 0;
      const companyCount = new Set(
        (companiesRes.data ?? [])
          .map((row) => row.company?.trim().toLowerCase())
          .filter((company): company is string => Boolean(company))
      ).size;

      return {
        jobCount,
        companyCount,
        userCount: Number(userCountRes.data ?? 0),
      };
    },
    staleTime: 60 * 1000,
  });
}
