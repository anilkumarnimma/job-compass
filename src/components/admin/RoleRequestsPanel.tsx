import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, MessageSquarePlus, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function RoleRequestsPanel() {
  const queryClient = useQueryClient();
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

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

  const userIds = [...new Set(requests.map((r: any) => r.user_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["role-request-profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, email, full_name, first_name")
        .in("user_id", userIds);
      return data || [];
    },
  });

  const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

  const handleSendAck = async (req: any) => {
    const profile = profileMap.get(req.user_id);
    if (!profile?.email) {
      toast.error("No email found for this user");
      return;
    }

    setSendingIds((prev) => new Set(prev).add(req.id));
    try {
      const { data, error } = await supabase.functions.invoke("role-request-ack", {
        body: {
          requestId: req.id,
          recipientEmail: profile.email,
          recipientName: profile.first_name || profile.full_name || null,
          requestedRole: req.requested_role,
          location: req.location || null,
        },
      });

      if (error) throw error;
      setSentIds((prev) => new Set(prev).add(req.id));
      toast.success(`Acknowledgment sent to ${profile.email}`);
    } catch (err: any) {
      toast.error("Failed to send email: " + (err.message || "Unknown error"));
    } finally {
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(req.id);
        return next;
      });
    }
  };

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
            const isSending = sendingIds.has(req.id);
            const isSent = sentIds.has(req.id);

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
                <Button
                  size="sm"
                  variant={isSent ? "outline" : "default"}
                  disabled={isSending || isSent}
                  onClick={() => handleSendAck(req)}
                  className="shrink-0 text-xs h-8 rounded-full"
                >
                  {isSending ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : isSent ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <Send className="h-3 w-3 mr-1" />
                  )}
                  {isSent ? "Sent" : "Acknowledge"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
