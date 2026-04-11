import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { X, Linkedin, ArrowRight } from "lucide-react";
import linkedinBannerImg from "@/assets/linkedin-connect-banner.jpg";

const STORAGE_KEY = "sociax_linkedin_feature_banner_seen";

export function LinkedInFeatureBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  const storageKey = user ? `${STORAGE_KEY}_${user.id}` : STORAGE_KEY;

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  const dismiss = () => {
    localStorage.setItem(storageKey, "true");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="mb-5"
        >
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-lg">
            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-background transition-all"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col md:flex-row items-stretch">
              {/* Image section */}
              <div className="relative w-full md:w-[280px] h-[140px] md:h-auto shrink-0 overflow-hidden">
                <img
                  src={linkedinBannerImg}
                  alt="LinkedIn Connect Feature"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width={1200}
                  height={512}
                />
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-card md:block hidden" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card md:hidden block" />
              </div>

              {/* Content section */}
              <div className="flex-1 p-4 md:p-5 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent">
                    <Linkedin className="h-3 w-3" />
                    New Feature
                  </span>
                </div>

                <h3 className="text-base md:text-lg font-bold text-foreground mb-1.5 leading-tight">
                  LinkedIn Connect & Referrals
                </h3>
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed max-w-md">
                  Connect with people at companies you're applying to — get AI-generated connection messages & referral requests. Look for the{" "}
                  <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                    <Linkedin className="h-3 w-3 text-[#0077b5]" /> Connect
                  </span>{" "}
                  button on any job card!
                </p>

                <button
                  onClick={dismiss}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent/80 transition-colors w-fit group"
                >
                  Got it, let me try!
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
