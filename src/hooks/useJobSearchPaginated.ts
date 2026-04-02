import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Job } from "@/types/job";
import { expandSearchTerms } from "@/lib/searchExpansion";
import { enrichJobList } from "@/lib/jobEnrichment";

import { VisaFilter, filterJobsByVisa } from "@/lib/visaSponsorship";

const PAGE_SIZE = 20;
const VISA_BATCH_SIZE = 200; // Fetch more when visa filtering to ensure enough results
const STALE_TIME = 2 * 60 * 1000; // 2 minutes

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
  // Fetch the page of results
  const jobsQuery = useQuery({
    queryKey: ["jobs", "paginated", searchQuery, page, dateFrom, dateTo],
    queryFn: async () => {
      const trimmed = searchQuery.trim();

      if (trimmed) {
        const expandedTerms = expandSearchTerms(trimmed);
        const { data, error } = await supabase.rpc("search_jobs", {
          search_query: trimmed,
          page_size: PAGE_SIZE,
          page_offset: (page - 1) * PAGE_SIZE,
          filter_tab: "all",
          expanded_terms: expandedTerms.length > 0 ? expandedTerms : undefined,
        });

        if (error) throw error;

        let jobs = (data || []).map(parseJob);

        // Apply date filters client-side (RPC doesn't support date range)
        if (dateFrom || dateTo) {
          jobs = jobs.filter(j => {
            if (dateFrom && j.posted_date < new Date(dateFrom)) return false;
            if (dateTo) {
              const to = new Date(dateTo);
              to.setDate(to.getDate() + 1);
              if (j.posted_date >= to) return false;
            }
            return true;
          });
        }

        return { jobs: enrichJobList(jobs) };
      }

      // No search query — use direct table query with 15-day cutoff
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 15);
      let query = supabase
        .from("jobs")
        .select("*", { count: "exact" })
        .eq("is_published", true)
        .eq("is_archived", false)
        .gte("posted_date", cutoff.toISOString())
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
        jobs: enrichJobList((data || []).map(parseJob)),
        directCount: count || 0,
      };
    },
    staleTime: STALE_TIME,
    placeholderData: (prev) => prev,
  });

  // Fetch the total count separately for accurate numbers
  const countQuery = useQuery({
    queryKey: ["jobs", "count", searchQuery],
    queryFn: async () => {
      const trimmed = searchQuery.trim();

      if (trimmed) {
        const expandedTerms = expandSearchTerms(trimmed);
        const { data, error } = await supabase.rpc("count_search_jobs", {
          search_query: trimmed,
          expanded_terms: expandedTerms.length > 0 ? expandedTerms : undefined,
        });
        if (error) throw error;
        return Number(data) || 0;
      }

      // No search — count all published non-archived within 15 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 15);
      const { count, error } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("is_published", true)
        .eq("is_archived", false)
        .gte("posted_date", cutoff.toISOString());
      if (error) throw error;
      return count || 0;
    },
    staleTime: STALE_TIME,
  });

  const totalCount = countQuery.data ?? (jobsQuery.data as any)?.directCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    data: {
      jobs: jobsQuery.data?.jobs || [],
      totalCount,
      totalPages,
    },
    isLoading: jobsQuery.isLoading,
  };
}
