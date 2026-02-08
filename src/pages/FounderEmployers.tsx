import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useMyPermissions, useAllUsers, useUpdateUserPermissions, useMakeEmployerAdmin, useRemoveEmployerPermissions } from "@/hooks/usePermissions";
import { Users, Search, Loader2, Shield, Crown, User, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function FounderEmployers() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: permissions, isLoading: permLoading } = useMyPermissions();
  const { data: users = [], isLoading: usersLoading } = useAllUsers();
  const updatePermissions = useUpdateUserPermissions();
  const makeEmployerAdmin = useMakeEmployerAdmin();
  const removePermissions = useRemoveEmployerPermissions();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<typeof users[0] | null>(null);
  const [localPermissions, setLocalPermissions] = useState({
    can_post_jobs: false,
    can_edit_jobs: false,
    can_delete_jobs: false,
    can_view_graphs: false,
    can_import_google_sheet: false,
    can_manage_team: false,
  });

  const isLoading = authLoading || permLoading;
  const isFounder = permissions?.isFounder;

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(query) ||
        u.full_name?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Exclude founder from list
  const nonFounderUsers = filteredUsers.filter((u) => u.role !== "founder");

  const handleSelectUser = (selectedUserData: typeof users[0]) => {
    setSelectedUser(selectedUserData);
    setLocalPermissions({
      can_post_jobs: selectedUserData.permissions?.can_post_jobs || false,
      can_edit_jobs: selectedUserData.permissions?.can_edit_jobs || false,
      can_delete_jobs: selectedUserData.permissions?.can_delete_jobs || false,
      can_view_graphs: selectedUserData.permissions?.can_view_graphs || false,
      can_import_google_sheet: selectedUserData.permissions?.can_import_google_sheet || false,
      can_manage_team: selectedUserData.permissions?.can_manage_team || false,
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    
    // Use the user's ID as employer_id if not set
    const employerId = selectedUser.employer_id || selectedUser.id;
    
    await updatePermissions.mutateAsync({
      userId: selectedUser.id,
      employerId,
      permissions: localPermissions,
    });
    setSelectedUser(null);
  };

  const handleQuickMakeAdmin = async (userData: typeof users[0]) => {
    const employerId = userData.employer_id || userData.id;
    await makeEmployerAdmin.mutateAsync({
      userId: userData.id,
      employerId,
    });
  };

  const handleRemovePermissions = async (userId: string) => {
    await removePermissions.mutateAsync(userId);
    setSelectedUser(null);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!user || !isFounder) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Manage Employers
            </h1>
            <p className="text-muted-foreground">
              Assign permissions to employer accounts
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users List */}
        {usersLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        ) : nonFounderUsers.length === 0 ? (
          <Card className="p-12 text-center border-border/60">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No users found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Try a different search term" : "No registered users yet"}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {nonFounderUsers.map((userData) => {
              const hasPermissions = userData.permissions && (
                userData.permissions.can_post_jobs ||
                userData.permissions.can_edit_jobs ||
                userData.permissions.can_delete_jobs
              );

              return (
                <Card
                  key={userData.id}
                  className="p-4 border-border/60 hover:border-border transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        {userData.role === "employer" ? (
                          <Shield className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {userData.full_name || userData.email}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {userData.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasPermissions && (
                        <Badge variant="accent" className="hidden sm:flex">
                          Employer
                        </Badge>
                      )}
                      {!hasPermissions && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickMakeAdmin(userData)}
                          disabled={makeEmployerAdmin.isPending}
                        >
                          Make Employer Admin
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectUser(userData)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>

                  {/* Show current permissions summary */}
                  {hasPermissions && userData.permissions && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/60">
                      {userData.permissions.can_post_jobs && (
                        <Badge variant="secondary" className="text-xs">Post Jobs</Badge>
                      )}
                      {userData.permissions.can_edit_jobs && (
                        <Badge variant="secondary" className="text-xs">Edit Jobs</Badge>
                      )}
                      {userData.permissions.can_delete_jobs && (
                        <Badge variant="secondary" className="text-xs">Delete Jobs</Badge>
                      )}
                      {userData.permissions.can_view_graphs && (
                        <Badge variant="secondary" className="text-xs">View Graphs</Badge>
                      )}
                      {userData.permissions.can_import_google_sheet && (
                        <Badge variant="secondary" className="text-xs">Google Import</Badge>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Edit Permissions Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Permissions</DialogTitle>
              <DialogDescription>
                {selectedUser?.full_name || selectedUser?.email}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Permission toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="can_post_jobs">Post Jobs</Label>
                  <Switch
                    id="can_post_jobs"
                    checked={localPermissions.can_post_jobs}
                    onCheckedChange={(checked) =>
                      setLocalPermissions((p) => ({ ...p, can_post_jobs: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="can_edit_jobs">Edit Jobs</Label>
                  <Switch
                    id="can_edit_jobs"
                    checked={localPermissions.can_edit_jobs}
                    onCheckedChange={(checked) =>
                      setLocalPermissions((p) => ({ ...p, can_edit_jobs: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="can_delete_jobs">Delete Jobs</Label>
                  <Switch
                    id="can_delete_jobs"
                    checked={localPermissions.can_delete_jobs}
                    onCheckedChange={(checked) =>
                      setLocalPermissions((p) => ({ ...p, can_delete_jobs: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="can_view_graphs">View Analytics Graphs</Label>
                  <Switch
                    id="can_view_graphs"
                    checked={localPermissions.can_view_graphs}
                    onCheckedChange={(checked) =>
                      setLocalPermissions((p) => ({ ...p, can_view_graphs: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="can_import_google_sheet">Google Sheet Import</Label>
                  <Switch
                    id="can_import_google_sheet"
                    checked={localPermissions.can_import_google_sheet}
                    onCheckedChange={(checked) =>
                      setLocalPermissions((p) => ({ ...p, can_import_google_sheet: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="can_manage_team">Manage Team</Label>
                  <Switch
                    id="can_manage_team"
                    checked={localPermissions.can_manage_team}
                    onCheckedChange={(checked) =>
                      setLocalPermissions((p) => ({ ...p, can_manage_team: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-2">
              {selectedUser?.permissions && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemovePermissions(selectedUser.id)}
                  disabled={removePermissions.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove All
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => setSelectedUser(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePermissions}
                  disabled={updatePermissions.isPending}
                >
                  Save Permissions
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
