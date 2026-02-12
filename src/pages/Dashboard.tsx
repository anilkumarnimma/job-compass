import { useState, useMemo, useCallback, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { SearchBar } from "@/components/SearchBar";
import { RightSidebar } from "@/components/RightSidebar";
import { MobileJobPreviewSheet } from "@/components/MobileJobPreviewSheet";
import { JobPreviewPanel } from "@/components/JobPreviewPanel";
import { JobListInfinite } from "@/components/JobListInfinite";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { ApplyConfirmDialog } from "@/components/ApplyConfirmDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useJobSearch, useJobCounts } from "@/hooks/useJobSearch";
import { useDebounce } from "@/hooks/useDebounce";
import { useJobContext } from "@/context/JobContext";
import { Job, TabFilter } from "@/types/job";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Dashboard() {
  const [searchInput, setSearchInput] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [mobilePreviewJob, setMobilePreviewJob] = useState<Job | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
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

  // Debounce search input by 300ms
  const debouncedSearch = useDebounce(searchInput, 300);

  // Build the combined search query including filters
  const combinedSearchQuery = useMemo(() => {
    const parts: string[] = [];
    if (debouncedSearch.trim()) parts.push(debouncedSearch);
    if (roleFilter) parts.push(roleFilter);
    if (companyFilter) parts.push(companyFilter);
    return parts.join(" ");
  }, [debouncedSearch, roleFilter, companyFilter]);

  // Fetch jobs with infinite scroll
  const {
    data: jobsData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useJobSearch({
    searchQuery: combinedSearchQuery,
    tab: activeTab,
  });

  // Fetch job counts for tabs
  const { data: counts } = useJobCounts(combinedSearchQuery);

  // Flatten pages into single array
  const jobs = useMemo(() => {
    return jobsData?.pages.flatMap((page) => page) || [];
  }, [jobsData]);

  // Auto-select first job on desktop when jobs load and nothing is selected
  useEffect(() => {
    if (!isMobile && jobs.length > 0 && !selectedJob) {
      setSelectedJob(jobs[0]);
    }
  }, [jobs, isMobile, selectedJob]);

  const handleJobTap = useCallback((job: Job) => {
    if (isMobile) {
      setMobilePreviewJob(job);
      setMobileSheetOpen(true);
    } else {
      setSelectedJob(job);
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

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as TabFilter);
  }, []);

  const hasActiveFilter = roleFilter || companyFilter;

  return (
    <Layout>
      <div className="w-full max-w-[1280px] mx-auto px-4 md:px-6 py-6">
        <div className="flex gap-6">
          {/* Left Column - Job List (40% on desktop) */}
          <div className="w-full lg:w-[40%] lg:shrink-0 flex flex-col min-h-0">
            {/* Header */}
            <div className="mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                Job Board
              </h1>
              <p className="text-muted-foreground text-sm">
                {counts?.total_count ?? 0} job{counts?.total_count !== 1 ? 's' : ''} available
              </p>
            </div>

            {/* Search */}
            <div className="mb-4">
              <SearchBar
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search by title, company, skills..."
              />
            </div>

            {/* Active Filters */}
            {hasActiveFilter && (
              <div className="flex items-center gap-2 mb-3">
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

            {/* Tabs - Pill Style */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col min-h-0">
              <TabsList className="w-full justify-start mb-4 h-auto p-1 bg-secondary/70 rounded-full shrink-0">
                <TabsTrigger 
                  value="all" 
                  className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none px-4 text-xs font-medium"
                >
                  All ({counts?.total_count ?? 0})
                </TabsTrigger>
                <TabsTrigger 
                  value="today" 
                  className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none px-4 text-xs font-medium"
                >
                  Today ({counts?.today_count ?? 0})
                </TabsTrigger>
                <TabsTrigger 
                  value="yesterday" 
                  className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none px-4 text-xs font-medium"
                >
                  Yesterday ({counts?.yesterday_count ?? 0})
                </TabsTrigger>
                <TabsTrigger 
                  value="week" 
                  className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none px-4 text-xs font-medium"
                >
                  This Week ({counts?.week_count ?? 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-0 flex-1 min-h-0 lg:overflow-y-auto lg:max-h-[calc(100vh-280px)] lg:pr-2 lg:-mr-2 scrollbar-thin">
                <JobListInfinite
                  jobs={jobs}
                  isLoading={isLoading}
                  isFetchingNextPage={isFetchingNextPage}
                  hasNextPage={hasNextPage ?? false}
                  fetchNextPage={fetchNextPage}
                  onTap={handleJobTap}
                  selectedJobId={selectedJob?.id}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Detail Panel (60% on desktop) */}
          <div className="hidden lg:block lg:w-[60%] min-h-0">
            <div className="sticky top-[88px] max-h-[calc(100vh-112px)] overflow-y-auto rounded-2xl border border-border bg-card shadow-soft">
              {selectedJob ? (
                <JobPreviewPanel job={selectedJob} />
              ) : (
                <div className="p-6">
                  <RightSidebar onFilterByRole={handleFilterByRole} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: show sidebar widgets below the list */}
        <div className="lg:hidden mt-6">
          <RightSidebar onFilterByRole={handleFilterByRole} />
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