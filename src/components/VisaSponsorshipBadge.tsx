import { VisaSponsorshipResult } from "@/lib/visaSponsorship";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VisaSponsorshipBadgeProps {
  result: VisaSponsorshipResult;
  compact?: boolean;
}

const BADGE_STYLES: Record<string, string> = {
  sponsors: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold",
  stem_opt: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold",
  opt_friendly: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30 font-semibold",
  unlikely: "bg-warning/10 text-warning border-warning/20",
  unknown: "bg-muted text-muted-foreground border-border/40",
};

const BADGE_LABELS: Record<string, string> = {
  sponsors: "H1B Sponsorship",
  stem_opt: "STEM OPT",
  opt_friendly: "OPT Friendly",
  unlikely: "No Sponsorship",
  unknown: "Not Specified",
};

export function VisaSponsorshipBadge({ result, compact = false }: VisaSponsorshipBadgeProps) {
  // Hide unknown/unlikely in compact (card) mode
  if (compact && (result.status === "unknown" || result.status === "unlikely")) return null;

  const badgeStyle = BADGE_STYLES[result.status] || BADGE_STYLES.unknown;
  const label = BADGE_LABELS[result.status] || result.label;
  const showOnCard = result.status === "sponsors" || result.status === "stem_opt" || result.status === "opt_friendly";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border whitespace-nowrap ${badgeStyle} ${showOnCard ? 'shadow-sm' : ''}`}
          >
            {result.emoji} {compact ? label : result.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[220px]">
          <p className="font-medium mb-1">{result.label}</p>
          {result.visaTypes.length > 0 && (
            <p className="text-muted-foreground">Visa types: {result.visaTypes.join(", ")}</p>
          )}
          <p className="text-muted-foreground">Confidence: {result.confidence}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
