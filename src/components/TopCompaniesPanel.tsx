import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Building2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { SociaxLogo } from "./SociaxLogo";

interface TopCompaniesPanelProps {
  onFilterByCompany?: (company: string) => void;
}

interface CompanyCount {
  company: string;
  count: number;
}

// Gradient color pairs for the donut chart segments [start, end]
const GRADIENT_COLORS = [
  ["hsl(160, 84%, 45%)", "hsl(160, 84%, 32%)"],   // green
  ["hsl(199, 89%, 55%)", "hsl(199, 89%, 40%)"],   // cyan
  ["hsl(38, 92%, 58%)", "hsl(38, 92%, 42%)"],     // amber
  ["hsl(262, 83%, 65%)", "hsl(262, 83%, 50%)"],   // purple
  ["hsl(346, 77%, 58%)", "hsl(346, 77%, 42%)"],   // rose
  ["hsl(221, 83%, 60%)", "hsl(221, 83%, 45%)"],   // primary blue
];

// Solid colors for legend dots
const LEGEND_COLORS = [
  "hsl(160, 84%, 39%)",
  "hsl(199, 89%, 48%)",
  "hsl(38, 92%, 50%)",
  "hsl(262, 83%, 58%)",
  "hsl(346, 77%, 50%)",
  "hsl(221, 83%, 53%)",
];

// Lightweight hook to fetch just enough job data for charts
function useChartJobs() {
  return useQuery({
    queryKey: ["jobs", "chart-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("title, company, posted_date")
        .eq("is_published", true)
        .order("posted_date", { ascending: false })
        .limit(500); // Enough for chart aggregation

      if (error) throw error;
      return (data || []).map((row) => ({
        title: row.title,
        company: row.company,
        posted_date: new Date(row.posted_date),
      }));
    },
    staleTime: 60 * 1000, // 60 seconds
  });
}

function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}

function isWithinWeek(date: Date): boolean {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  return date >= weekAgo && date < twoDaysAgo;
}

export function TopCompaniesPanel({ onFilterByCompany }: TopCompaniesPanelProps) {
  const { data: jobs = [] } = useChartJobs();
  const [activeTab, setActiveTab] = useState("today");

  const todayJobs = useMemo(() => 
    jobs.filter((job) => isToday(job.posted_date)),
  [jobs]);

  const yesterdayJobs = useMemo(() => 
    jobs.filter((job) => isYesterday(job.posted_date)),
  [jobs]);

  const thisWeekJobs = useMemo(() => 
    jobs.filter((job) => isWithinWeek(job.posted_date)),
  [jobs]);

  const getTopCompanies = (jobsList: typeof jobs): CompanyCount[] => {
    const companyMap = new Map<string, number>();
    
    jobsList.forEach((job) => {
      companyMap.set(job.company, (companyMap.get(job.company) || 0) + 1);
    });

    return Array.from(companyMap.entries())
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
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
    
    // Always use sample data if no real jobs exist
    if (topCompanies.length === 0) {
      if (useSample) {
        topCompanies = sampleCompanies;
      } else {
        return (
          <div className="text-center py-8 text-muted-foreground text-sm bg-secondary/30 rounded-xl">
            Add more jobs to see trends.
          </div>
        );
      }
    }

    const total = topCompanies.reduce((sum, item) => sum + item.count, 0);
    const chartData = topCompanies.map((item, index) => ({
      ...item,
      name: item.company,
      value: item.count,
      percentage: Math.round((item.count / total) * 100),
      gradientIndex: index % GRADIENT_COLORS.length,
    }));

    return (
      <div className="flex flex-col gap-3">
        {/* Donut Chart with Logo in Center */}
        <div className="h-[150px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {/* Define gradients */}
              <defs>
                {GRADIENT_COLORS.map((colors, index) => (
                  <linearGradient 
                    key={`gradient-${index}`} 
                    id={`companyGradient-${index}`} 
                    x1="0%" 
                    y1="0%" 
                    x2="100%" 
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={colors[0]} />
                    <stop offset="100%" stopColor={colors[1]} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
                onClick={(data) => onFilterByCompany?.(data.company)}
                className="cursor-pointer"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#companyGradient-${entry.gradientIndex})`}
                    className="hover:opacity-80 transition-opacity"
                  />
                ))}
              </Pie>
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                        <p className="text-sm font-medium text-foreground">{data.company}</p>
                        <p className="text-xs text-muted-foreground">{data.percentage}% of listings</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Sociax Logo in Center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <SociaxLogo size="sm" showText={false} />
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {chartData.map((item, index) => (
            <button
              key={item.company}
              onClick={() => onFilterByCompany?.(item.company)}
              className="flex items-center gap-2 text-left group"
            >
              <div 
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: LEGEND_COLORS[index % LEGEND_COLORS.length] }}
              />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate">
                {item.company}
              </span>
              <span className="text-xs font-medium text-foreground ml-auto">
                {item.percentage}%
              </span>
            </button>
          ))}
        </div>
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
