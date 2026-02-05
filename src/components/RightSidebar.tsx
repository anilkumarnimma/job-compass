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
        "w-80 bg-card border border-border/40 rounded-xl shadow-sm overflow-hidden transition-all duration-200",
        className
      )}
    >
      {hoveredJob ? (
        <JobPreviewPanel job={hoveredJob} />
      ) : (
        <TopHiringsPanel onFilterByRole={onFilterByRole} />
      )}
    </aside>
  );
}
