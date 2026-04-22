import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  Play,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  Plus,
  Trash2,
  Power,
  PowerOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAtsCompanies,
  useAtsDiscoveryRuns,
  useAtsIngestRuns,
  useRunAtsDiscovery,
  useRunAtsIngest,
  useAddAtsCompany,
  useUpdateAtsCompanyStatus,
  useDeleteAtsCompany,
} from "@/hooks/useAtsCompanies";

export function CompanyDiscoveryPanel() {
  const { data: companies = [], isLoading: companiesLoading } = useAtsCompanies();
  const { data: discoveryRuns = [] } = useAtsDiscoveryRuns();
  const { data: ingestRuns = [] } = useAtsIngestRuns();

  const runDiscovery = useRunAtsDiscovery();
  const runIngest = useRunAtsIngest();
  const addCompany = useAddAtsCompany();
  const updateStatus = useUpdateAtsCompanyStatus();
  const deleteCompany = useDeleteAtsCompany();

  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newPlatform, setNewPlatform] = useState<"greenhouse" | "lever" | "ashby">("greenhouse");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Stats
  const total = companies.length;
  const active = companies.filter((c) => c.status === "active").length;
  const inactive = companies.filter((c) => c.status === "inactive").length;
  const pending = companies.filter((c) => c.status === "pending").length;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = companies.filter((c) => new Date(c.date_added).getTime() > oneWeekAgo).length;
  const autoDiscovered = companies.filter((c) => c.auto_discovered).length;

  const lastDiscovery = discoveryRuns[0];
  const lastIngest = ingestRuns[0];

  const filtered = companies.filter((c) => {
    if (filterPlatform !== "all" && c.ats_platform !== filterPlatform) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    return true;
  });

  const handleAdd = () => {
    if (!newSlug.trim() || !newName.trim()) return;
    addCompany.mutate(
      { slug: newSlug, company_name: newName, ats_platform: newPlatform },
      {
        onSuccess: () => {
          setNewSlug("");
          setNewName("");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="p-6 border-border/60">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Company Discovery</h2>
              <p className="text-sm text-muted-foreground">
                Auto-discovers Greenhouse, Lever, and Ashby company boards. Runs weekly on Sundays at 00:00 UTC.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => runDiscovery.mutate()}
              disabled={runDiscovery.isPending}
              variant="outline"
              className="gap-2"
            >
              {runDiscovery.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Run Discovery
            </Button>
            <Button
              onClick={() => runIngest.mutate(undefined)}
              disabled={runIngest.isPending || active === 0}
              className="gap-2"
            >
              {runIngest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Ingest Active Now
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 rounded-lg bg-muted/40">
            <div className="text-xs text-muted-foreground">Total tracked</div>
            <div className="text-2xl font-bold text-foreground">{total}</div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10">
            <div className="text-xs text-muted-foreground">Active</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{active}</div>
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/10">
            <div className="text-xs text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pending}</div>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10">
            <div className="text-xs text-muted-foreground">Inactive</div>
            <div className="text-2xl font-bold text-destructive">{inactive}</div>
          </div>
          <div className="p-3 rounded-lg bg-primary/10">
            <div className="text-xs text-muted-foreground">New this week</div>
            <div className="text-2xl font-bold text-primary">{newThisWeek}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {lastDiscovery && (
            <div className="p-3 rounded-lg border border-border/40">
              <div className="text-xs text-muted-foreground mb-1">Last discovery run</div>
              <div className="font-medium">
                {lastDiscovery.total_validated} validated, {lastDiscovery.total_activated} activated, {lastDiscovery.total_deactivated} deactivated
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(lastDiscovery.started_at), { addSuffix: true })} • {lastDiscovery.status}
              </div>
            </div>
          )}
          {lastIngest && (
            <div className="p-3 rounded-lg border border-border/40">
              <div className="text-xs text-muted-foreground mb-1">Last ingest run</div>
              <div className="font-medium">
                {lastIngest.total_imported} imported across {lastIngest.companies_processed} companies
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(lastIngest.started_at), { addSuffix: true })} • {lastIngest.status}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Add company manually */}
      <Card className="p-6 border-border/60">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          Add Company Manually
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="Slug (e.g. stripe)"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            className="font-mono"
          />
          <Input
            placeholder="Company name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Select value={newPlatform} onValueChange={(v) => setNewPlatform(v as "greenhouse" | "lever" | "ashby") }>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="greenhouse">Greenhouse</SelectItem>
              <SelectItem value="lever">Lever</SelectItem>
              <SelectItem value="ashby">Ashby</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={!newSlug.trim() || !newName.trim() || addCompany.isPending}>
            {addCompany.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Company"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          New companies start as <strong>pending</strong>. Run discovery to auto-validate & activate.
        </p>
      </Card>

      {/* Companies table */}
      <Card className="p-6 border-border/60">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Tracked Companies ({filtered.length} of {total})
          </h3>
          <div className="flex gap-2">
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                <SelectItem value="greenhouse">Greenhouse</SelectItem>
                <SelectItem value="lever">Lever</SelectItem>
                <SelectItem value="ashby">Ashby</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {companiesLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No companies match the filter</p>
        ) : (
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Jobs (last)</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.company_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{c.slug}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{c.ats_platform}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          c.status === "active"
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : c.status === "pending"
                            ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                            : "bg-destructive/10 text-destructive"
                        }
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{c.jobs_found_last_run}</TableCell>
                    <TableCell>
                      {c.auto_discovered ? (
                        <Badge variant="outline" className="text-xs">Auto-discovered</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Seed/Manual</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.date_added), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === "active" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Deactivate"
                            onClick={() => updateStatus.mutate({ id: c.id, status: "inactive" })}
                          >
                            <PowerOff className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Activate"
                            onClick={() => updateStatus.mutate({ id: c.id, status: "active" })}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Delete"
                          onClick={() => {
                            if (confirm(`Remove ${c.company_name} from tracking?`)) deleteCompany.mutate(c.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          {autoDiscovered} of {total} were auto-discovered. Showing first 200 rows.
        </p>
      </Card>

      {/* Recent runs */}
      <Card className="p-6 border-border/60">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Recent Ingest Runs
        </h3>
        {ingestRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No ingest runs yet</p>
        ) : (
          <div className="space-y-2">
            {ingestRuns.slice(0, 10).map((run) => (
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
                      • {run.companies_processed} companies • {run.total_fetched} fetched • {run.total_filtered} filtered
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {run.trigger_type} •{" "}
                    {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                    {run.duration_ms && ` • ${(run.duration_ms / 1000).toFixed(1)}s`}
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">{run.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
