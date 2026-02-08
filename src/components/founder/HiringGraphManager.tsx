import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  useHiringGraphData,
  useAddHiringGraphEntry,
  useUpdateHiringGraphEntry,
  useDeleteHiringGraphEntry,
  useReorderHiringGraph,
  HiringGraphEntry,
} from "@/hooks/useHiringGraphData";
import {
  BarChart3,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Save,
  Pencil,
  X,
  Check,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
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

export function HiringGraphManager() {
  const { data: entries = [], isLoading } = useHiringGraphData();
  const addEntry = useAddHiringGraphEntry();
  const updateEntry = useUpdateHiringGraphEntry();
  const deleteEntry = useDeleteHiringGraphEntry();
  const reorderEntries = useReorderHiringGraph();

  const [newRoleName, setNewRoleName] = useState("");
  const [newPercentage, setNewPercentage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editPercentage, setEditPercentage] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const activeCount = entries.filter((e) => e.is_active).length;

  const handleAdd = async () => {
    if (!newRoleName.trim()) return;
    const pct = parseInt(newPercentage, 10);
    if (isNaN(pct) || pct < 0 || pct > 100) return;

    await addEntry.mutateAsync({
      role_name: newRoleName.trim(),
      percentage: pct,
      sort_order: entries.length,
    });

    setNewRoleName("");
    setNewPercentage("");
  };

  const startEditing = (entry: HiringGraphEntry) => {
    setEditingId(entry.id);
    setEditRoleName(entry.role_name);
    setEditPercentage(entry.percentage.toString());
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditRoleName("");
    setEditPercentage("");
  };

  const saveEditing = async () => {
    if (!editingId || !editRoleName.trim()) return;
    const pct = parseInt(editPercentage, 10);
    if (isNaN(pct) || pct < 0 || pct > 100) return;

    await updateEntry.mutateAsync({
      id: editingId,
      role_name: editRoleName.trim(),
      percentage: pct,
    });

    cancelEditing();
  };

  const toggleActive = async (entry: HiringGraphEntry) => {
    await updateEntry.mutateAsync({
      id: entry.id,
      is_active: !entry.is_active,
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteEntry.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const newEntries = [...entries];
    [newEntries[index - 1], newEntries[index]] = [newEntries[index], newEntries[index - 1]];
    await reorderEntries.mutateAsync(
      newEntries.map((e, i) => ({ id: e.id, sort_order: i }))
    );
  };

  const moveDown = async (index: number) => {
    if (index === entries.length - 1) return;
    const newEntries = [...entries];
    [newEntries[index], newEntries[index + 1]] = [newEntries[index + 1], newEntries[index]];
    await reorderEntries.mutateAsync(
      newEntries.map((e, i) => ({ id: e.id, sort_order: i }))
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-border/60">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Update Hiring Graph</h2>
          <p className="text-sm text-muted-foreground">
            Manage roles shown on the dashboard graph (max 5 active)
          </p>
        </div>
      </div>

      {/* Add New Role Form */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-secondary/30 rounded-lg">
        <div className="flex-1">
          <Label htmlFor="new-role" className="text-xs text-muted-foreground mb-1 block">
            Role Name
          </Label>
          <Input
            id="new-role"
            placeholder="e.g. Software Engineer"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="w-full sm:w-28">
          <Label htmlFor="new-pct" className="text-xs text-muted-foreground mb-1 block">
            Percentage
          </Label>
          <Input
            id="new-pct"
            type="number"
            min={0}
            max={100}
            placeholder="0-100"
            value={newPercentage}
            onChange={(e) => setNewPercentage(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={handleAdd}
            disabled={!newRoleName.trim() || !newPercentage || addEntry.isPending}
            size="sm"
            className="h-9"
          >
            {addEntry.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Info Badge */}
      <div className="mb-4">
        <Badge variant={activeCount > 5 ? "destructive" : "secondary"}>
          {activeCount}/5 active roles displayed
        </Badge>
      </div>

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No roles added yet. Add your first role above.</p>
          <p className="text-xs mt-1">The dashboard graph will be empty until you add data.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                entry.is_active ? "bg-card border-border" : "bg-muted/30 border-border/50 opacity-60"
              }`}
            >
              {/* Reorder Buttons */}
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => moveUp(index)}
                  disabled={index === 0 || reorderEntries.isPending}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => moveDown(index)}
                  disabled={index === entries.length - 1 || reorderEntries.isPending}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {editingId === entry.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editRoleName}
                      onChange={(e) => setEditRoleName(e.target.value)}
                      className="h-8 flex-1"
                      placeholder="Role name"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editPercentage}
                      onChange={(e) => setEditPercentage(e.target.value)}
                      className="h-8 w-20"
                      placeholder="%"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground truncate">
                      {entry.role_name}
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      {entry.percentage}%
                    </Badge>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {editingId === entry.id ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={saveEditing}
                      disabled={updateEntry.isPending}
                    >
                      <Check className="h-4 w-4 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={cancelEditing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Active Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {entry.is_active ? "Active" : "Hidden"}
                      </span>
                      <Switch
                        checked={entry.is_active}
                        onCheckedChange={() => toggleActive(entry)}
                        disabled={updateEntry.isPending}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEditing(entry)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this role from the hiring graph.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
