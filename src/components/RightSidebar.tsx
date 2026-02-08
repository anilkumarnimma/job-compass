import { TopHiringsPanelDisplay } from "./TopHiringsPanelDisplay";
import { MarketAlertCard } from "./MarketAlertCard";
import { cn } from "@/lib/utils";
import { useActiveMarketAlert } from "@/hooks/useMarketAlerts";

interface RightSidebarProps {
  onFilterByRole?: (role: string) => void;
  className?: string;
}

export function RightSidebar({ onFilterByRole, className }: RightSidebarProps) {
  const { data: activeAlert } = useActiveMarketAlert();

  return (
    <aside className={cn("flex flex-col gap-4", className)}>
      {/* Top Hirings Widget - Founder-managed data only */}
      <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
        <TopHiringsPanelDisplay onFilterByRole={onFilterByRole} />
      </div>
      
      {/* Market Alert Card - Only shows if active alert exists */}
      {activeAlert && (
        <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
          <MarketAlertCard />
        </div>
      )}
    </aside>
  );
}
