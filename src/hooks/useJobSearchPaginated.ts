import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Job } from "@/types/job";
import { expandSearchTerms } from "@/lib/searchExpansion";
import { enrichJobList } from "@/lib/jobEnrichment";
import { useEffect, useRef } from "react";

import { VisaFilter, filterJobsByVisa } from "@/lib/visaSponsorship";
import { useDebounce } from "@/hooks/useDebounce";
import { hasEntryLevelIntent, stripEntryLevelKeywords } from "@/lib/jobFilters";

const PAGE_SIZE = 20;
const VISA_BATCH_SIZE = 200;
const STALE_TIME = 5 * 60 * 1000; // 5 minutes

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
  visaFilter?: VisaFilter;
}

async function fetchJobsPage(
  searchQuery: string,
  page: number,
  dateFrom: string | null | undefined,
  dateTo: string | null | undefined,
  visaFilter: VisaFilter,
  signal?: AbortSignal,
) {
  const trimmed = searchQuery.trim();
  const isVisaFiltered = visaFilter !== "all";
  let allJobs: Job[] = [];

  if (trimmed) {
    const expandedTerms = expandSearchTerms(trimmed);
    const fetchSize = isVisaFiltered ? VISA_BATCH_SIZE : PAGE_SIZE;
    const fetchOffset = isVisaFiltered ? 0 : (page - 1) * PAGE_SIZE;

    let rpcQuery = supabase.rpc("search_jobs", {
      search_query: trimmed,
      page_size: fetchSize,
      page_offset: fetchOffset,
      filter_tab: "all",
      expanded_terms: expandedTerms.length > 0 ? expandedTerms : undefined,
    });

    if (signal) {
      rpcQuery = rpcQuery.abortSignal(signal);
    }

    const { data, error } = await rpcQuery;

    if (error) throw error;
    allJobs = (data || []).map(parseJob);

    if (dateFrom || dateTo) {
      allJobs = allJobs.filter(j => {
        if (dateFrom && j.posted_date < new Date(dateFrom)) return false;
        if (dateTo) {
          const to = new Date(dateTo);
          to.setDate(to.getDate() + 1);
          if (j.posted_date >= to) return false;
        }
        return true;
      });
    }
  } else {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 15);

    const fetchSize = isVisaFiltered ? VISA_BATCH_SIZE : PAGE_SIZE;
    const rangeStart = isVisaFiltered ? 0 : (page - 1) * PAGE_SIZE;
    const rangeEnd = rangeStart + fetchSize - 1;

    let query = supabase
      .from("jobs")
      .select("*", { count: "exact" })
      .eq("is_published", true)
      .eq("is_archived", false)
      .gte("posted_date", cutoff.toISOString())
      .order("posted_date", { ascending: false })
      .range(rangeStart, rangeEnd);

    if (dateFrom) query = query.gte("posted_date", dateFrom);
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setDate(toDate.getDate() + 1);
      query = query.lt("posted_date", toDate.toISOString().split("T")[0]);
    }

    if (signal) {
      query = query.abortSignal(signal);
    }

    const { data, error } = await query;
    if (error) throw error;
    allJobs = (data || []).map(parseJob);
  }

  let filteredJobs = enrichJobList(allJobs);
  if (isVisaFiltered) {
    filteredJobs = filterJobsByVisa(filteredJobs, visaFilter);
  }

  if (isVisaFiltered) {
    const totalFiltered = filteredJobs.length;
    const startIdx = (page - 1) * PAGE_SIZE;
    const pageJobs = filteredJobs.slice(startIdx, startIdx + PAGE_SIZE);
    return { jobs: pageJobs, visaFilteredCount: totalFiltered };
  }

  return { jobs: filteredJobs };
}

export function useJobSearchPaginated({ searchQuery, page, dateFrom, dateTo, visaFilter = "all" }: UseJobSearchPaginatedOptions) {
  const queryClient = useQueryClient();
  const isVisaFiltered = visaFilter !== "all";
  const debouncedCountSearch = useDebounce(searchQuery, 450);

  // Cancel stale in-flight queries when search changes (not on unmount)
  const prevSearchRef = useRef(searchQuery);
  useEffect(() => {
    if (prevSearchRef.current !== searchQuery) {
      queryClient.cancelQueries({ queryKey: ["jobs", "paginated", prevSearchRef.current] });
      prevSearchRef.current = searchQuery;
    }
  }, [searchQuery, queryClient]);

  const jobsQuery = useQuery({
    queryKey: ["jobs", "paginated", searchQuery, page, dateFrom, dateTo, visaFilter],
    queryFn: ({ signal }) => fetchJobsPage(searchQuery, page, dateFrom, dateTo, visaFilter, signal),
    staleTime: STALE_TIME,
    placeholderData: (prev) => prev,
  });

  // Prefetch next page in background for instant navigation
  useEffect(() => {
    if (!isVisaFiltered && jobsQuery.data && jobsQuery.data.jobs.length === PAGE_SIZE) {
      const nextPage = page + 1;
      queryClient.prefetchQuery({
        queryKey: ["jobs", "paginated", searchQuery, nextPage, dateFrom, dateTo, visaFilter],
        queryFn: () => fetchJobsPage(searchQuery, nextPage, dateFrom, dateTo, visaFilter),
        staleTime: STALE_TIME,
      });
    }
  }, [queryClient, searchQuery, page, dateFrom, dateTo, visaFilter, isVisaFiltered, jobsQuery.data]);

  const countQuery = useQuery({
    queryKey: ["jobs", "count", debouncedCountSearch],
    queryFn: async ({ signal }) => {
      const trimmed = debouncedCountSearch.trim();
      if (trimmed) {
        const expandedTerms = expandSearchTerms(trimmed);
        let rpcQuery = supabase.rpc("count_search_jobs", {
          search_query: trimmed,
          expanded_terms: expandedTerms.length > 0 ? expandedTerms : undefined,
        });

        if (signal) {
          rpcQuery = rpcQuery.abortSignal(signal);
        }

        const { data, error } = await rpcQuery;
        if (error) throw error;
        return Number(data) || 0;
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 15);
      let baseCountQuery = supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("is_published", true)
        .eq("is_archived", false)
        .gte("posted_date", cutoff.toISOString());

      if (signal) {
        baseCountQuery = baseCountQuery.abortSignal(signal);
      }

      const { count, error } = await baseCountQuery;
      if (error) throw error;
      return count || 0;
    },
    staleTime: STALE_TIME,
    enabled: !isVisaFiltered,
  });

  const visaFilteredCount = (jobsQuery.data as any)?.visaFilteredCount;
  const totalCount = isVisaFiltered
    ? (visaFilteredCount ?? 0)
    : (countQuery.data ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    data: {
      jobs: jobsQuery.data?.jobs || [],
      totalCount,
      totalPages,
    },
    isLoading: jobsQuery.isLoading,
    isFetching: jobsQuery.isFetching,
  };
}
