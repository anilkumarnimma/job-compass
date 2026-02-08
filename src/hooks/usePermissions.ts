import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface EmployerPermissions {
  id: string;
  employer_id: string;
  user_id: string;
  can_post_jobs: boolean;
  can_edit_jobs: boolean;
  can_delete_jobs: boolean;
  can_view_graphs: boolean;
  can_import_google_sheet: boolean;
  can_manage_team: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithProfile {
  id: string;
  email: string;
  full_name: string | null;
  employer_id: string | null;
  is_active: boolean;
  role: string | null;
  permissions: EmployerPermissions | null;
}

// Hook to get current user's permissions
export function useMyPermissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-permissions", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Check if user is founder
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["founder", "admin"])
        .maybeSingle();

      const isFounder = roleData?.role === "founder" || roleData?.role === "admin";

      if (isFounder) {
        return {
          isFounder: true,
          isEmployer: false,
          can_post_jobs: true,
          can_edit_jobs: true,
          can_delete_jobs: true,
          can_view_graphs: true,
          can_import_google_sheet: true,
          can_manage_team: true,
        };
      }

      // Check employer permissions
      const { data: permissions } = await supabase
        .from("employer_permissions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (permissions) {
        return {
          isFounder: false,
          isEmployer: true,
          can_post_jobs: permissions.can_post_jobs,
          can_edit_jobs: permissions.can_edit_jobs,
          can_delete_jobs: permissions.can_delete_jobs,
          can_view_graphs: permissions.can_view_graphs,
          can_import_google_sheet: permissions.can_import_google_sheet,
          can_manage_team: permissions.can_manage_team,
        };
      }

      return {
        isFounder: false,
        isEmployer: false,
        can_post_jobs: false,
        can_edit_jobs: false,
        can_delete_jobs: false,
        can_view_graphs: false,
        can_import_google_sheet: false,
        can_manage_team: false,
      };
    },
    enabled: !!user,
  });
}

// Hook for founder to fetch all users for management
export function useAllUsers() {
  return useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, full_name, employer_id, is_active")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      // Get all employer permissions
      const { data: permissions } = await supabase
        .from("employer_permissions")
        .select("*");

      // Combine data
      const usersWithRoles: UserWithProfile[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        const userPermissions = permissions?.find((p) => p.user_id === profile.user_id);

        return {
          id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          employer_id: profile.employer_id,
          is_active: profile.is_active,
          role: userRole?.role || "user",
          permissions: userPermissions || null,
        };
      });

      return usersWithRoles;
    },
  });
}

// Hook to update user permissions
export function useUpdateUserPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      employerId,
      permissions,
    }: {
      userId: string;
      employerId: string;
      permissions: Partial<Omit<EmployerPermissions, "id" | "employer_id" | "user_id" | "created_at" | "updated_at">>;
    }) => {
      // Check if permissions record exists
      const { data: existing } = await supabase
        .from("employer_permissions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("employer_permissions")
          .update(permissions)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("employer_permissions")
          .insert({
            user_id: userId,
            employer_id: employerId,
            ...permissions,
          });
        if (error) throw error;
      }

      // Also add 'employer' role if any permission is granted
      const hasAnyPermission = Object.values(permissions).some((v) => v === true);
      if (hasAnyPermission) {
        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .eq("role", "employer")
          .maybeSingle();

        if (!existingRole) {
          await supabase.from("user_roles").insert({
            user_id: userId,
            role: "employer",
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast.success("Permissions updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update permissions: " + error.message);
    },
  });
}

// Hook to update user profile (employer_id, is_active)
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: { employer_id?: string | null; is_active?: boolean };
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast.success("User profile updated");
    },
    onError: (error) => {
      toast.error("Failed to update user: " + error.message);
    },
  });
}

// Quick toggle: Make employer admin (enable all main permissions)
export function useMakeEmployerAdmin() {
  const updatePermissions = useUpdateUserPermissions();

  return useMutation({
    mutationFn: async ({ userId, employerId }: { userId: string; employerId: string }) => {
      return updatePermissions.mutateAsync({
        userId,
        employerId,
        permissions: {
          can_post_jobs: true,
          can_edit_jobs: true,
          can_delete_jobs: true,
          can_view_graphs: true,
          can_import_google_sheet: false,
          can_manage_team: false,
        },
      });
    },
  });
}

// Remove all employer permissions
export function useRemoveEmployerPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Delete permissions
      const { error: permError } = await supabase
        .from("employer_permissions")
        .delete()
        .eq("user_id", userId);
      if (permError) throw permError;

      // Remove employer role
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "employer");
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast.success("Employer permissions removed");
    },
    onError: (error) => {
      toast.error("Failed to remove permissions: " + error.message);
    },
  });
}
