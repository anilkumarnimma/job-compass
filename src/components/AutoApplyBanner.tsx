import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap } from "lucide-react";
import { JobPulseLogo } from "@/components/JobPulseLogo";

const BANNER_KEY = "sociax_auto_apply_banner_dismissed";

export function AutoApplyBanner() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(BANNER_KEY));

  const dismiss = () => {
    localStorage.setItem(BANNER_KEY, "true");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4"
        >
          <div className="relative flex items-center gap-3 px-4 py-3 rounded-xl border border-accent/30 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent backdrop-blur-sm">
            <div className="flex items-center gap-2 shrink-0">
              <JobPulseLogo size="sm" showText={false} />
              <Zap className="h-4 w-4 text-accent" />
            </div>
            <p className="text-sm text-foreground flex-1">
              <span className="font-semibold">🤖 Auto Apply Coming Soon</span>
              <span className="hidden sm:inline"> — We'll apply to jobs for you automatically 🔥</span>
              <span className="sm:hidden"> — Auto-apply to jobs 🔥</span>
            </p>
            <button
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
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
