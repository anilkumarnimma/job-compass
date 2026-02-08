import { usePublishedHiringGraphData } from "@/hooks/useHiringGraphData";
import { TrendingUp, PieChart, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Premium vibrant gradient colors for the donut chart segments
const CHART_COLORS = [
  { 
    start: "hsl(221, 83%, 53%)", 
    end: "hsl(221, 83%, 63%)", 
    glow: "hsl(221, 83%, 53% / 0.4)" 
  },
  { 
    start: "hsl(262, 83%, 55%)", 
    end: "hsl(262, 83%, 68%)", 
    glow: "hsl(262, 83%, 58% / 0.4)" 
  },
  { 
    start: "hsl(199, 89%, 45%)", 
    end: "hsl(199, 89%, 58%)", 
    glow: "hsl(199, 89%, 48% / 0.4)" 
  },
  { 
    start: "hsl(160, 84%, 36%)", 
    end: "hsl(160, 84%, 48%)", 
    glow: "hsl(160, 84%, 39% / 0.4)" 
  },
  { 
    start: "hsl(38, 92%, 48%)", 
    end: "hsl(38, 92%, 60%)", 
    glow: "hsl(38, 92%, 50% / 0.4)" 
  },
];

interface TopHiringsPanelDisplayProps {
  onFilterByRole?: (role: string) => void;
}

export function TopHiringsPanelDisplay({ onFilterByRole }: TopHiringsPanelDisplayProps) {
  const { data: entries = [], isLoading } = usePublishedHiringGraphData();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isAnimated, setIsAnimated] = useState(false);

  // Trigger animation on mount
  useEffect(() => {
    if (entries.length > 0 && !isAnimated) {
      const timer = setTimeout(() => setIsAnimated(true), 100);
      return () => clearTimeout(timer);
    }
  }, [entries.length, isAnimated]);

  // Calculate chart segments with gap
  const chartData = useMemo(() => {
    if (entries.length === 0) return [];
    
    const total = entries.reduce((sum, e) => sum + e.percentage, 0);
    const gapAngle = 2; // Gap between segments in degrees
    let cumulativeAngle = 0;
    
    return entries.map((entry, index) => {
      const percentage = total > 0 ? (entry.percentage / total) * 100 : 0;
      const angle = (percentage / 100) * 360 - gapAngle;
      const startAngle = cumulativeAngle + gapAngle / 2;
      cumulativeAngle += angle + gapAngle;
      
      return {
        ...entry,
        color: CHART_COLORS[index % CHART_COLORS.length],
        percentage: entry.percentage,
        startAngle,
        endAngle: startAngle + angle,
      };
    });
  }, [entries]);

  // Get the most recent publish time
  const lastUpdated = useMemo(() => {
    if (entries.length === 0) return null;
    const dates = entries.map(e => new Date(e.published_at));
    return new Date(Math.max(...dates.map(d => d.getTime())));
  }, [entries]);

  // Generate arc path for stroke-based donut with rounded caps
  const createArcPath = (
    startAngle: number, 
    endAngle: number, 
    radius: number
  ) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    
    const x1 = 50 + radius * Math.cos(startRad);
    const y1 = 50 + radius * Math.sin(startRad);
    const x2 = 50 + radius * Math.cos(endRad);
    const y2 = 50 + radius * Math.sin(endRad);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
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
    <div className="p-4 rounded-2xl bg-gradient-to-br from-card via-card to-muted/10 border border-border/40 shadow-xl shadow-primary/5 relative overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.02] to-transparent pointer-events-none" />
      
      <div className="relative">
        {/* Header - compact */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-inner shrink-0">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-foreground text-sm tracking-tight whitespace-nowrap">Top Hirings Today</h3>
              <p className="text-[11px] text-muted-foreground whitespace-nowrap">USA market snapshot</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1 shrink-0">
            {/* Trend badge */}
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
              <TrendingUp className="h-2.5 w-2.5 text-green-600" />
              <span className="text-[9px] font-semibold text-green-600">+12%</span>
            </div>
            
            {/* Updated time */}
            {lastUpdated && (
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground/70">
                <Clock className="h-2.5 w-2.5" />
                <span>{formatDistanceToNow(lastUpdated, { addSuffix: false })} ago</span>
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
              {/* Donut Chart - compact */}
              <div className="flex justify-center mb-4">
                <div className="relative w-36 h-36">
                  {/* Outer glow effect */}
                  <div 
                    className="absolute inset-0 rounded-full blur-xl opacity-40"
                    style={{
                      background: `radial-gradient(circle, ${CHART_COLORS[0].glow} 0%, transparent 70%)`
                    }}
                  />
                  
                  <svg viewBox="0 0 100 100" className="w-full h-full relative z-10">
                    <defs>
                      {/* Gradient definitions for each segment */}
                      {chartData.map((segment, index) => (
                        <linearGradient
                          key={`gradient-${index}`}
                          id={`segmentGradient-${index}`}
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor={segment.color.start} />
                          <stop offset="100%" stopColor={segment.color.end} />
                        </linearGradient>
                      ))}
                      
                      {/* Inner shadow filter for center */}
                      <filter id="centerInnerShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="hsl(var(--foreground))" floodOpacity="0.1" />
                      </filter>
                      
                      {/* Glow filter for hovered segments */}
                      <filter id="segmentGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    
                    {/* Background track */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="hsl(var(--muted) / 0.2)"
                      strokeWidth="17"
                    />
                    
                    {/* Chart segments with animation */}
                    {chartData.map((segment, index) => {
                      const isHovered = hoveredIndex === index;
                      const arcLength = ((segment.endAngle - segment.startAngle) / 360) * (2 * Math.PI * 38);
                      const totalLength = 2 * Math.PI * 38;
                      
                      return (
                        <Tooltip key={segment.id}>
                          <TooltipTrigger asChild>
                            <path
                              d={createArcPath(segment.startAngle, segment.endAngle, 38)}
                              fill="none"
                              stroke={`url(#segmentGradient-${index})`}
                              strokeWidth={isHovered ? 19 : 17}
                              strokeLinecap="round"
                              className="cursor-pointer"
                              style={{
                                filter: isHovered ? 'url(#segmentGlow)' : 'none',
                                opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1,
                                strokeDasharray: isAnimated ? `${arcLength} ${totalLength}` : `0 ${totalLength}`,
                                strokeDashoffset: 0,
                                transition: isAnimated 
                                  ? 'stroke-width 200ms ease-out, opacity 200ms ease-out'
                                  : `stroke-dasharray 600ms ease-out ${index * 80}ms, stroke-width 200ms ease-out, opacity 200ms ease-out`,
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
                      );
                    })}
                  </svg>
                  
                  {/* Center content with inner shadow */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="text-center rounded-full w-[52px] h-[52px] flex flex-col items-center justify-center"
                      style={{
                        background: 'linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--muted) / 0.15) 100%)',
                        boxShadow: 'inset 0 2px 8px hsl(var(--foreground) / 0.08), 0 1px 2px hsl(var(--background) / 0.5)'
                      }}
                    >
                      <span className="text-2xl font-extrabold text-foreground leading-none tracking-tight">
                        {entries.length}
                      </span>
                      <span className="text-[8px] text-muted-foreground font-medium leading-tight mt-0.5">
                        Active roles
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats line */}
              <div className="text-center mb-3">
                <p className="text-[9px] text-muted-foreground/70">
                  Total jobs scanned: <span className="font-semibold text-muted-foreground">2,340</span>
                </p>
              </div>

              {/* Bar-style Legend - compact */}
              <div className="space-y-1.5">
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
                          className={`w-full text-left transition-all duration-200 rounded-md py-1 px-1.5 -mx-1.5 ${
                            isHovered ? 'bg-muted/50 scale-[1.01]' : 'hover:bg-muted/30'
                          } ${isTop ? 'ring-1 ring-primary/20 bg-primary/[0.03]' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div
                                className={`shrink-0 rounded-full transition-all duration-200 ${
                                  isTop ? 'h-2.5 w-2.5' : 'h-2 w-2'
                                }`}
                                style={{ 
                                  background: `linear-gradient(135deg, ${entry.color.start}, ${entry.color.end})`,
                                  boxShadow: isHovered ? `0 0 6px ${entry.color.glow}` : 'none'
                                }}
                              />
                              <span className={`text-xs truncate transition-colors ${
                                isTop ? 'font-semibold text-foreground' : 'text-foreground/80'
                              } ${isHovered ? 'text-primary' : ''}`}>
                                {entry.role_name}
                                {isTop && (
                                  <span className="ml-1 text-[8px] px-1 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                    #1
                                  </span>
                                )}
                              </span>
                            </div>
                            <span className={`text-[11px] font-bold ml-2 ${
                              isTop ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              {entry.percentage}%
                            </span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="h-1 w-full bg-muted/50 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500 ease-out"
                              style={{
                                width: `${entry.percentage}%`,
                                background: `linear-gradient(90deg, ${entry.color.start}, ${entry.color.end})`,
                                boxShadow: isHovered ? `0 0 4px ${entry.color.glow}` : 'none'
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
