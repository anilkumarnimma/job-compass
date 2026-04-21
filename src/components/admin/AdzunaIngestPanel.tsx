import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAdzunaRuns, useRunAdzunaIngest } from "@/hooks/useAdzunaIngest";
import { useJSearchSeeds } from "@/hooks/useJSearchIngest";

export function AdzunaIngestPanel() {
  const { data: seeds = [] } = useJSearchSeeds();
  const { data: runs = [] } = useAdzunaRuns();
  const runIngest = useRunAdzunaIngest();

  const activeCount = seeds.filter((s) => s.is_active).length;
  const lastRun = runs[0];

  return (
    <div className="space-y-6">
      <Card className="p-6 border-border/60 bg-destructive/5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/15 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="max-w-2xl">
              <h2 className="text-xl font-bold text-foreground">Adzuna Auto-Ingest — Disabled</h2>
              <p className="text-sm text-muted-foreground">
                The free Adzuna API only returns <code className="text-xs px-1 rounded bg-muted">adzuna.com</code> redirect URLs
                instead of direct employer apply links, so users would land on a middleman page.
                Ingest is paused and the {/* */}
                {/* keep the activeCount visible for context */}
                {activeCount} JSearch seed queries are reused only by the other sources.
              </p>
            </div>
          </div>
          <Button disabled variant="outline" className="gap-2">
            <Play className="h-4 w-4" />
            Disabled
          </Button>
        </div>
      </Card>

      <Card className="p-6 border-border/60">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Recent Runs
        </h3>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No runs yet</p>
        ) : (
          <div className="space-y-2">
            {runs.slice(0, 10).map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 text-sm"
              >
                {run.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : run.status === "running" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">
                    {run.total_imported} imported
                    <span className="text-muted-foreground font-normal ml-2">
                      • {run.total_fetched} fetched • {run.total_filtered} filtered
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {run.trigger_type} •{" "}
                    {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                    {run.duration_ms && ` • ${(run.duration_ms / 1000).toFixed(1)}s`}
                  </div>
                </div>
                <Badge
                  variant={run.status === "completed" ? "secondary" : "outline"}
                  className="text-xs"
                >
                  {run.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
