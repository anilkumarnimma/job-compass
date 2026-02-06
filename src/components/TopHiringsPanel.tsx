import { useMemo, useState } from "react";
import { useJobContext } from "@/context/JobContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { isToday, isYesterday, isWithinInterval, subDays, startOfDay } from "date-fns";
import { TrendingUp } from "lucide-react";

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

// Colors for the bar chart
const BAR_COLORS = [
  "hsl(221, 83%, 53%)",   // primary blue
  "hsl(262, 83%, 58%)",   // purple
  "hsl(199, 89%, 48%)",   // cyan
  "hsl(160, 84%, 39%)",   // green
  "hsl(38, 92%, 50%)",    // amber
  "hsl(346, 77%, 50%)",   // rose
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

  // Sample data for demo when no real jobs exist
  const sampleRoles: RoleCount[] = [
    { role: "Software Engineer", count: 45 },
    { role: "Full Stack", count: 32 },
    { role: "Data Analyst", count: 28 },
    { role: "Business", count: 18 },
    { role: "Civil", count: 12 },
  ];

  const renderChart = (jobsList: typeof jobs, useSample = false) => {
    let topRoles = getTopRoles(jobsList);
    
    // Always use sample data if no real jobs exist
    if (topRoles.length === 0) {
      if (useSample) {
        topRoles = sampleRoles;
      } else {
        return (
          <div className="text-center py-8 text-muted-foreground text-sm bg-secondary/30 rounded-xl">
            Add more jobs to see trends.
          </div>
        );
      }
    }

    const total = topRoles.reduce((sum, item) => sum + item.count, 0);
    const chartData = topRoles.map((item, index) => ({
      ...item,
      percentage: Math.round((item.count / total) * 100),
      color: BAR_COLORS[index % BAR_COLORS.length],
    }));

    return (
      <div className="space-y-2.5">
        {chartData.map((item) => (
          <button
            key={item.role}
            onClick={() => onFilterByRole?.(item.role)}
            className="w-full text-left group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate max-w-[160px]">
                {item.role}
              </span>
              <span className="text-xs font-semibold text-foreground">
                {item.percentage}%
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                style={{ 
                  width: `${item.percentage}%`,
                  backgroundColor: item.color,
                }}
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
        <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-accent" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-sm">Top Hirings Today</h3>
          <p className="text-xs text-muted-foreground">Most posted roles today</p>
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
