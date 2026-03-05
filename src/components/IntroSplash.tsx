import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase } from "lucide-react";

interface IntroSplashProps {
  children: React.ReactNode;
}

export function IntroSplash({ children }: IntroSplashProps) {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("sociax_intro_seen");
  });

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem("sociax_intro_seen", "1");
    }, 1800);
    return () => clearTimeout(timer);
  }, [showSplash]);

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <motion.div
                className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center shadow-lg"
                animate={{
                  boxShadow: [
                    "0 0 0 0 hsl(var(--accent) / 0.4)",
                    "0 0 0 20px hsl(var(--accent) / 0)",
                    "0 0 0 0 hsl(var(--accent) / 0)",
                  ],
                }}
                transition={{ duration: 1.2, repeat: 1, ease: "easeOut" }}
              >
                <Briefcase className="h-8 w-8 text-accent-foreground" />
              </motion.div>
              <motion.span
                className="font-display text-2xl font-bold text-foreground tracking-tight"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                Sociax.tech
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={showSplash ? { opacity: 0 } : { opacity: 1 }}
        animate={{ opacity: 1 }}
        transition={{ delay: showSplash ? 1.8 : 0, duration: 0.4 }}
      >
        {children}
      </motion.div>
    </>
  );
}
