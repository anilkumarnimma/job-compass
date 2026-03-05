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
    }, 2000);
    return () => clearTimeout(timer);
  }, [showSplash]);

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-background overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.15 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Animated ring portals */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-accent/20"
                style={{ width: 120 + i * 100, height: 120 + i * 100 }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                  opacity: [0, 0.6, 0],
                  scale: [0.5, 1.4, 2.2],
                }}
                transition={{
                  duration: 1.8,
                  delay: i * 0.25,
                  ease: "easeOut",
                }}
              />
            ))}

            {/* Gradient glow behind logo */}
            <motion.div
              className="absolute w-40 h-40 rounded-full"
              style={{
                background: "radial-gradient(circle, hsl(var(--accent) / 0.25) 0%, transparent 70%)",
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1], opacity: [0, 0.8, 0.4] }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            />

            {/* Logo + text */}
            <motion.div
              className="flex flex-col items-center gap-4 relative z-10"
              initial={{ opacity: 0, scale: 0.6, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center shadow-lg"
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.8, delay: 0.4, ease: "easeInOut" }}
              >
                <Briefcase className="h-8 w-8 text-accent-foreground" />
              </motion.div>
              <motion.span
                className="font-display text-2xl font-bold text-foreground tracking-tight"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
              >
                Sociax.tech
              </motion.span>
              {/* Subtle tagline */}
              <motion.span
                className="text-xs text-muted-foreground tracking-widest uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                Entering workspace…
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={showSplash ? { opacity: 0, scale: 0.98 } : { opacity: 1, scale: 1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: showSplash ? 2.0 : 0,
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </motion.div>
    </>
  );
}
