import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Job } from "@/types/job";
import { expandSearchTerms } from "@/lib/searchExpansion";

const PAGE_SIZE = 20;
const STALE_TIME = 60 * 1000;

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
    employment_type: row.employment_type || "Full Time",
    experience_years: row.experience_years,
    posted_date: new Date(row.posted_date),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    is_archived: row.is_archived,
  };
}

interface UseJobSearchPaginatedOptions {
  searchQuery: string;
  page: number;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export function useJobSearchPaginated({ searchQuery, page, dateFrom, dateTo }: UseJobSearchPaginatedOptions) {
  return useQuery({
    queryKey: ["jobs", "paginated", searchQuery, page, dateFrom, dateTo],
    queryFn: async () => {
      const trimmed = searchQuery.trim();

      // Use the search_jobs RPC with expanded terms for intelligent matching
      if (trimmed) {
        const expandedTerms = expandSearchTerms(trimmed);
        const { data, error, count } = await supabase.rpc("search_jobs", {
          search_query: trimmed,
          page_size: PAGE_SIZE,
          page_offset: (page - 1) * PAGE_SIZE,
          filter_tab: "all",
          expanded_terms: expandedTerms.length > 0 ? expandedTerms : undefined,
        });

        if (error) throw error;

        const jobs = (data || []).map(parseJob);

        // Apply date filters client-side (RPC doesn't support date range)
        const filtered = jobs.filter(j => {
          if (dateFrom && j.posted_date < new Date(dateFrom)) return false;
          if (dateTo) {
            const to = new Date(dateTo);
            to.setDate(to.getDate() + 1);
            if (j.posted_date >= to) return false;
          }
          return true;
        });

        return {
          jobs: filtered,
          totalCount: filtered.length,
          totalPages: Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
        };
      }

      // No search query — use direct table query
      let query = supabase
        .from("jobs")
        .select("*", { count: "exact" })
        .eq("is_published", true)
        .eq("is_archived", false)
        .order("posted_date", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (dateFrom) {
        query = query.gte("posted_date", dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setDate(toDate.getDate() + 1);
        query = query.lt("posted_date", toDate.toISOString().split("T")[0]);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        jobs: (data || []).map(parseJob),
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / PAGE_SIZE),
      };
    },
    staleTime: STALE_TIME,
    placeholderData: (prev) => prev,
  });
}
