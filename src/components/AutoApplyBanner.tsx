import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap } from "lucide-react";
import { JobPulseLogo } from "@/components/JobPulseLogo";

const BANNER_KEY = "sociax_auto_apply_banner_dismissed";

export function AutoApplyBanner() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(BANNER_KEY));

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(BANNER_KEY, "true");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="relative rounded-xl p-[2px] overflow-hidden"
          style={{
            background: "linear-gradient(90deg, hsl(var(--accent)), hsl(var(--primary)), hsl(217 91% 60%), hsl(var(--accent)))",
            backgroundSize: "300% 100%",
            animation: "border-flow 3s linear infinite",
          }}
        >
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-[10px] bg-card">
            <JobPulseLogo size="sm" showText={false} />
            <Zap className="h-4 w-4 text-accent shrink-0" />
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              🤖 Auto Apply Coming Soon
            </span>
            <span className="hidden sm:inline text-sm text-muted-foreground">
              — We'll apply to jobs for you automatically 🔥
            </span>
            <button
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-auto"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
