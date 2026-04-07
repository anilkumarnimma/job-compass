import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, MessageSquarePlus } from "lucide-react";

export function RoleRequestsPanel() {
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["role-requests-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_requests" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch user emails for display
  const userIds = [...new Set(requests.map((r: any) => r.user_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["role-request-profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", userIds);
      return data || [];
    },
  });

  const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquarePlus className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-semibold text-foreground">Role Requests</h2>
        <span className="text-xs text-muted-foreground ml-auto">{requests.length} total</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No role requests yet.</p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
          {requests.map((req: any) => {
            const profile = profileMap.get(req.user_id);
            return (
              <div
                key={req.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {req.requested_role}
                  </p>
                  {req.location && (
                    <p className="text-xs text-muted-foreground mt-0.5">📍 {req.location}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {profile?.email || "Unknown user"} • {format(new Date(req.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
