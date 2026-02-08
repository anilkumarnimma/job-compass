import { usePublishedHiringGraphData } from "@/hooks/useHiringGraphData";
import { TrendingUp, PieChart, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Premium gradient colors for the donut chart segments
const CHART_COLORS = [
  { main: "hsl(var(--primary))", glow: "hsl(var(--primary) / 0.3)" },
  { main: "hsl(262, 83%, 58%)", glow: "hsl(262, 83%, 58% / 0.3)" },
  { main: "hsl(199, 89%, 48%)", glow: "hsl(199, 89%, 48% / 0.3)" },
  { main: "hsl(160, 84%, 39%)", glow: "hsl(160, 84%, 39% / 0.3)" },
  { main: "hsl(38, 92%, 50%)", glow: "hsl(38, 92%, 50% / 0.3)" },
];

interface TopHiringsPanelDisplayProps {
  onFilterByRole?: (role: string) => void;
}

export function TopHiringsPanelDisplay({ onFilterByRole }: TopHiringsPanelDisplayProps) {
  const { data: entries = [], isLoading } = usePublishedHiringGraphData();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  // Get the most recent publish time
  const lastUpdated = useMemo(() => {
    if (entries.length === 0) return null;
    const dates = entries.map(e => new Date(e.published_at));
    return new Date(Math.max(...dates.map(d => d.getTime())));
  }, [entries]);

  // Generate SVG path for donut segment with rounded ends
  const createDonutSegment = (
    startAngle: number, 
    endAngle: number, 
    radius: number, 
    innerRadius: number,
    isHovered: boolean
  ) => {
    const hoverScale = isHovered ? 2 : 0;
    const r = radius + hoverScale;
    const ir = innerRadius - hoverScale / 2;
    
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    
    const x1 = 50 + r * Math.cos(startRad);
    const y1 = 50 + r * Math.sin(startRad);
    const x2 = 50 + r * Math.cos(endRad);
    const y2 = 50 + r * Math.sin(endRad);
    
    const x3 = 50 + ir * Math.cos(endRad);
    const y3 = 50 + ir * Math.sin(endRad);
    const x4 = 50 + ir * Math.cos(startRad);
    const y4 = 50 + ir * Math.sin(startRad);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${ir} ${ir} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  if (isLoading) {
    return (
      <div className="p-5 rounded-2xl bg-gradient-to-br from-card via-card to-muted/20 border border-border/50 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div>
              <Skeleton className="h-4 w-32 mb-1.5" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-36 w-36 rounded-full mx-auto mb-5" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-card via-card to-muted/10 border border-border/40 shadow-xl shadow-primary/5 relative overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.02] to-transparent pointer-events-none" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-inner">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm tracking-tight">Top Hirings Today</h3>
              <p className="text-xs text-muted-foreground">USA market snapshot</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1.5">
            {/* Trend badge */}
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-[10px] font-semibold text-green-600">+12% today</span>
            </div>
            
            {/* Updated time */}
            {lastUpdated && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                <Clock className="h-3 w-3" />
                <span>Updated {formatDistanceToNow(lastUpdated, { addSuffix: false })} ago</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart or Empty State */}
        {entries.length === 0 ? (
          <div className="text-center py-8">
            <div className="h-28 w-28 mx-auto mb-4 rounded-full border-4 border-dashed border-muted-foreground/15 flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
              <PieChart className="h-12 w-12 text-muted-foreground/25" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">No hiring data published yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Check back soon for updates</p>
          </div>
        ) : (
          <TooltipProvider delayDuration={100}>
            <>
              {/* Donut Chart */}
              <div className="flex justify-center mb-6">
                <div className="relative w-36 h-36">
                  {/* Glow effect behind chart */}
                  <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10 blur-xl" />
                  
                  <svg viewBox="0 0 100 100" className="w-full h-full relative z-10">
                    {/* Inner shadow circle */}
                    <defs>
                      <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                        <feOffset in="blur" dx="0" dy="1" result="offsetBlur" />
                        <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
                      </filter>
                      <linearGradient id="centerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--card))" />
                        <stop offset="100%" stopColor="hsl(var(--muted) / 0.3)" />
                      </linearGradient>
                    </defs>
                    
                    {/* Background track */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="hsl(var(--muted) / 0.3)"
                      strokeWidth="14"
                    />
                    
                    {/* Chart segments */}
                    {chartData.map((segment, index) => (
                      <Tooltip key={segment.id}>
                        <TooltipTrigger asChild>
                          <path
                            d={createDonutSegment(
                              segment.startAngle, 
                              segment.endAngle, 
                              45, 
                              31,
                              hoveredIndex === index
                            )}
                            fill={segment.color.main}
                            className="transition-all duration-200 cursor-pointer"
                            style={{
                              filter: hoveredIndex === index ? `drop-shadow(0 0 8px ${segment.color.glow})` : 'none',
                              opacity: hoveredIndex !== null && hoveredIndex !== index ? 0.6 : 1,
                            }}
                            onClick={() => onFilterByRole?.(segment.role_name)}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                          />
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          className="bg-popover/95 backdrop-blur-sm border-border/50 shadow-xl"
                        >
                          <div className="text-center">
                            <p className="font-semibold text-foreground">{segment.role_name}</p>
                            <p className="text-lg font-bold text-primary">{segment.percentage}%</p>
                            <p className="text-[10px] text-muted-foreground">Click to filter jobs</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </svg>
                  
                  {/* Center content */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center bg-gradient-to-br from-card to-card/80 rounded-full w-14 h-14 flex flex-col items-center justify-center shadow-inner">
                      <span className="text-xl font-bold text-foreground leading-none">{entries.length}</span>
                      <span className="text-[9px] text-muted-foreground font-medium">Top roles</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats line */}
              <div className="text-center mb-5">
                <p className="text-[10px] text-muted-foreground/70">
                  Total jobs scanned: <span className="font-semibold text-muted-foreground">2,340</span>
                </p>
              </div>

              {/* Bar-style Legend */}
              <div className="space-y-3">
                {chartData.map((entry, index) => {
                  const isTop = index === 0;
                  const isHovered = hoveredIndex === index;
                  
                  return (
                    <Tooltip key={entry.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onFilterByRole?.(entry.role_name)}
                          onMouseEnter={() => setHoveredIndex(index)}
                          onMouseLeave={() => setHoveredIndex(null)}
                          className={`w-full text-left transition-all duration-200 rounded-lg p-2 -mx-2 ${
                            isHovered ? 'bg-muted/50 scale-[1.02]' : 'hover:bg-muted/30'
                          } ${isTop ? 'ring-1 ring-primary/20 bg-primary/[0.03]' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={`shrink-0 rounded-full transition-all duration-200 ${
                                  isTop ? 'h-3.5 w-3.5' : 'h-3 w-3'
                                }`}
                                style={{ 
                                  backgroundColor: entry.color.main,
                                  boxShadow: isHovered ? `0 0 8px ${entry.color.glow}` : 'none'
                                }}
                              />
                              <span className={`text-sm truncate transition-colors ${
                                isTop ? 'font-semibold text-foreground' : 'text-foreground/80'
                              } ${isHovered ? 'text-primary' : ''}`}>
                                {entry.role_name}
                                {isTop && (
                                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                    #1
                                  </span>
                                )}
                              </span>
                            </div>
                            <span className={`text-xs font-bold ml-2 ${
                              isTop ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              {entry.percentage}%
                            </span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500 ease-out"
                              style={{
                                width: `${entry.percentage}%`,
                                background: `linear-gradient(90deg, ${entry.color.main}, ${entry.color.main}dd)`,
                                boxShadow: isHovered ? `0 0 6px ${entry.color.glow}` : 'none'
                              }}
                            />
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="left" 
                        className="bg-popover/95 backdrop-blur-sm border-border/50"
                      >
                        <p className="text-xs">Click to filter by <span className="font-semibold">{entry.role_name}</span></p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
