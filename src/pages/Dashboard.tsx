import { useState, useMemo, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { SearchBar } from "@/components/SearchBar";
import { RightSidebar } from "@/components/RightSidebar";
import { MobileJobPreviewSheet } from "@/components/MobileJobPreviewSheet";
import { JobListInfinite } from "@/components/JobListInfinite";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useJobSearch, useJobCounts } from "@/hooks/useJobSearch";
import { useDebounce } from "@/hooks/useDebounce";
import { Job, TabFilter } from "@/types/job";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const [searchInput, setSearchInput] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [mobilePreviewJob, setMobilePreviewJob] = useState<Job | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const isMobile = useIsMobile();

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

  const handleMobileTap = useCallback((job: Job) => {
    setMobilePreviewJob(job);
    setMobileSheetOpen(true);
  }, []);

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
      <div className="container max-w-[1280px] mx-auto px-6 py-6">
        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1 max-w-[600px]">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                Job Board
              </h1>
              <p className="text-muted-foreground text-sm">
                {counts?.total_count ?? 0} job{counts?.total_count !== 1 ? 's' : ''} available
              </p>
            </div>

            {/* Search */}
            <div className="mb-5">
              <SearchBar
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search by title, company, skills..."
              />
            </div>

            {/* Active Filters */}
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

            {/* Tabs - Pill Style */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="w-full justify-start mb-5 h-auto p-1 bg-secondary/70 rounded-full">
                <TabsTrigger 
                  value="all" 
                  className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none px-5 font-medium"
                >
                  All ({counts?.total_count ?? 0})
                </TabsTrigger>
                <TabsTrigger 
                  value="today" 
                  className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none px-5 font-medium"
                >
                  Today ({counts?.today_count ?? 0})
                </TabsTrigger>
                <TabsTrigger 
                  value="yesterday" 
                  className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none px-5 font-medium"
                >
                  Yesterday ({counts?.yesterday_count ?? 0})
                </TabsTrigger>
                <TabsTrigger 
                  value="week" 
                  className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none px-5 font-medium"
                >
                  This Week ({counts?.week_count ?? 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-0">
                <JobListInfinite
                  jobs={jobs}
                  isLoading={isLoading}
                  isFetchingNextPage={isFetchingNextPage}
                  hasNextPage={hasNextPage ?? false}
                  fetchNextPage={fetchNextPage}
                  onTap={isMobile ? handleMobileTap : undefined}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Desktop only */}
          <div className="hidden lg:block w-[320px] shrink-0">
            <RightSidebar 
              onFilterByRole={handleFilterByRole}
              className="sticky top-[88px]"
            />
          </div>
        </div>
      </div>

      {/* Mobile Job Preview Sheet */}
      <MobileJobPreviewSheet 
        job={mobilePreviewJob}
        open={mobileSheetOpen}
        onOpenChange={setMobileSheetOpen}
      />
    </Layout>
  );
}
