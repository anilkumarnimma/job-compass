import { useState } from "react";
import { Crown, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { motion } from "framer-motion";

export function PremiumUpgradeBanner() {
  const { profile } = useProfile();
  const { user } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!user || profile?.is_premium) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative mb-4 rounded-xl overflow-hidden group"
      >
        {/* Animated gradient border */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-[shimmer_3s_linear_infinite] p-[1.5px]">
          <div className="absolute inset-[1.5px] rounded-[10px] bg-background" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">
                  Unlock unlimited job applications for just{" "}
                  <span className="text-primary">$5.99/month</span>
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  <Sparkles className="h-3 w-3" /> Most Popular 🚀
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Apply without limits • Access all features
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setShowUpgrade(true)}
            className="shrink-0 rounded-lg gap-1.5 shadow-md hover:shadow-lg transition-shadow"
          >
            Upgrade Now
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.div>

      <UpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
}
