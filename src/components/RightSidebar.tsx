import { Job } from "@/types/job";
import { JobPreviewPanel } from "./JobPreviewPanel";
import { TopHiringsPanel } from "./TopHiringsPanel";
import { cn } from "@/lib/utils";

interface RightSidebarProps {
  hoveredJob: Job | null;
  onFilterByRole?: (role: string) => void;
  className?: string;
}

export function RightSidebar({ hoveredJob, onFilterByRole, className }: RightSidebarProps) {
  return (
    <aside 
      className={cn(
        "bg-card border border-border rounded-2xl shadow-soft overflow-hidden",
        className
      )}
    >
      {hoveredJob ? (
        <div key={hoveredJob.id} className="h-full animate-panel-in">
          <JobPreviewPanel job={hoveredJob} />
        </div>
      ) : (
        <div className="h-full">
          <TopHiringsPanel onFilterByRole={onFilterByRole} />
        </div>
      )}
    </aside>
  );
}
