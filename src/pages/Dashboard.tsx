 import { useState, useMemo } from "react";
 import { Layout } from "@/components/Layout";
 import { SearchBar } from "@/components/SearchBar";
 import { JobCard } from "@/components/JobCard";
 import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
 import { mockJobs } from "@/data/mockJobs";
 import { Job } from "@/types/job";
 import { isToday, isYesterday, isWithinInterval, subDays, startOfDay } from "date-fns";
 import { Briefcase } from "lucide-react";
 
 export default function Dashboard() {
   const [searchQuery, setSearchQuery] = useState("");
   const [selectedJob, setSelectedJob] = useState<Job | null>(null);
 
   const filteredJobs = useMemo(() => {
     if (!searchQuery.trim()) return mockJobs;
     
     const query = searchQuery.toLowerCase();
     return mockJobs.filter((job) => 
       job.title.toLowerCase().includes(query) ||
       job.company.toLowerCase().includes(query) ||
       job.description.toLowerCase().includes(query) ||
       job.skills.some((skill) => skill.toLowerCase().includes(query))
     );
   }, [searchQuery]);
 
   const todayJobs = useMemo(() => 
     filteredJobs.filter((job) => isToday(job.postedDate)),
   [filteredJobs]);
 
   const yesterdayJobs = useMemo(() => 
     filteredJobs.filter((job) => isYesterday(job.postedDate)),
   [filteredJobs]);
 
   const thisWeekJobs = useMemo(() => {
     const weekAgo = startOfDay(subDays(new Date(), 7));
     const twoDaysAgo = startOfDay(subDays(new Date(), 2));
     return filteredJobs.filter((job) => 
       isWithinInterval(job.postedDate, { start: weekAgo, end: twoDaysAgo })
     );
   }, [filteredJobs]);
 
   const handleViewDetails = (job: Job) => {
     setSelectedJob(job);
   };
 
   const JobList = ({ jobs }: { jobs: Job[] }) => (
     <div className="space-y-4">
       {jobs.length === 0 ? (
         <div className="text-center py-12">
           <Briefcase className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
           <p className="text-muted-foreground">No jobs found</p>
         </div>
       ) : (
         jobs.map((job) => (
           <JobCard 
             key={job.id} 
             job={job} 
             onViewDetails={handleViewDetails}
           />
         ))
       )}
     </div>
   );
 
   return (
     <Layout>
       <div className="container max-w-4xl mx-auto px-4 py-8">
         {/* Header */}
         <div className="mb-8">
           <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
             Job Board
           </h1>
           <p className="text-muted-foreground">
             {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} available
           </p>
         </div>
 
         {/* Search */}
         <div className="mb-6">
           <SearchBar
             value={searchQuery}
             onChange={setSearchQuery}
             placeholder="Search by title, company, skills..."
           />
         </div>
 
         {/* Tabs */}
         <Tabs defaultValue="today" className="w-full">
           <TabsList className="w-full justify-start mb-6 h-auto p-1 bg-secondary/50">
             <TabsTrigger value="today" className="flex-1 sm:flex-none data-[state=active]:bg-card">
               Today ({todayJobs.length})
             </TabsTrigger>
             <TabsTrigger value="yesterday" className="flex-1 sm:flex-none data-[state=active]:bg-card">
               Yesterday ({yesterdayJobs.length})
             </TabsTrigger>
             <TabsTrigger value="week" className="flex-1 sm:flex-none data-[state=active]:bg-card">
               This Week ({thisWeekJobs.length})
             </TabsTrigger>
           </TabsList>
 
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
     </Layout>
   );
 }