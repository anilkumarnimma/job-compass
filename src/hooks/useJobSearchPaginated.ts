import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Job } from "@/types/job";
import { expandSearchQuery } from "@/lib/searchSynonyms";

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
  // Expand the query with semantic synonyms
  const expandedTerms = searchQuery ? expandSearchQuery(searchQuery).slice(1) : [];

  return useQuery({
    queryKey: ["jobs", "paginated", searchQuery, page, dateFrom, dateTo],
    queryFn: async () => {
      // Determine the tab filter based on date range
      let filterTab = "all";
      if (dateFrom) {
        const today = new Date();
        const todayStr = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().split("T")[0];
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString().split("T")[0];

        if (dateFrom === todayStr && !dateTo) {
          filterTab = "today";
        } else if (dateFrom === yesterdayStr && dateTo === todayStr) {
          filterTab = "yesterday";
        }
      }

      // Use the search_jobs RPC with expanded terms for semantic matching
      const { data, error } = await supabase.rpc("search_jobs", {
        search_query: searchQuery || null,
        page_size: PAGE_SIZE,
        page_offset: (page - 1) * PAGE_SIZE,
        filter_tab: filterTab !== "all" || !dateFrom ? filterTab : "all",
        expanded_terms: expandedTerms.length > 0 ? expandedTerms : undefined,
      } as any);

      if (error) throw error;

      let jobs = (data || []).map(parseJob);

      // Apply custom date filtering if needed (for custom date ranges not handled by filterTab)
      if (dateFrom && filterTab === "all") {
        const fromDate = new Date(dateFrom);
        jobs = jobs.filter(j => j.posted_date >= fromDate);
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setDate(toDate.getDate() + 1);
          jobs = jobs.filter(j => j.posted_date < toDate);
        }
      }

      // Estimate total count for pagination
      const rawLength = (data || []).length;
      let totalCount = jobs.length;
      if (rawLength >= PAGE_SIZE) {
        totalCount = page * PAGE_SIZE + PAGE_SIZE;
      }

      return {
        jobs,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
      };
    },
    staleTime: STALE_TIME,
    placeholderData: (prev) => prev,
  });
}
