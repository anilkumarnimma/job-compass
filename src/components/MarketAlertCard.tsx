import { useActiveMarketAlert } from "@/hooks/useMarketAlerts";
import { AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function MarketAlertCard() {
  const { data: alert, isLoading } = useActiveMarketAlert();

  // Don't render anything if no active alert
  if (isLoading || !alert) {
    return null;
  }

  return (
    <div className="p-3">
      {/* Header - compact */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-foreground text-xs">Market Alert</h3>
          <p className="text-[10px] text-muted-foreground">Today's update</p>
        </div>
      </div>

      {/* Alert Content - truncated */}
      <div className="p-2 bg-destructive/5 border border-destructive/10 rounded-md">
        <p className="text-xs text-foreground leading-snug line-clamp-2">
          {alert.message}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
