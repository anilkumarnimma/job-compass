import { useActiveHiringGraphData } from "@/hooks/useHiringGraphData";
import { TrendingUp, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Colors for the bar chart
const BAR_COLORS = [
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
  const { data: entries = [], isLoading } = useActiveHiringGraphData();

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
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-2 w-full" />
            </div>
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

      {/* Chart */}
      {entries.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No data available</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry, index) => (
            <button
              key={entry.id}
              onClick={() => onFilterByRole?.(entry.role_name)}
              className="w-full text-left group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate max-w-[160px]">
                  {entry.role_name}
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {entry.percentage}%
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                  style={{
                    width: `${entry.percentage}%`,
                    backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                  }}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
