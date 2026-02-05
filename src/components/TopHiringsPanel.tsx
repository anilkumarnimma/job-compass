import { useMemo, useState } from "react";
import { useJobContext } from "@/context/JobContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { isToday, isYesterday, isWithinInterval, subDays, startOfDay } from "date-fns";
import { TrendingUp, Lightbulb } from "lucide-react";

interface TopHiringsPanelProps {
  onFilterByRole?: (role: string) => void;
}

interface RoleCount {
  role: string;
  count: number;
}

const CATEGORIES = [
  { key: "Software Engineer", keywords: ["software", "engineer", "developer", "frontend", "backend"] },
  { key: "Full Stack", keywords: ["full stack", "fullstack"] },
  { key: "Data Analyst", keywords: ["data", "analyst", "analytics"] },
  { key: "Business", keywords: ["business", "operations", "strategy"] },
  { key: "Civil", keywords: ["civil", "construction", "infrastructure"] },
];

export function TopHiringsPanel({ onFilterByRole }: TopHiringsPanelProps) {
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

  const getTopRoles = (jobsList: typeof jobs): RoleCount[] => {
    const roleMap = new Map<string, number>();
    
    jobsList.forEach((job) => {
      const title = job.title.toLowerCase();
      let role = "Other";
      
      for (const category of CATEGORIES) {
        if (category.keywords.some(kw => title.includes(kw))) {
          role = category.key;
          break;
        }
      }
      
      roleMap.set(role, (roleMap.get(role) || 0) + 1);
    });

    return Array.from(roleMap.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  const renderChart = (jobsList: typeof jobs) => {
    const topRoles = getTopRoles(jobsList);
    const maxCount = Math.max(...topRoles.map(r => r.count), 1);

    if (topRoles.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm gradient-subtle rounded-xl">
          No jobs in this period
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {topRoles.map((item) => (
          <button
            key={item.role}
            onClick={() => onFilterByRole?.(item.role)}
            className="w-full text-left group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                {item.role}
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
    <div className="p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-base">Top Hirings Today</h3>
          <p className="text-xs text-muted-foreground">Based on jobs in your system</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start mb-4 h-auto p-1 bg-secondary/70 rounded-full">
          <TabsTrigger 
            value="today" 
            className="flex-1 text-xs rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none font-medium"
          >
            Today
          </TabsTrigger>
          <TabsTrigger 
            value="yesterday" 
            className="flex-1 text-xs rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none font-medium"
          >
            Yesterday
          </TabsTrigger>
          <TabsTrigger 
            value="week" 
            className="flex-1 text-xs rounded-full data-[state=active]:bg-tab-selected-bg data-[state=active]:text-tab-selected-text data-[state=active]:shadow-none font-medium"
          >
            This Week
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="flex-1 mt-0">
          {renderChart(todayJobs)}
        </TabsContent>

        <TabsContent value="yesterday" className="flex-1 mt-0">
          {renderChart(yesterdayJobs)}
        </TabsContent>

        <TabsContent value="week" className="flex-1 mt-0">
          {renderChart(thisWeekJobs)}
        </TabsContent>
      </Tabs>

      {/* Tip Card Widget */}
      <div className="mt-auto pt-5 border-t border-border">
        <div className="bg-accent/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-accent" />
            <span className="text-xs font-semibold text-foreground">Quick Tip</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Apply early—most callbacks happen within the first 48 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
