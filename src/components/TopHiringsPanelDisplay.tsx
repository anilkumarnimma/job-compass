import { usePublishedHiringGraphData } from "@/hooks/useHiringGraphData";
import { TrendingUp, PieChart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

// Colors for the donut chart segments
const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(262, 83%, 58%)",    // purple
  "hsl(199, 89%, 48%)",    // cyan
  "hsl(160, 84%, 39%)",    // green
  "hsl(38, 92%, 50%)",     // amber
];

interface TopHiringsPanelDisplayProps {
  onFilterByRole?: (role: string) => void;
}

export function TopHiringsPanelDisplay({ onFilterByRole }: TopHiringsPanelDisplayProps) {
  const { data: entries = [], isLoading } = usePublishedHiringGraphData();

  // Calculate chart segments
  const chartData = useMemo(() => {
    if (entries.length === 0) return [];
    
    const total = entries.reduce((sum, e) => sum + e.percentage, 0);
    let cumulativeAngle = 0;
    
    return entries.map((entry, index) => {
      const percentage = total > 0 ? (entry.percentage / total) * 100 : 0;
      const angle = (percentage / 100) * 360;
      const startAngle = cumulativeAngle;
      cumulativeAngle += angle;
      
      return {
        ...entry,
        color: CHART_COLORS[index % CHART_COLORS.length],
        percentage: entry.percentage,
        startAngle,
        endAngle: cumulativeAngle,
      };
    });
  }, [entries]);

  // Generate SVG path for donut segment
  const createDonutSegment = (startAngle: number, endAngle: number, radius: number, innerRadius: number) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    
    const x1 = 50 + radius * Math.cos(startRad);
    const y1 = 50 + radius * Math.sin(startRad);
    const x2 = 50 + radius * Math.cos(endRad);
    const y2 = 50 + radius * Math.sin(endRad);
    
    const x3 = 50 + innerRadius * Math.cos(endRad);
    const y3 = 50 + innerRadius * Math.sin(endRad);
    const x4 = 50 + innerRadius * Math.cos(startRad);
    const y4 = 50 + innerRadius * Math.sin(startRad);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div>
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-32 w-32 rounded-full mx-auto mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-accent" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-sm">Top Hirings Today</h3>
          <p className="text-xs text-muted-foreground">Most in-demand roles</p>
        </div>
      </div>

      {/* Chart or Empty State */}
      {entries.length === 0 ? (
        <div className="text-center py-6">
          <div className="h-24 w-24 mx-auto mb-3 rounded-full border-4 border-dashed border-muted-foreground/20 flex items-center justify-center">
            <PieChart className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">No hiring data published yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Check back soon for updates</p>
        </div>
      ) : (
        <>
          {/* Donut Chart */}
          <div className="flex justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-0">
                {chartData.map((segment, index) => (
                  <path
                    key={segment.id}
                    d={createDonutSegment(segment.startAngle, segment.endAngle, 45, 28)}
                    fill={segment.color}
                    className="transition-opacity hover:opacity-80 cursor-pointer"
                    onClick={() => onFilterByRole?.(segment.role_name)}
                  />
                ))}
              </svg>
              {/* Center circle with total */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-lg font-bold text-foreground">{entries.length}</span>
                  <span className="block text-[10px] text-muted-foreground">roles</span>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2">
            {chartData.map((entry, index) => (
              <button
                key={entry.id}
                onClick={() => onFilterByRole?.(entry.role_name)}
                className="w-full flex items-center justify-between text-left group hover:bg-secondary/50 rounded-md px-2 py-1.5 -mx-2 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {entry.role_name}
                  </span>
                </div>
                <span className="text-xs font-semibold text-foreground ml-2">
                  {entry.percentage}%
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
