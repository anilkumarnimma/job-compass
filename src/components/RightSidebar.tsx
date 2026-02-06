import { Job } from "@/types/job";
import { JobPreviewPanel } from "./JobPreviewPanel";
import { TopHiringsPanel } from "./TopHiringsPanel";
import { TopCompaniesPanel } from "./TopCompaniesPanel";
import { cn } from "@/lib/utils";

interface RightSidebarProps {
  hoveredJob: Job | null;
  onFilterByRole?: (role: string) => void;
  onFilterByCompany?: (company: string) => void;
  className?: string;
}

export function RightSidebar({ hoveredJob, onFilterByRole, onFilterByCompany, className }: RightSidebarProps) {
  return (
    <aside className={cn("flex flex-col gap-4", className)}>
      {/* Job Preview - shows when hovering over a job card */}
      {hoveredJob && (
        <div key={hoveredJob.id} className="animate-panel-in bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
          <JobPreviewPanel job={hoveredJob} />
        </div>
      )}
      
      {/* Top Hirings Widget - always visible */}
      <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
        <TopHiringsPanel onFilterByRole={onFilterByRole} />
      </div>
      
      {/* Top Companies Widget - always visible */}
      <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
        <TopCompaniesPanel onFilterByCompany={onFilterByCompany} />
      </div>
    </aside>
  );
}
