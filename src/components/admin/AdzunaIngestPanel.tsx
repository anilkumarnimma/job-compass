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
      <Card className="p-6 border-border/60">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Adzuna Auto-Ingest</h2>
              <p className="text-sm text-muted-foreground">
                Reuses {activeCount} active JSearch queries • US full-time roles • Excludes senior
                titles
              </p>
            </div>
          </div>
          <Button
            onClick={() => runIngest.mutate(undefined)}
            disabled={runIngest.isPending || activeCount === 0}
            className="gap-2"
          >
            {runIngest.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run All Active Now
          </Button>
        </div>

        {lastRun && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-xs text-muted-foreground">Last fetched</div>
              <div className="font-bold text-foreground">{lastRun.total_fetched}</div>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10">
              <div className="text-xs text-muted-foreground">Imported</div>
              <div className="font-bold text-green-600 dark:text-green-400">
                {lastRun.total_imported}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10">
              <div className="text-xs text-muted-foreground">Filtered out</div>
              <div className="font-bold text-yellow-600 dark:text-yellow-400">
                {lastRun.total_filtered}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10">
              <div className="text-xs text-muted-foreground">Duplicates</div>
              <div className="font-bold text-blue-600 dark:text-blue-400">
                {lastRun.total_skipped + lastRun.duplicates_removed}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-xs text-muted-foreground">When</div>
              <div className="font-medium text-foreground text-xs">
                {formatDistanceToNow(new Date(lastRun.started_at), { addSuffix: true })}
              </div>
            </div>
          </div>
        )}
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
