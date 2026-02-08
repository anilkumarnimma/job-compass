import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useActiveMarketAlert,
  useAllMarketAlerts,
  usePublishMarketAlert,
  useDeactivateMarketAlert,
} from "@/hooks/useMarketAlerts";
import { AlertCircle, Loader2, Send, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function MarketAlertManager() {
  const { data: activeAlert } = useActiveMarketAlert();
  const { data: allAlerts = [], isLoading } = useAllMarketAlerts();
  const publishAlert = usePublishMarketAlert();
  const deactivateAlert = useDeactivateMarketAlert();

  const [message, setMessage] = useState("");
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  const handlePublish = async () => {
    if (!message.trim()) return;
    await publishAlert.mutateAsync(message.trim());
    setMessage("");
    setShowPublishConfirm(false);
  };

  const handleDeactivate = async () => {
    if (!activeAlert) return;
    await deactivateAlert.mutateAsync(activeAlert.id);
  };

  return (
    <Card className="p-6 border-border/60">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Post Market Alert</h2>
          <p className="text-sm text-muted-foreground">
            Create an alert to display on the dashboard
          </p>
        </div>
      </div>

      {/* Current Active Alert */}
      {activeAlert && (
        <div className="mb-6 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="destructive" className="text-xs">Active</Badge>
                <span className="text-xs text-muted-foreground">
                  Posted {formatDistanceToNow(new Date(activeAlert.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {activeAlert.message}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
              onClick={handleDeactivate}
              disabled={deactivateAlert.isPending}
            >
              {deactivateAlert.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* New Alert Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="alert-message" className="text-sm font-medium">
            Alert Message
          </Label>
          <Textarea
            id="alert-message"
            placeholder="Write your market update here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-2 min-h-[100px] resize-none"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {message.length}/500 characters
          </p>
        </div>

        <Button
          onClick={() => setShowPublishConfirm(true)}
          disabled={!message.trim() || publishAlert.isPending}
          className="w-full gap-2"
        >
          {publishAlert.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Publish Alert
        </Button>

        {activeAlert && (
          <p className="text-xs text-muted-foreground text-center">
            Publishing a new alert will replace the current one.
          </p>
        )}
      </div>

      {/* Recent Alerts History */}
      {allAlerts.length > 1 && (
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-medium text-foreground mb-3">Recent Alerts</h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {allAlerts.slice(1).map((alert) => (
              <div
                key={alert.id}
                className="p-3 bg-secondary/30 rounded-lg"
              >
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {alert.message}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publish Confirmation */}
      <AlertDialog open={showPublishConfirm} onOpenChange={setShowPublishConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Market Alert?</AlertDialogTitle>
            <AlertDialogDescription>
              {activeAlert
                ? "This will replace the current active alert. All users will see the new alert immediately."
                : "This alert will be displayed on the dashboard for all users."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>
              Publish Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
