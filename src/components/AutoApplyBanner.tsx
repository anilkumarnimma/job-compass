import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export function AutoApplyBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="relative rounded-xl p-[2px] overflow-hidden"
      style={{
        background: "linear-gradient(90deg, hsl(var(--accent)), hsl(var(--primary)), hsl(217 91% 60%), hsl(var(--accent)))",
        backgroundSize: "300% 100%",
        animation: "border-flow 3s linear infinite",
      }}
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-[10px] bg-card">
        {/* Spinning + shining Sociax S logo */}
        <div className="relative shrink-0 h-7 w-7">
          <motion.div
            animate={{ rotateY: 360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
            className="h-7 w-7"
            style={{ perspective: 200 }}
          >
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <defs>
                <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(217, 91%, 60%)" />
                  <stop offset="100%" stopColor="hsl(221, 83%, 53%)" />
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#spinGrad)" />
              <text x="20" y="28" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="24" fill="white">S</text>
            </svg>
          </motion.div>
          {/* Shine overlay */}
          <div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)",
              backgroundSize: "200% 100%",
              animation: "shine-sweep 2.5s ease-in-out infinite 0.5s",
            }}
          />
        </div>
        <Zap className="h-4 w-4 text-accent shrink-0" />
        <span className="text-sm font-medium text-foreground whitespace-nowrap">
          🤖 Auto Apply Coming Soon
        </span>
        <span className="hidden sm:inline text-sm text-muted-foreground">
          — We'll apply to jobs for you automatically 🔥
        </span>
      </div>
    </motion.div>
  );
}
