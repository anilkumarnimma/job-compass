import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  FileCheck,
  Send,
  Bookmark,
  BarChart3,
  FileText,
  MessageSquare,
  ArrowRight,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

const TOUR_STORAGE_KEY = "sociax_onboarding_complete";

interface TourStep {
  icon: LucideIcon;
  title: string;
  description: string;
  tip: string;
  /** CSS selector for the element to highlight */
  selector: string;
  /** Preferred tooltip position */
  position: "bottom" | "top" | "left" | "right";
}

const tourSteps: TourStep[] = [
  {
    icon: Search,
    selector: "[data-tour='search-bar']",
    position: "bottom",
    title: "Search & Browse Jobs",
    description: "Type any keyword — job title, skill, or company — to instantly find matching jobs.",
    tip: "Try searching for 'React', 'Google', or 'Remote'",
  },
  {
    icon: BarChart3,
    selector: "[data-tour='job-card']",
    position: "right",
    title: "Job Cards & Landing Probability",
    description: "Each card shows the job details and your match percentage. Higher % means you're a better fit.",
    tip: "Upload your resume for accurate match scores",
  },
  {
    icon: FileCheck,
    selector: "[data-tour='right-sidebar']",
    position: "left",
    title: "Hiring Trends & Market Alerts",
    description: "See top hiring roles, market alerts, and daily challenges in the sidebar.",
    tip: "Click a role to filter jobs by that category",
  },
  {
    icon: Send,
    selector: "[data-tour='date-filters']",
    position: "bottom",
    title: "Filter by Date",
    description: "Quickly filter jobs by Today, Yesterday, or pick a custom date to see the freshest listings.",
    tip: "Use 'Today' to see jobs posted in the last 24 hours",
  },
  {
    icon: FileText,
    selector: "[data-tour='nav-links']",
    position: "bottom",
    title: "Your Job Tools",
    description: "Access Saved jobs, Applied history, Recommendations, and your Profile from the navigation.",
    tip: "Check Recommendations for AI-matched jobs based on your resume",
  },
  {
    icon: MessageSquare,
    selector: "[data-tour='ai-orb']",
    position: "top",
    title: "Socia AI Assistant",
    description: "Ask Socia anything — career advice, interview prep, resume tips, or job search strategies.",
    tip: "Click the orb anytime for instant AI help",
  },
];

function getTooltipStyle(
  rect: DOMRect,
  position: TourStep["position"],
  tooltipW: number,
  tooltipH: number
) {
  const gap = 14;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = 0;
  let left = 0;
  let arrowSide: "top" | "bottom" | "left" | "right" = "top";

  switch (position) {
    case "bottom":
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      arrowSide = "top";
      break;
    case "top":
      top = rect.top - tooltipH - gap;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      arrowSide = "bottom";
      break;
    case "left":
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left - tooltipW - gap;
      arrowSide = "right";
      break;
    case "right":
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.right + gap;
      arrowSide = "left";
      break;
  }

  // Clamp within viewport
  left = Math.max(12, Math.min(left, vw - tooltipW - 12));
  top = Math.max(12, Math.min(top, vh - tooltipH - 12));

  return { top, left, arrowSide };
}

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; arrowSide: string } | null>(null);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setIsOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Position the tooltip relative to the target element
  const positionTooltip = useCallback(() => {
    if (!isOpen) return;
    const step = tourSteps[currentStep];
    const el = document.querySelector(step.selector);
    if (!el) {
      // Fallback: center the tooltip if element not found
      setHighlightRect(null);
      setTooltipPos({
        top: window.innerHeight / 2 - 140,
        left: window.innerWidth / 2 - 180,
        arrowSide: "none",
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    setHighlightRect(rect);

    // Use a default tooltip size for calculation
    const tooltipW = 360;
    const tooltipH = 280;
    const pos = getTooltipStyle(rect, step.position, tooltipW, tooltipH);
    setTooltipPos(pos);
  }, [isOpen, currentStep]);

  useEffect(() => {
    positionTooltip();
    window.addEventListener("resize", positionTooltip);
    window.addEventListener("scroll", positionTooltip, true);
    return () => {
      window.removeEventListener("resize", positionTooltip);
      window.removeEventListener("scroll", positionTooltip, true);
    };
  }, [positionTooltip]);

  const completeTour = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsOpen(false);
  }, []);

  const next = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeTour();
    }
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  if (!isOpen) return null;

  const step = tourSteps[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === tourSteps.length - 1;
  const pad = 6;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: "none" }}>
        {/* Overlay with cutout */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "auto" }}>
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {highlightRect && (
                <rect
                  x={highlightRect.left - pad}
                  y={highlightRect.top - pad}
                  width={highlightRect.width + pad * 2}
                  height={highlightRect.height + pad * 2}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="hsl(var(--background) / 0.75)"
            mask="url(#tour-mask)"
            onClick={completeTour}
          />
        </svg>

        {/* Highlight border glow */}
        {highlightRect && (
          <div
            className="absolute rounded-xl border-2 border-accent shadow-[0_0_20px_hsl(var(--accent)/0.3)] transition-all duration-300"
            style={{
              top: highlightRect.top - pad,
              left: highlightRect.left - pad,
              width: highlightRect.width + pad * 2,
              height: highlightRect.height + pad * 2,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Tooltip */}
        {tooltipPos && (
          <motion.div
            ref={tooltipRef}
            key={currentStep}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="absolute w-[340px] bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
              pointerEvents: "auto",
            }}
          >
            {/* Arrow */}
            {tooltipPos.arrowSide !== "none" && (
              <div
                className="absolute w-3 h-3 bg-card border border-border/60 rotate-45"
                style={{
                  ...(tooltipPos.arrowSide === "top" && {
                    top: -7,
                    left: "50%",
                    marginLeft: -6,
                    borderBottom: "none",
                    borderRight: "none",
                  }),
                  ...(tooltipPos.arrowSide === "bottom" && {
                    bottom: -7,
                    left: "50%",
                    marginLeft: -6,
                    borderTop: "none",
                    borderLeft: "none",
                  }),
                  ...(tooltipPos.arrowSide === "left" && {
                    left: -7,
                    top: "50%",
                    marginTop: -6,
                    borderTop: "none",
                    borderRight: "none",
                  }),
                  ...(tooltipPos.arrowSide === "right" && {
                    right: -7,
                    top: "50%",
                    marginTop: -6,
                    borderBottom: "none",
                    borderLeft: "none",
                  }),
                }}
              />
            )}

            {/* Accent bar */}
            <div className="h-1 bg-gradient-to-r from-accent via-accent/70 to-accent/30" />

            {/* Close */}
            <button
              onClick={completeTour}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-5 pt-4">
              {/* Progress dots */}
              <div className="flex items-center gap-1.5 mb-4">
                {tourSteps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? "w-6 bg-accent"
                        : i < currentStep
                        ? "w-3 bg-accent/40"
                        : "w-3 bg-muted"
                    }`}
                  />
                ))}
              </div>

              {/* Icon + title */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <StepIcon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-display font-bold text-foreground text-base">
                  {step.title}
                </h3>
              </div>

              <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                {step.description}
              </p>

              {/* Tip */}
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-accent/5 border border-accent/10 mb-5">
                <span className="text-accent text-xs font-medium shrink-0">💡</span>
                <span className="text-xs text-muted-foreground">{step.tip}</span>
              </div>

              {/* Nav */}
              <div className="flex items-center justify-between">
                <button
                  onClick={completeTour}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip tour
                </button>
                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <Button variant="outline" size="sm" onClick={prev} className="rounded-full px-3 h-8 text-xs">
                      <ChevronLeft className="h-3 w-3 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button size="sm" onClick={next} className="rounded-full px-4 h-8 text-xs bg-accent text-accent-foreground hover:bg-accent/90">
                    {isLast ? "Get Started" : "Next"}
                    {isLast ? <ArrowRight className="h-3 w-3 ml-1" /> : <ChevronRight className="h-3 w-3 ml-1" />}
                  </Button>
                </div>
              </div>

              <p className="text-center text-[11px] text-muted-foreground/50 mt-3">
                {currentStep + 1} of {tourSteps.length}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>,
    document.body
  );
}
