import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { RoleRequestModal } from "./RoleRequestModal";

export function RoleRequestBanner() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={() => setModalOpen(true)}
        data-tour="role-request"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors group cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-accent shrink-0" />
          <span className="text-sm font-medium text-foreground">
            Not finding your role? <span className="text-accent">Request it</span>
          </span>
        </div>
        <ArrowRight className="h-4 w-4 text-accent group-hover:translate-x-0.5 transition-transform shrink-0" />
      </motion.button>

      <RoleRequestModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
