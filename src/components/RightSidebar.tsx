import { memo } from "react";
import { TopHiringsPanelDisplay } from "./TopHiringsPanelDisplay";
import { MarketAlertCard } from "./MarketAlertCard";
import { DailyChallengeCard } from "./DailyChallengeCard";
import { PomodoroTimerCard } from "./PomodoroTimerCard";
import { cn } from "@/lib/utils";
import { useActiveMarketAlert } from "@/hooks/useMarketAlerts";

interface RightSidebarProps {
  onFilterByRole?: (role: string) => void;
  className?: string;
}

export const RightSidebar = memo(function RightSidebar({ onFilterByRole, className }: RightSidebarProps) {
  const { data: activeAlert } = useActiveMarketAlert();

  return (
    <aside className={cn("flex flex-col gap-2", className)}>
      <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
        <TopHiringsPanelDisplay onFilterByRole={onFilterByRole} />
      </div>
      
      {activeAlert && (
        <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
          <MarketAlertCard />
        </div>
      )}

      <DailyChallengeCard />
      <PomodoroTimerCard />
    </aside>
  );
});
