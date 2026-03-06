import { VisaFilter } from "@/lib/visaSponsorship";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";

interface VisaFilterPillsProps {
  value: VisaFilter;
  onChange: (filter: VisaFilter) => void;
}

const filters: { value: VisaFilter; label: string; emoji: string }[] = [
  { value: "all", label: "All Jobs", emoji: "🇺🇸" },
  { value: "sponsors", label: "Sponsorship", emoji: "✅" },
  { value: "opt_friendly", label: "OPT", emoji: "🎓" },
  { value: "stem_opt", label: "STEM OPT", emoji: "🔬" },
  { value: "h1b", label: "H1B", emoji: "🌐" },
];

const chipVariants = {
  inactive: { scale: 1 },
  active: { scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 25 } },
  tap: { scale: 0.95 },
};

export function VisaFilterPills({ value, onChange }: VisaFilterPillsProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      {filters.map((filter) => {
        const isActive = value === filter.value;
        return (
          <motion.button
            key={filter.value}
            variants={chipVariants}
            initial="inactive"
            animate={isActive ? "active" : "inactive"}
            whileTap="tap"
            onClick={() => onChange(filter.value)}
            className={cn(
              "px-3 py-1.5 text-[11px] font-medium rounded-full border transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
            )}
          >
            {filter.emoji} {filter.label}
          </motion.button>
        );
      })}
    </div>
  );
}
