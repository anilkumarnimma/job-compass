import { useState, useEffect, useCallback } from "react";
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

const TOUR_STORAGE_KEY = "sociax_onboarding_complete";

const tourSteps = [
  {
    icon: Search,
    title: "Search & Browse Jobs",
    description: "Use the Dashboard to search jobs by title, skills, company, or location. Filter by date, visa sponsorship, and more.",
    tip: "Go to Dashboard → type any keyword to start",
  },
  {
    icon: BarChart3,
    title: "Landing Probability",
    description: "Every job shows your match percentage based on your resume skills and experience. Higher % = better fit for you.",
    tip: "Upload your resume first for accurate scores",
  },
  {
    icon: FileCheck,
    title: "ATS Score Check",
    description: "Check how well your resume passes Applicant Tracking Systems. Get a score and tips to improve it.",
    tip: "Click 'ATS Check' on any job card",
  },
  {
    icon: FileText,
    title: "Tailored Resume & Cover Letter",
    description: "Generate a job-specific resume or cover letter with AI — perfectly tailored to match the job description.",
    tip: "Available on each job's action menu",
  },
  {
    icon: Send,
    title: "One-Click Apply",
    description: "Apply to any job with a single click. Your application is tracked automatically in the 'Applied' section.",
    tip: "Click 'Apply' → confirm → done!",
  },
  {
    icon: Bookmark,
    title: "Save & Track Jobs",
    description: "Bookmark jobs to review later. Track all your applied, saved, and recommended jobs from the sidebar.",
    tip: "Use the bookmark icon on any job card",
  },
  {
    icon: MessageSquare,
    title: "Interview Prep & AI Chat",
    description: "Get AI-generated interview questions for any job. Use Socia AI assistant for career guidance anytime.",
    tip: "Look for the AI orb in the bottom-right corner",
  },
];

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      // Small delay so the page loads first
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={completeTour}
        />

        {/* Tour card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-md bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header accent bar */}
          <div className="h-1 bg-gradient-to-r from-accent via-accent/70 to-purple-500/50" />

          {/* Close button */}
          <button
            onClick={completeTour}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-6 pt-5">
            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mb-5">
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

            {/* Icon */}
            <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
              <StepIcon className="h-6 w-6 text-accent" />
            </div>

            {/* Content */}
            <h3 className="font-display font-bold text-foreground text-lg mb-2">
              {step.title}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-3">
              {step.description}
            </p>

            {/* Tip */}
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-accent/5 border border-accent/10 mb-6">
              <span className="text-accent text-xs font-medium shrink-0 mt-0.5">💡 Tip:</span>
              <span className="text-xs text-muted-foreground">{step.tip}</span>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={completeTour}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip tour
              </button>

              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prev}
                    className="rounded-full px-3"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Back
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={next}
                  className="rounded-full px-4 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {isLast ? "Get Started" : "Next"}
                  {isLast ? (
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  )}
                </Button>
              </div>
            </div>

            {/* Step counter */}
            <p className="text-center text-[11px] text-muted-foreground/60 mt-4">
              {currentStep + 1} of {tourSteps.length}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
