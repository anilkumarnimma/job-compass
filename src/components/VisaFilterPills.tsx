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
  activeClass: string;
  inactiveClass: string;
}[] = [
  {
    value: "all",
    label: "All Visa-Friendly",
    activeClass: "bg-accent text-white border-accent shadow-sm shadow-accent/25",
    inactiveClass: "bg-accent/6 text-accent border-accent/20 hover:bg-accent/12",
  },
  {
    value: "h1b",
    label: "H1B Sponsorship",
    activeClass: "bg-success text-white border-success shadow-sm shadow-success/25",
    inactiveClass: "bg-success/6 text-success border-success/20 hover:bg-success/12",
  },
  {
    value: "opt",
    label: "OPT / STEM OPT",
    activeClass: "bg-[hsl(260,70%,55%)] text-white border-[hsl(260,70%,55%)] shadow-sm shadow-[hsl(260,70%,55%)]/25",
    inactiveClass: "bg-[hsl(260,70%,55%)]/6 text-[hsl(260,60%,45%)] border-[hsl(260,70%,55%)]/20 hover:bg-[hsl(260,70%,55%)]/12",
  },
];

const chipVariants = {
  inactive: { scale: 1 },
  active: { scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 25 } },
  tap: { scale: 0.95 },
};

export function VisaFilterPills({ value, onChange }: VisaFilterPillsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
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
              "px-3.5 py-2 text-xs font-semibold rounded-full border transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive ? filter.activeClass : filter.inactiveClass
            )}
          >
            {filter.label}
          </motion.button>
        );
      })}
    </div>
  );
}
