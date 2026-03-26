import { useState, useMemo, useCallback, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { calculateMatchesForJobs } from "@/lib/jobMatcher";
import { calculateLandingProbability } from "@/lib/landingProbability";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";
import { Layout } from "@/components/Layout";
import { SearchBar } from "@/components/SearchBar";
import { RightSidebar } from "@/components/RightSidebar";
import { MobileJobPreviewSheet } from "@/components/MobileJobPreviewSheet";
import { JobPreviewPanel } from "@/components/JobPreviewPanel";
import { JobListPaginated } from "@/components/JobListPaginated";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { ApplyConfirmDialog } from "@/components/ApplyConfirmDialog";
import { ProfileGateDialog } from "@/components/ProfileGateDialog";
import { useJobSearchPaginated } from "@/hooks/useJobSearchPaginated";
import { useDebounce } from "@/hooks/useDebounce";
import { useJobContext } from "@/context/JobContext";
import { Job } from "@/types/job";
import { X, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { JobMatchesPanel } from "@/components/JobMatchesPanel";
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { VisaFilterPills } from "@/components/VisaFilterPills";
import { VisaFilter, filterJobsByVisa } from "@/lib/visaSponsorship";
import { useIsUSUser } from "@/hooks/useIsUSUser";
import { NotificationOptInDialog } from "@/components/NotificationOptInDialog";

type DateFilter = "all" | "today" | "yesterday" | "custom";

function getDateRange(filter: DateFilter, customDate?: Date | undefined): { dateFrom: string | null; dateTo: string | null } {
  if (filter === "all") return { dateFrom: null, dateTo: null };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === "today") {
    return { dateFrom: today.toISOString().split("T")[0], dateTo: null };
  }
  if (filter === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { dateFrom: yesterday.toISOString().split("T")[0], dateTo: today.toISOString().split("T")[0] };
  }
  if (filter === "custom" && customDate) {
    const from = new Date(customDate.getFullYear(), customDate.getMonth(), customDate.getDate());
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    return { dateFrom: from.toISOString().split("T")[0], dateTo: to.toISOString().split("T")[0] };
  }
  return { dateFrom: null, dateTo: null };
}

const chipVariants = {
  inactive: { scale: 1 },
  active: { scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 25 } },
  tap: { scale: 0.95 },
};

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [mobilePreviewJob, setMobilePreviewJob] = useState<Job | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [allTimeDropdownOpen, setAllTimeDropdownOpen] = useState(false);
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [fallbackActive, setFallbackActive] = useState(false);
  const [visaFilter, setVisaFilter] = useState<VisaFilter>("all");

  const isMobile = useIsMobile();
  const { showUpgradeDialog, setShowUpgradeDialog, showApplyConfirm, confirmApply, cancelApply, showProfileGate, setShowProfileGate, profileGateMissingFields } = useJobContext();
  const { toast } = useToast();
  const isUSUser = useIsUSUser();

  useEffect(() => {
    if (searchParams.get("premium") === "true") {
      toast({ title: "🎉 Premium unlocked!", description: "You can now apply to unlimited jobs." });
      searchParams.delete("premium");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  // Handle pending search from landing page tag click
  useEffect(() => {
    const pendingSearch = sessionStorage.getItem("pending_search");
    if (pendingSearch) {
      sessionStorage.removeItem("pending_search");
      setSearchInput(pendingSearch);
      setSearchParams({ search: pendingSearch }, { replace: true });
    }
  }, []);

  // Reset all filters when URL search params are cleared (e.g. logo click)
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    if (!urlSearch && searchInput) {
      setSearchInput("");
      setRoleFilter(null);
      setCompanyFilter(null);
      setDateFilter("all");
      setCustomDate(undefined);
      setFallbackActive(false);
      setCurrentPage(1);
    }
  }, [searchParams]);

  const debouncedSearch = useDebounce(searchInput, 300);

  const combinedSearchQuery = useMemo(() => {
    const parts: string[] = [];
    if (debouncedSearch.trim()) parts.push(debouncedSearch);
    if (roleFilter) parts.push(roleFilter);
    if (companyFilter) parts.push(companyFilter);
    return parts.join(" ");
  }, [debouncedSearch, roleFilter, companyFilter]);

  const { dateFrom, dateTo } = getDateRange(dateFilter, customDate);

  useEffect(() => {
    setCurrentPage(1);
    setFallbackActive(false);
  }, [combinedSearchQuery, dateFilter, customDate]);

  const { data, isLoading } = useJobSearchPaginated({
    searchQuery: combinedSearchQuery,
    page: currentPage,
    dateFrom: fallbackActive ? null : dateFrom,
    dateTo: fallbackActive ? null : dateTo,
  });

  const { profile } = useProfile();

  const rawJobs = data?.jobs || [];
  const jobs = useMemo(() => filterJobsByVisa(rawJobs, visaFilter), [rawJobs, visaFilter]);

  const matchResults = useMemo(
    () => calculateMatchesForJobs(jobs, profile?.resume_intelligence),
    [jobs, profile?.resume_intelligence]
  );

  const landingResults = useMemo(() => {
    const intelligence = profile?.resume_intelligence as ResumeIntelligence | null | undefined;
    if (!intelligence) return new Map();
    const results = new Map();
    for (const job of jobs) {
      const lr = calculateLandingProbability(job, matchResults.get(job.id), intelligence);
      if (lr) results.set(job.id, lr);
    }
    return results;
  }, [jobs, matchResults, profile?.resume_intelligence]);

  useEffect(() => {
    if (!isLoading && dateFilter !== "all" && !fallbackActive && data && data.totalCount === 0) {
      setFallbackActive(true);
    }
  }, [isLoading, dateFilter, fallbackActive, data]);

  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

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

  const handleDateSelect = useCallback((value: DateFilter) => {
    if (value !== "custom") setCustomDate(undefined);
    setDateFilter(value);
    setAllTimeDropdownOpen(false);
    if (value === "all") {
      setSearchInput("");
      setRoleFilter(null);
      setCompanyFilter(null);
      searchParams.delete("search");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleCustomDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setCustomDate(date);
      setDateFilter("custom");
    }
  }, []);

  const handleClearCustomDate = useCallback(() => {
    setCustomDate(undefined);
    setDateFilter("all");
    setAllTimeDropdownOpen(false);
  }, []);

  const hasActiveFilter = roleFilter || companyFilter;
  const fallbackLabel = dateFilter === "today" ? "today" : dateFilter === "yesterday" ? "yesterday" : customDate ? format(customDate, "MMM d") : "";

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[1600px] mx-auto px-4 md:px-6 py-4"
      >
        {/* Welcome Banner */}
        <WelcomeBanner jobs={rawJobs} />

        {/* Header + Search + Filters (above columns) */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-1">
                Job Board
              </h1>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{totalCount.toLocaleString()}</span> job{totalCount !== 1 ? 's' : ''} available
              </p>
            </div>
            
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <div className="flex-1">
              <SearchBar
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search jobs by title, company, skills…"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(["today", "yesterday"] as const).map((filter) => {
                const isActive = dateFilter === filter && !fallbackActive;
                return (
                  <motion.button
                    key={filter}
                    variants={chipVariants}
                    initial="inactive"
                    animate={isActive ? "active" : "inactive"}
                    whileTap="tap"
                    onClick={() => handleDateSelect(filter)}
                    className={cn(
                      "px-4 py-2 text-xs font-medium rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-foreground text-background border-foreground shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
                    )}
                  >
                    {filter === "today" ? "Today" : "Yesterday"}
                  </motion.button>
                );
              })}

              <Popover open={allTimeDropdownOpen} onOpenChange={setAllTimeDropdownOpen}>
                <PopoverTrigger asChild>
                  <motion.button
                    variants={chipVariants}
                    initial="inactive"
                    animate={(dateFilter === "all" || dateFilter === "custom" || fallbackActive) ? "active" : "inactive"}
                    whileTap="tap"
                    className={cn(
                      "px-4 py-2 text-xs font-medium rounded-full border transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      (dateFilter === "all" || dateFilter === "custom" || fallbackActive)
                        ? "bg-foreground text-background border-foreground shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
                    )}
                  >
                    {dateFilter === "custom" && customDate ? `All time: ${format(customDate, "MMM d")}` : "All time"}
                    <ChevronDown className="h-3 w-3" />
                  </motion.button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-3 rounded-xl shadow-elevated border-border/60 bg-card/95 backdrop-blur-lg">
                  <div className="flex flex-col gap-1 mb-2">
                    {[
                      { value: "all" as const, label: "All time" },
                      { value: "today" as const, label: "Today" },
                      { value: "yesterday" as const, label: "Yesterday" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleDateSelect(opt.value)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                          dateFilter === opt.value && !fallbackActive
                            ? "bg-foreground text-background"
                            : "text-foreground hover:bg-secondary"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-border pt-2">
                    <p className="text-[11px] text-muted-foreground px-2 mb-1 font-medium">Pick a date</p>
                    <Calendar
                      mode="single"
                      selected={customDate}
                      onSelect={handleCustomDateSelect}
                      disabled={(date) => date > new Date()}
                      className="p-1 pointer-events-auto"
                    />
                    {customDate && (
                      <button
                        onClick={handleClearCustomDate}
                        className="w-full text-center px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary mt-1"
                      >
                        Clear date
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {isUSUser && <VisaFilterPills value={visaFilter} onChange={setVisaFilter} />}
        </div>

        {/* Fallback note */}
        <AnimatePresence>
          {fallbackActive && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-muted-foreground mb-4 bg-secondary/50 px-3 py-2 rounded-lg border border-border/40"
            >
              No jobs posted {fallbackLabel} — showing All time results.
            </motion.p>
          )}
        </AnimatePresence>

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

        {/* ===== 3-Column LinkedIn-style Grid (Desktop) ===== */}
        {isMobile ? (
          /* Mobile: single column job list */
          <div className="flex flex-col">
            <JobMatchesPanel />
            <div className="mt-4">
              <JobListPaginated
                jobs={jobs}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                onTap={handleJobTap}
                selectedJobId={selectedJob?.id}
                matchResults={matchResults}
                landingResults={landingResults}
              />
            </div>
          </div>
        ) : (
          /* Desktop: CSS Grid 3-column layout */
          <div
            className="grid gap-4 mx-auto"
            style={{
              gridTemplateColumns: selectedJob ? '30% 45% 25%' : '1fr minmax(280px, 340px)',
              maxWidth: selectedJob ? undefined : 1100,
            }}
          >
            {/* LEFT — Job List */}
            <div className={cn(
              "pr-2",
              selectedJob && "sticky top-[88px] self-start max-h-[calc(100vh-112px)] overflow-y-auto overscroll-contain scrollbar-thin"
            )}>
              {!selectedJob && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-4"
                >
                  <JobMatchesPanel />
                </motion.div>
              )}
              <JobListPaginated
                jobs={jobs}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                onTap={handleJobTap}
                selectedJobId={selectedJob?.id}
                matchResults={matchResults}
                landingResults={landingResults}
              />
            </div>

            {/* MIDDLE — Job Description (only when job selected) */}
            {selectedJob && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedJob.id}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="border border-border/50 rounded-2xl bg-card/80 backdrop-blur-sm shadow-card relative flex flex-col sticky top-[88px] self-start max-h-[calc(100vh-112px)] overflow-hidden"
                >
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="sticky top-0 z-20 p-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors backdrop-blur-sm ml-auto mr-3 mt-3 shrink-0"
                    aria-label="Close preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin">
                    <JobPreviewPanel job={selectedJob} matchResult={matchResults.get(selectedJob.id)} landingProbability={landingResults.get(selectedJob.id)} />
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* RIGHT — Sidebar (always visible) */}
            <div className="self-start sticky top-[88px]">
              <RightSidebar onFilterByRole={handleFilterByRole} />
            </div>
          </div>
        )}
      </motion.div>

      <MobileJobPreviewSheet job={mobilePreviewJob} open={mobileSheetOpen} onOpenChange={setMobileSheetOpen} />
      <UpgradeDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
      <ApplyConfirmDialog open={showApplyConfirm} onConfirm={confirmApply} onCancel={cancelApply} />
      <ProfileGateDialog open={showProfileGate} onOpenChange={setShowProfileGate} missingFields={profileGateMissingFields} />
      <NotificationOptInDialog />
    </Layout>
  );
}
