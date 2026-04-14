import { memo } from "react";
import { TopHiringsPanelDisplay } from "./TopHiringsPanelDisplay";
import { MarketAlertCard } from "./MarketAlertCard";
import { cn } from "@/lib/utils";
import { useActiveMarketAlert } from "@/hooks/useMarketAlerts";

interface RightSidebarProps {
  onFilterByRole?: (role: string) => void;
  className?: string;
}

export const RightSidebar = memo(function RightSidebar({ onFilterByRole, className }: RightSidebarProps) {
  const { data: activeAlert } = useActiveMarketAlert();

  return (
    <aside className={cn("flex flex-col gap-2", className)} data-tour="right-sidebar">
      <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
        <TopHiringsPanelDisplay onFilterByRole={onFilterByRole} />
      </div>
      
      {activeAlert && (
        <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
          <MarketAlertCard />
        </div>
      )}
    </aside>
  );
});
