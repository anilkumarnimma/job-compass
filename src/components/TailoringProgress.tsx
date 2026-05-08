import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  { label: "Reading your resume…", target: 20 },
  { label: "Analysing job requirements…", target: 40 },
  { label: "Matching your experience to the role…", target: 60 },
  { label: "Optimising for ATS keywords…", target: 80 },
  { label: "Finalising your tailored resume…", target: 95 },
];

/** Animated progress + cycling messages while AI generation runs. */
export function TailoringProgress() {
  const [step, setStep] = useState(0);
  const [pct, setPct] = useState(2);

  useEffect(() => {
    const t = setInterval(() => {
      setPct((p) => {
        const target = STEPS[step].target;
        if (p < target) return Math.min(target, p + 1);
        if (step < STEPS.length - 1) {
          setStep((s) => s + 1);
        }
        return p;
      });
    }, 250);
    return () => clearInterval(t);
  }, [step]);

  return (
    <div className="max-w-md mx-auto text-center py-10">
      <Loader2 className="h-10 w-10 text-[hsl(174_72%_42%)] animate-spin mx-auto mb-4" />
      <div className="text-sm font-medium text-foreground mb-3">{STEPS[step].label}</div>
      <Progress value={pct} className="h-2" />
      <div className="text-[11px] text-muted-foreground mt-2 tabular-nums">{pct}%</div>
    </div>
  );
}
