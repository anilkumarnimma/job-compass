import { VisaFilter } from "@/lib/visaSponsorship";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VisaFilterPillsProps {
  value: VisaFilter;
  onChange: (filter: VisaFilter) => void;
}

const filterConfig: {
  value: VisaFilter;
  label: string;
  dotClass: string;
  activeClass: string;
  inactiveDotClass: string;
}[] = [
  {
    value: "all",
    label: "All Visa-Friendly",
    dotClass: "bg-accent",
    activeClass:
      "bg-accent/10 border-accent/30 text-accent shadow-[0_2px_10px_hsl(var(--accent)/0.12)]",
    inactiveDotClass: "bg-muted-foreground/40",
  },
  {
    value: "h1b",
    label: "H1B Sponsorship",
    dotClass: "bg-emerald-500",
    activeClass:
      "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 shadow-[0_2px_10px_rgb(16,185,129,0.12)]",
    inactiveDotClass: "bg-muted-foreground/40",
  },
  {
    value: "opt",
    label: "OPT / STEM OPT",
    dotClass: "bg-indigo-500",
    activeClass:
      "bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 shadow-[0_2px_10px_rgb(99,102,241,0.14)]",
    inactiveDotClass: "bg-muted-foreground/40",
  },
];

const chipVariants = {
  inactive: { scale: 1 },
  active: { scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 25 } },
  tap: { scale: 0.95 },
};

export function VisaFilterPills({ value, onChange }: VisaFilterPillsProps) {
  return (
    <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-card/40 backdrop-blur-md border border-border/60 shadow-sm overflow-x-auto scrollbar-hide">
      <span className="hidden sm:inline-block px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        Visa Support
      </span>
      {filterConfig.map((filter) => {
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
              "flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? `${filter.activeClass} font-semibold`
                : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-card/70 hover:border-border"
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                isActive ? filter.dotClass : filter.inactiveDotClass,
                isActive && filter.value === "opt" && "animate-pulse"
              )}
            />
            {filter.label}
          </motion.button>
        );
      })}
    </div>
  );
}
