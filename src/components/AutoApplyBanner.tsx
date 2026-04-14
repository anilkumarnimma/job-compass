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
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/30 bg-accent/10 backdrop-blur-sm"
        >
          <JobPulseLogo size="sm" showText={false} />
          <Zap className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs font-medium text-foreground whitespace-nowrap">
            🤖 Auto Apply Coming Soon 🔥
          </span>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-1"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
