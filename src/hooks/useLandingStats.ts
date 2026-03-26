import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LandingStats {
  jobCount: number;
  companyCount: number;
}

export function useLandingStats() {
  return useQuery({
    queryKey: ["landing-stats"],
    queryFn: async (): Promise<LandingStats> => {
      const { count: jobCount, error: jobError } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("is_published", true)
        .eq("is_archived", false);

      if (jobError) throw jobError;

      const { data: companies, error: companyError } = await supabase
        .from("jobs")
        .select("company")
        .eq("is_published", true)
        .eq("is_archived", false);

      if (companyError) throw companyError;

      const uniqueCompanies = new Set(companies?.map((j) => j.company.toLowerCase().trim()));

      return {
        jobCount: jobCount ?? 1000,
        companyCount: uniqueCompanies.size || 100,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
