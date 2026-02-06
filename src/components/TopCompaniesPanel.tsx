import { useMemo, useState } from "react";
import { useJobContext } from "@/context/JobContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { isToday, isYesterday, isWithinInterval, subDays, startOfDay } from "date-fns";
import { Building2 } from "lucide-react";

interface TopCompaniesPanelProps {
  onFilterByCompany?: (company: string) => void;
}

interface CompanyCount {
  company: string;
  count: number;
}

export function TopCompaniesPanel({ onFilterByCompany }: TopCompaniesPanelProps) {
  const { jobs } = useJobContext();
  const [activeTab, setActiveTab] = useState("today");

  const todayJobs = useMemo(() => 
    jobs.filter((job) => isToday(job.posted_date)),
  [jobs]);

  const yesterdayJobs = useMemo(() => 
    jobs.filter((job) => isYesterday(job.posted_date)),
  [jobs]);

  const thisWeekJobs = useMemo(() => {
    const weekAgo = startOfDay(subDays(new Date(), 7));
    const twoDaysAgo = startOfDay(subDays(new Date(), 2));
    return jobs.filter((job) => 
      isWithinInterval(job.posted_date, { start: weekAgo, end: twoDaysAgo })
    );
  }, [jobs]);

  const getTopCompanies = (jobsList: typeof jobs): CompanyCount[] => {
    const companyMap = new Map<string, number>();
    
    jobsList.forEach((job) => {
      companyMap.set(job.company, (companyMap.get(job.company) || 0) + 1);
    });

    return Array.from(companyMap.entries())
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  };

  // Sample data for demo when no real jobs exist
  const sampleCompanies: CompanyCount[] = [
    { company: "Google", count: 38 },
    { company: "Microsoft", count: 31 },
    { company: "Amazon", count: 27 },
    { company: "Meta", count: 22 },
    { company: "Apple", count: 18 },
    { company: "Netflix", count: 14 },
  ];

  const renderChart = (jobsList: typeof jobs, useSample = false) => {
    let topCompanies = getTopCompanies(jobsList);
    
    // Use sample data if no real jobs
    if (topCompanies.length === 0 && useSample) {
      topCompanies = sampleCompanies;
    }
    
    const maxCount = Math.max(...topCompanies.map(c => c.count), 1);

    if (topCompanies.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm bg-secondary/30 rounded-xl">
          Add more jobs to see trends.
        </div>
      );
    }

    return (
      <div className="space-y-2.5">
        {topCompanies.map((item) => (
          <button
            key={item.company}
            onClick={() => onFilterByCompany?.(item.company)}
            className="w-full text-left group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate max-w-[180px]">
                {item.company}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {item.count}
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent rounded-full transition-all duration-300 group-hover:bg-accent/80"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-sm">Top Companies Hiring</h3>
          <p className="text-xs text-muted-foreground">Most active companies</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start mb-3 h-auto p-0.5 bg-secondary/70 rounded-full">
          <TabsTrigger 
            value="today" 
            className="flex-1 text-xs rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none font-medium py-1.5"
          >
            Today
          </TabsTrigger>
          <TabsTrigger 
            value="yesterday" 
            className="flex-1 text-xs rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none font-medium py-1.5"
          >
            Yesterday
          </TabsTrigger>
          <TabsTrigger 
            value="week" 
            className="flex-1 text-xs rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none font-medium py-1.5"
          >
            This Week
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-0">
          {renderChart(todayJobs, true)}
        </TabsContent>

        <TabsContent value="yesterday" className="mt-0">
          {renderChart(yesterdayJobs, true)}
        </TabsContent>

        <TabsContent value="week" className="mt-0">
          {renderChart(thisWeekJobs, true)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
