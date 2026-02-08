import { TopHiringsPanelDisplay } from "./TopHiringsPanelDisplay";
import { TopCompaniesPanel } from "./TopCompaniesPanel";
import { cn } from "@/lib/utils";

interface RightSidebarProps {
  onFilterByRole?: (role: string) => void;
  onFilterByCompany?: (company: string) => void;
  className?: string;
}

export function RightSidebar({ onFilterByRole, onFilterByCompany, className }: RightSidebarProps) {
  return (
    <aside className={cn("flex flex-col gap-4", className)}>
      {/* Top Hirings Widget - Founder-managed data only */}
      <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
        <TopHiringsPanelDisplay onFilterByRole={onFilterByRole} />
      </div>
      
      {/* Top Companies Widget */}
      <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
        <TopCompaniesPanel onFilterByCompany={onFilterByCompany} />
      </div>
    </aside>
  );
}
