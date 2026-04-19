import { useMemo, useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, Check, Sparkles } from "lucide-react";
import { useRoleCategoryCounts } from "@/hooks/useRoleCategoryCounts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface RoleCategoryPillsProps {
  /** Currently selected category id, or null for "All" */
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
}

const pillVariants = {
  inactive: { scale: 1 },
  active: { scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 25 } },
  tap: { scale: 0.95 },
};

export function RoleCategoryPills({ selectedCategoryId, onSelect }: RoleCategoryPillsProps) {
  const { data, isLoading } = useRoleCategoryCounts();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);

  // Hide curated pills with zero matches so the rail stays focused
  const curatedPills = useMemo(
    () => (data?.curated ?? []).filter((c) => c.count > 0),
    [data]
  );
  const otherPills = data?.other ?? [];

  const updateScrollIndicators = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollIndicators();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollIndicators, { passive: true });
    window.addEventListener("resize", updateScrollIndicators);
    return () => {
      el.removeEventListener("scroll", updateScrollIndicators);
      window.removeEventListener("resize", updateScrollIndicators);
    };
  }, [curatedPills.length, otherPills.length]);

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  const selectedOther = otherPills.find((p) => p.category.id === selectedCategoryId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 mb-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full shrink-0" />
        ))}
      </div>
    );
  }

  if (!curatedPills.length && !otherPills.length) {
    return null;
  }

  return (
    <div className="relative mb-4" data-tour="role-pills">
      <div className="flex items-center gap-2">
        {/* Left scroll indicator */}
        {canScrollLeft && (
          <button
            onClick={() => scrollBy(-240)}
            aria-label="Scroll categories left"
            className="hidden md:flex items-center justify-center h-8 w-8 rounded-full bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 shrink-0 shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-thin scroll-smooth -mx-1 px-1 py-1 flex-1"
          style={{ scrollbarWidth: "thin" }}
        >
          {/* All pill */}
          <motion.button
            variants={pillVariants}
            initial="inactive"
            animate={selectedCategoryId === null ? "active" : "inactive"}
            whileTap="tap"
            onClick={() => onSelect(null)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedCategoryId === null
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
            )}
          >
            <Sparkles className="h-3 w-3" />
            All roles
          </motion.button>

          {curatedPills.map(({ category, count }) => {
            const isActive = selectedCategoryId === category.id;
            return (
              <motion.button
                key={category.id}
                variants={pillVariants}
                initial="inactive"
                animate={isActive ? "active" : "inactive"}
                whileTap="tap"
                onClick={() => onSelect(isActive ? null : category.id)}
                title={`${count} ${category.label} job${count !== 1 ? "s" : ""}`}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-foreground text-background border-foreground shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
                )}
              >
                {category.label}
                <span
                  className={cn(
                    "tabular-nums text-[10px] px-1.5 py-0.5 rounded-full",
                    isActive
                      ? "bg-background/20 text-background"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </motion.button>
            );
          })}

          {/* Other roles dropdown */}
          {otherPills.length > 0 && (
            <Popover open={otherOpen} onOpenChange={setOtherOpen}>
              <PopoverTrigger asChild>
                <motion.button
                  variants={pillVariants}
                  initial="inactive"
                  animate={selectedOther ? "active" : "inactive"}
                  whileTap="tap"
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedOther
                      ? "bg-foreground text-background border-foreground shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
                  )}
                >
                  {selectedOther ? selectedOther.category.label : "Other roles"}
                  <span
                    className={cn(
                      "tabular-nums text-[10px] px-1.5 py-0.5 rounded-full",
                      selectedOther
                        ? "bg-background/20 text-background"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {otherPills.length}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </motion.button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-64 p-1 rounded-xl shadow-elevated border-border/60 bg-card/95 backdrop-blur-lg"
              >
                <div className="max-h-72 overflow-y-auto">
                  {otherPills.map(({ category, count }) => {
                    const isActive = selectedCategoryId === category.id;
                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          onSelect(isActive ? null : category.id);
                          setOtherOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                          isActive
                            ? "bg-foreground text-background"
                            : "text-foreground hover:bg-secondary"
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {isActive && <Check className="h-3 w-3 shrink-0" />}
                          <span className="truncate">{category.label}</span>
                        </span>
                        <span
                          className={cn(
                            "tabular-nums text-[10px] px-1.5 py-0.5 rounded-full shrink-0",
                            isActive
                              ? "bg-background/20 text-background"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Right scroll indicator */}
        {canScrollRight && (
          <button
            onClick={() => scrollBy(240)}
            aria-label="Scroll categories right"
            className="hidden md:flex items-center justify-center h-8 w-8 rounded-full bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 shrink-0 shadow-sm"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
