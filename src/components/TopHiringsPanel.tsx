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

const TIPS = [
  "Apply within 24–48 hours for best response.",
  "Save jobs and batch apply.",
  "Customize your resume for each role.",
  "Follow up after 1 week if no response.",
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
      
      if (title.includes("engineer") || title.includes("developer")) {
        role = "Engineering";
      } else if (title.includes("design")) {
        role = "Design";
      } else if (title.includes("product")) {
        role = "Product";
      } else if (title.includes("marketing")) {
        role = "Marketing";
      } else if (title.includes("sales")) {
        role = "Sales";
      } else if (title.includes("data") || title.includes("analyst")) {
        role = "Data & Analytics";
      } else if (title.includes("manager") || title.includes("lead")) {
        role = "Management";
      } else if (title.includes("support") || title.includes("success")) {
        role = "Customer Success";
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
        <div className="text-center py-8 text-muted-foreground text-sm">
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
              <span className="text-xs text-muted-foreground">
                {item.count} job{item.count !== 1 ? 's' : ''}
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
      <div className="flex items-center gap-2.5 mb-5">
        <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-accent" />
        </div>
        <h3 className="font-bold text-foreground text-lg">Top Hirings Today</h3>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start mb-4 h-auto p-1 bg-secondary/60 rounded-full">
          <TabsTrigger 
            value="today" 
            className="flex-1 text-xs rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            Today
          </TabsTrigger>
          <TabsTrigger 
            value="yesterday" 
            className="flex-1 text-xs rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            Yesterday
          </TabsTrigger>
          <TabsTrigger 
            value="week" 
            className="flex-1 text-xs rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm"
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

      {/* Mini Tips Widget */}
      <div className="mt-auto pt-4 border-t border-border">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-accent" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Tips</span>
        </div>
        <ul className="space-y-2">
          {TIPS.slice(0, 2).map((tip, index) => (
            <li key={index} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
