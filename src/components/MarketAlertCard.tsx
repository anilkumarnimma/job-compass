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
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-4 w-4 text-destructive" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-sm">Market Alert</h3>
          <p className="text-xs text-muted-foreground">Today's hiring market update</p>
        </div>
      </div>

      {/* Alert Content */}
      <div className="p-3 bg-destructive/5 border border-destructive/10 rounded-lg">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {alert.message}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Posted {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
