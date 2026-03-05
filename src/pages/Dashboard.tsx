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
  const [searchInput, setSearchInput] = useState("");
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

  const isMobile = useIsMobile();
  const { showUpgradeDialog, setShowUpgradeDialog, showApplyConfirm, confirmApply, cancelApply } = useJobContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get("premium") === "true") {
      toast({ title: "🎉 Premium unlocked!", description: "You can now apply to unlimited jobs." });
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

  const { isApplied } = useJobContext();

  const jobs = useMemo(() => {
    return (data?.jobs || []).filter((job) => !isApplied(job.id));
  }, [data, isApplied]);

  useEffect(() => {
    if (!isLoading && dateFilter !== "all" && !fallbackActive && data && data.totalCount === 0) {
      setFallbackActive(true);
    }
  }, [isLoading, dateFilter, fallbackActive, data]);

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

  const handleDateSelect = useCallback((value: DateFilter) => {
    if (value !== "custom") setCustomDate(undefined);
    setDateFilter(value);
    setAllTimeDropdownOpen(false);
  }, []);

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
        className="w-full max-w-[1400px] mx-auto px-4 md:px-6 py-6"
      >
        <div className="flex gap-6 justify-center">
          {/* Main Content - Left Column */}
          <div className="flex-1 max-w-[600px] min-w-0">
            {/* Header */}
            <div className="mb-6">
              <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-1">
                Job Board
              </h1>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{totalCount.toLocaleString()}</span> job{totalCount !== 1 ? 's' : ''} available
              </p>
            </div>

            {/* Search Bar */}
            <div className="mb-5">
              <SearchBar
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search jobs by title, company, skills…"
              />
            </div>

            {/* Date Filter Chips */}
            <div className="flex items-center gap-2 mb-5">
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
                <PopoverContent align="start" className="w-auto p-3 rounded-xl shadow-elevated border-border/60 bg-card/95 backdrop-blur-lg">
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

            {/* Job List */}
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

          {/* Right Panel - Job Preview + Sidebar (Desktop) */}
          {!isMobile && (
            <div className="hidden lg:flex gap-5 shrink-0">
              {/* Wide Job Details Panel */}
              <AnimatePresence mode="wait">
                {selectedJob && (
                  <motion.div
                    key={selectedJob.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="w-[580px] shrink-0 sticky top-[88px] self-start border border-border/50 rounded-2xl bg-card/80 backdrop-blur-sm overflow-hidden shadow-card max-h-[calc(100vh-112px)]"
                  >
                    <JobPreviewPanel job={selectedJob} />
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Narrow Widgets Sidebar */}
              <div className="w-[280px] shrink-0 sticky top-[88px] self-start">
                <RightSidebar onFilterByRole={handleFilterByRole} />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <MobileJobPreviewSheet job={mobilePreviewJob} open={mobileSheetOpen} onOpenChange={setMobileSheetOpen} />
      <UpgradeDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
      <ApplyConfirmDialog open={showApplyConfirm} onConfirm={confirmApply} onCancel={cancelApply} />
    </Layout>
  );
}
