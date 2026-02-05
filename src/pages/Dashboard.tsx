import { useState, useMemo, useRef, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { SearchBar } from "@/components/SearchBar";
import { JobCard } from "@/components/JobCard";
import { RightSidebar } from "@/components/RightSidebar";
import { MobileJobPreviewSheet } from "@/components/MobileJobPreviewSheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useJobContext } from "@/context/JobContext";
import { Job } from "@/types/job";
import { isToday, isYesterday, isWithinInterval, subDays, startOfDay } from "date-fns";
import { Briefcase, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredJob, setHoveredJob] = useState<Job | null>(null);
  const [mobilePreviewJob, setMobilePreviewJob] = useState<Job | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const { jobs, isLoading } = useJobContext();
  const isMobile = useIsMobile();
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 
   const filteredJobs = useMemo(() => {
     if (!searchQuery.trim()) return jobs;
     
     const query = searchQuery.toLowerCase();
     return jobs.filter((job) => 
       job.title.toLowerCase().includes(query) ||
       job.company.toLowerCase().includes(query) ||
       job.description.toLowerCase().includes(query) ||
       job.skills.some((skill) => skill.toLowerCase().includes(query))
     );
   }, [searchQuery, jobs]);
 
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

  // Handle hover with delay for smoother UX
  const handleJobHover = useCallback((job: Job | null) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    if (job) {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredJob(job);
      }, 120); // 120ms delay as specified
    } else {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredJob(null);
      }, 150); // Slightly longer delay before reverting
    }
  }, []);

  const handleMobileTap = useCallback((job: Job) => {
    setMobilePreviewJob(job);
    setMobileSheetOpen(true);
  }, []);
 
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
        <div className="grid grid-cols-1 gap-4">
          {jobs.map((job) => (
            <JobCard 
              key={job.id} 
              job={job} 
              onHover={!isMobile ? handleJobHover : undefined}
              onTap={isMobile ? handleMobileTap : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="container max-w-[1240px] mx-auto px-6 py-[18px]">
        <div className="flex gap-6">
          {/* Main Content - 70% */}
          <div className="flex-1 min-w-0 lg:w-[70%]">
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

            {/* Tabs - Pill Style */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="w-full justify-start mb-5 h-auto p-1 bg-secondary/60 rounded-full">
                <TabsTrigger 
                  value="all" 
                  className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm px-5"
                >
                  All ({filteredJobs.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="today" 
                  className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm px-5"
                >
                  Today ({todayJobs.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="yesterday" 
                  className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm px-5"
                >
                  Yesterday ({yesterdayJobs.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="week" 
                  className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm px-5"
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

          {/* Right Sidebar - 30% Desktop only */}
          {!isMobile && (
            <RightSidebar 
              hoveredJob={hoveredJob}
              className="hidden lg:flex lg:flex-col w-[30%] sticky top-20 h-[calc(100vh-6rem)]"
            />
          )}
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
