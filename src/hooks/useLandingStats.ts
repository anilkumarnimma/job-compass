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
      const [jobRes, companyRes, userRes] = await Promise.all([
        supabase
          .from("jobs")
          .select("*", { count: "exact", head: true })
          .eq("is_published", true)
          .eq("is_archived", false),
        supabase
          .from("jobs")
          .select("company")
          .eq("is_published", true)
          .eq("is_archived", false),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true }),
      ]);

      if (jobRes.error) throw jobRes.error;
      if (companyRes.error) throw companyRes.error;

      const uniqueCompanies = new Set(companyRes.data?.map((j) => j.company.toLowerCase().trim()));

      return {
        jobCount: jobRes.count ?? 0,
        companyCount: uniqueCompanies.size || 0,
        userCount: userRes.count ?? 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
