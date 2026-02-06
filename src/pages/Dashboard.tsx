import { useState, useMemo, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { SearchBar } from "@/components/SearchBar";
import { JobCard } from "@/components/JobCard";
import { RightSidebar } from "@/components/RightSidebar";
import { MobileJobPreviewSheet } from "@/components/MobileJobPreviewSheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useJobContext } from "@/context/JobContext";
import { Job } from "@/types/job";
import { isToday, isYesterday, isWithinInterval, subDays, startOfDay } from "date-fns";
import { Briefcase, Loader2, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobilePreviewJob, setMobilePreviewJob] = useState<Job | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const { jobs, isLoading } = useJobContext();
  const isMobile = useIsMobile();

  // Apply all filters
  const filteredJobs = useMemo(() => {
    let result = jobs;
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((job) => 
        job.title.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query) ||
        job.description.toLowerCase().includes(query) ||
        job.skills.some((skill) => skill.toLowerCase().includes(query))
      );
    }
    
    // Role filter (checks if job title contains the role)
    if (roleFilter) {
      result = result.filter((job) => 
        job.title.toLowerCase().includes(roleFilter.toLowerCase())
      );
    }
    
    // Company filter
    if (companyFilter) {
      result = result.filter((job) => 
        job.company.toLowerCase() === companyFilter.toLowerCase()
      );
    }
    
    return result;
  }, [searchQuery, jobs, roleFilter, companyFilter]);

  const todayJobs = useMemo(() => 
    filteredJobs.filter((job) => isToday(job.posted_date)),
  [filteredJobs]);

  const yesterdayJobs = useMemo(() => 
    filteredJobs.filter((job) => isYesterday(job.posted_date)),
  [filteredJobs]);

  const thisWeekJobs = useMemo(() => {
    const weekAgo = startOfDay(subDays(new Date(), 7));
    const twoDaysAgo = startOfDay(subDays(new Date(), 2));
    return filteredJobs.filter((job) => 
      isWithinInterval(job.posted_date, { start: weekAgo, end: twoDaysAgo })
    );
  }, [filteredJobs]);


  const handleMobileTap = useCallback((job: Job) => {
    setMobilePreviewJob(job);
    setMobileSheetOpen(true);
  }, []);

  const handleFilterByRole = useCallback((role: string) => {
    setRoleFilter(role);
    setCompanyFilter(null);
  }, []);

  const handleFilterByCompany = useCallback((company: string) => {
    setCompanyFilter(company);
    setRoleFilter(null);
  }, []);

  const clearFilters = useCallback(() => {
    setRoleFilter(null);
    setCompanyFilter(null);
  }, []);

  const hasActiveFilter = roleFilter || companyFilter;
 
  const JobList = ({ jobs }: { jobs: Job[] }) => (
    <div>
      {isLoading ? (
        <div className="text-center py-16">
          <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No jobs found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 max-w-[580px]">
          {jobs.map((job) => (
            <JobCard 
              key={job.id} 
              job={job} 
              onTap={isMobile ? handleMobileTap : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );

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
                {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} available
              </p>
            </div>

            {/* Search */}
            <div className="mb-5">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
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
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="w-full justify-start mb-5 h-auto p-1 bg-secondary/70 rounded-full">
                <TabsTrigger 
                  value="all" 
                  className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none px-5 font-medium"
                >
                  All ({filteredJobs.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="today" 
                  className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none px-5 font-medium"
                >
                  Today ({todayJobs.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="yesterday" 
                  className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none px-5 font-medium"
                >
                  Yesterday ({yesterdayJobs.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="week" 
                  className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none px-5 font-medium"
                >
                  This Week ({thisWeekJobs.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <JobList jobs={filteredJobs} />
              </TabsContent>

              <TabsContent value="today">
                <JobList jobs={todayJobs} />
              </TabsContent>

              <TabsContent value="yesterday">
                <JobList jobs={yesterdayJobs} />
              </TabsContent>

              <TabsContent value="week">
                <JobList jobs={thisWeekJobs} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Desktop only */}
          <div className="hidden lg:block w-[320px] shrink-0">
            <RightSidebar 
              onFilterByRole={handleFilterByRole}
              onFilterByCompany={handleFilterByCompany}
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
