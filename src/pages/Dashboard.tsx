import { useState, useMemo, useCallback, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { SearchBar } from "@/components/SearchBar";
import { RightSidebar } from "@/components/RightSidebar";
import { MobileJobPreviewSheet } from "@/components/MobileJobPreviewSheet";
import { JobPreviewPanel } from "@/components/JobPreviewPanel";
import { JobListPaginated } from "@/components/JobListPaginated";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { ApplyConfirmDialog } from "@/components/ApplyConfirmDialog";
import { useJobSearchPaginated } from "@/hooks/useJobSearchPaginated";
import { useDebounce } from "@/hooks/useDebounce";
import { useJobContext } from "@/context/JobContext";
import { Job } from "@/types/job";
import { X, SlidersHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

import { cn } from "@/lib/utils";

const DATE_FILTER_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "3d", label: "Last 3 days" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

function getDateFromFilter(filter: string): string | null {
  if (filter === "all") return null;
  const now = new Date();
  switch (filter) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split("T")[0];
    case "yesterday": {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      return d.toISOString().split("T")[0];
    }
    case "3d": {
      const d = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      return d.toISOString().split("T")[0];
    }
    case "7d": {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d.toISOString().split("T")[0];
    }
    case "30d": {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return d.toISOString().split("T")[0];
    }
    default:
      return null;
  }
}

export default function Dashboard() {
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [mobilePreviewJob, setMobilePreviewJob] = useState<Job | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("today");
  const isMobile = useIsMobile();
  const { showUpgradeDialog, setShowUpgradeDialog, showApplyConfirm, confirmApply, cancelApply } = useJobContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // Detect premium=true redirect from Stripe
  useEffect(() => {
    if (searchParams.get("premium") === "true") {
      toast({
        title: "🎉 Premium unlocked!",
        description: "You can now apply to unlimited jobs.",
      });
      searchParams.delete("premium");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  const debouncedSearch = useDebounce(searchInput, 300);

  const combinedSearchQuery = useMemo(() => {
    const parts: string[] = [];
    if (debouncedSearch.trim()) parts.push(debouncedSearch);
    if (roleFilter) parts.push(roleFilter);
    if (companyFilter) parts.push(companyFilter);
    return parts.join(" ");
  }, [debouncedSearch, roleFilter, companyFilter]);

  const dateFrom = useMemo(() => getDateFromFilter(dateFilter), [dateFilter]);

  // Reset page when search/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [combinedSearchQuery, dateFilter]);

  const {
    data,
    isLoading,
  } = useJobSearchPaginated({
    searchQuery: combinedSearchQuery,
    page: currentPage,
    dateFrom,
    dateTo: null,
  });

  const { isApplied } = useJobContext();

  const jobs = useMemo(() => {
    return (data?.jobs || []).filter((job) => !isApplied(job.id));
  }, [data, isApplied]);

  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleJobTap = useCallback((job: Job) => {
    if (isMobile) {
      setMobilePreviewJob(job);
      setMobileSheetOpen(true);
    } else {
      setSelectedJob(prev => prev?.id === job.id ? null : job);
    }
  }, [isMobile]);

  const handleFilterByRole = useCallback((role: string) => {
    setRoleFilter(role);
    setCompanyFilter(null);
  }, []);

  const clearFilters = useCallback(() => {
    setRoleFilter(null);
    setCompanyFilter(null);
  }, []);

  const hasActiveFilter = roleFilter || companyFilter;

  return (
    <Layout>
      <div className="w-full max-w-[1280px] mx-auto px-4 md:px-6 py-6">
        <div className="flex gap-8 justify-center">
          {/* Main Content */}
          <div className="flex-1 max-w-[600px]">
            {/* Header */}
            <div className="mb-6">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
                Job Board
              </h1>
              <p className="text-muted-foreground text-sm">
                {totalCount.toLocaleString()} job{totalCount !== 1 ? 's' : ''} available
              </p>
            </div>

            {/* Search */}
            <div className="mb-4">
              <SearchBar
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search by job title, company, or skills"
              />
            </div>

            {/* Posted Date Filter - pill buttons */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              {DATE_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDateFilter(opt.value)}
                  className={cn(
                    "h-8 px-3.5 text-sm rounded-full border transition-all duration-200",
                    dateFilter === opt.value
                      ? "bg-accent text-accent-foreground border-accent font-medium shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:border-accent/50 hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Active Role/Company Filters */}
            {hasActiveFilter && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">Filtered by:</span>
                {roleFilter && (
                  <Badge 
                    variant="secondary" 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent cursor-pointer hover:bg-accent/20 transition-colors"
                    onClick={clearFilters}
                  >
                    Role: {roleFilter}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                {companyFilter && (
                  <Badge 
                    variant="secondary" 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
                    onClick={clearFilters}
                  >
                    Company: {companyFilter}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
              </div>
            )}

            {/* Job List with Pagination */}
            <JobListPaginated
              jobs={jobs}
              isLoading={isLoading}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onTap={handleJobTap}
              selectedJobId={selectedJob?.id}
            />
          </div>

          {/* Right Sidebar - Desktop only */}
          <div className="hidden lg:block w-[380px] shrink-0">
            <div className="sticky top-[88px] space-y-4">
              {selectedJob && (
                <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
                  <JobPreviewPanel job={selectedJob} />
                </div>
              )}
              <RightSidebar onFilterByRole={handleFilterByRole} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Job Preview Sheet */}
      <MobileJobPreviewSheet 
        job={mobilePreviewJob}
        open={mobileSheetOpen}
        onOpenChange={setMobileSheetOpen}
      />

      {/* Upgrade dialog */}
      <UpgradeDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />

      {/* Apply confirmation dialog */}
      <ApplyConfirmDialog
        open={showApplyConfirm}
        onConfirm={confirmApply}
        onCancel={cancelApply}
      />
    </Layout>
  );
}
