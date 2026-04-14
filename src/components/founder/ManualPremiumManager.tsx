import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crown, Search, Loader2, Gift, Clock, Infinity, Trash2 } from "lucide-react";

type DurationType = "7_days" | "1_month" | "3_months" | "lifetime";

const DURATION_LABELS: Record<DurationType, string> = {
  "7_days": "7 Days",
  "1_month": "1 Month",
  "3_months": "3 Months",
  "lifetime": "Lifetime",
};

function getExpiresAt(duration: DurationType): string | null {
  if (duration === "lifetime") return null;
  const now = new Date();
  if (duration === "7_days") now.setDate(now.getDate() + 7);
  else if (duration === "1_month") now.setMonth(now.getMonth() + 1);
  else if (duration === "3_months") now.setMonth(now.getMonth() + 3);
  return now.toISOString();
}

export function ManualPremiumManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [emailSearch, setEmailSearch] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<DurationType>("lifetime");
  const [notes, setNotes] = useState("");
  const [granting, setGranting] = useState(false);

  // Fetch active grants
  const { data: grants = [], isLoading: grantsLoading } = useQuery({
    queryKey: ["manual-premium-grants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_premium_grants")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profile emails for each grant
      const userIds = data.map((g: any) => g.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", userIds);

      return data.map((g: any) => ({
        ...g,
        email: profiles?.find((p) => p.user_id === g.user_id)?.email || "Unknown",
        full_name: profiles?.find((p) => p.user_id === g.user_id)?.full_name || null,
      }));
    },
  });

  const handleGrantPremium = async () => {
    if (!emailSearch.trim() || !user) return;

    setGranting(true);
    try {
      // Find user by email
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .eq("email", emailSearch.trim().toLowerCase())
        .maybeSingle();

      if (profileErr) throw profileErr;
      if (!profile) {
        toast.error("No user found with that email");
        setGranting(false);
        return;
      }

      // Check if already has an active grant
      const { data: existing } = await supabase
        .from("manual_premium_grants")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("is_active", true)
        .maybeSingle();

      if (existing) {
        // Deactivate old grant
        await supabase
          .from("manual_premium_grants")
          .update({ is_active: false })
          .eq("id", existing.id);
      }

      // Create new grant
      const expiresAt = getExpiresAt(selectedDuration);
      const { error: grantErr } = await supabase
        .from("manual_premium_grants")
        .insert({
          user_id: profile.user_id,
          granted_by: user.id,
          duration_type: selectedDuration,
          expires_at: expiresAt,
          is_active: true,
          notes: notes.trim() || null,
        });
      if (grantErr) throw grantErr;

      // Enable premium on profile
      const { error: premErr } = await supabase
        .from("profiles")
        .update({ is_premium: true })
        .eq("user_id", profile.user_id);
      if (premErr) throw premErr;

      toast.success(`Premium granted to ${profile.email} (${DURATION_LABELS[selectedDuration]})`);
      setEmailSearch("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["manual-premium-grants"] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    } catch (err: any) {
      toast.error("Failed to grant premium: " + err.message);
    } finally {
      setGranting(false);
    }
  };

  const handleRevokePremium = async (grantId: string, userId: string) => {
    try {
      await supabase
        .from("manual_premium_grants")
        .update({ is_active: false })
        .eq("id", grantId);

      // Check if user has any other active grants or a Stripe subscription
      const { data: otherGrants } = await supabase
        .from("manual_premium_grants")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .neq("id", grantId);

      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("is_subscribed")
        .eq("user_id", userId)
        .maybeSingle();

      // Only revoke premium if no other grants and no active subscription
      if ((!otherGrants || otherGrants.length === 0) && !sub?.is_subscribed) {
        await supabase
          .from("profiles")
          .update({ is_premium: false })
          .eq("user_id", userId);
      }

      toast.success("Premium grant revoked");
      queryClient.invalidateQueries({ queryKey: ["manual-premium-grants"] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    } catch (err: any) {
      toast.error("Failed to revoke: " + err.message);
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Gift className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Manual Premium Grants</h2>
          <p className="text-sm text-muted-foreground">
            Grant premium access to users for promotions, testing, or special cases
          </p>
        </div>
      </div>

      {/* Grant Form */}
      <div className="space-y-4 mb-6 p-4 rounded-lg border border-border bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>User Email</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter exact user email..."
                value={emailSearch}
                onChange={(e) => setEmailSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={selectedDuration} onValueChange={(v) => setSelectedDuration(v as DurationType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7_days">
                  <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> 7 Days</span>
                </SelectItem>
                <SelectItem value="1_month">
                  <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> 1 Month</span>
                </SelectItem>
                <SelectItem value="3_months">
                  <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> 3 Months</span>
                </SelectItem>
                <SelectItem value="lifetime">
                  <span className="flex items-center gap-2"><Infinity className="h-3.5 w-3.5" /> Lifetime</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Notes (optional)</Label>
          <Textarea
            placeholder="e.g. Beta tester, influencer promo, contest winner..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
        <Button
          onClick={handleGrantPremium}
          disabled={!emailSearch.trim() || granting}
          className="w-full sm:w-auto"
        >
          {granting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
          Grant Premium
        </Button>
      </div>

      {/* Active Grants List */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Active Grants ({grants.length})
        </h3>
        {grantsLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : grants.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No active manual premium grants</p>
        ) : (
          <div className="space-y-2">
            {grants.map((grant: any) => (
              <div
                key={grant.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-background"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{grant.email}</span>
                    {grant.full_name && (
                      <span className="text-xs text-muted-foreground">({grant.full_name})</span>
                    )}
                    <Badge variant={grant.duration_type === "lifetime" ? "default" : "secondary"} className="text-xs">
                      {grant.duration_type === "lifetime" ? (
                        <><Infinity className="h-3 w-3 mr-1" /> Lifetime</>
                      ) : (
                        <><Clock className="h-3 w-3 mr-1" /> {DURATION_LABELS[grant.duration_type]}</>
                      )}
                    </Badge>
                    {grant.expires_at && isExpired(grant.expires_at) && (
                      <Badge variant="destructive" className="text-xs">Expired</Badge>
                    )}
                  </div>
                  {grant.notes && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{grant.notes}</p>
                  )}
                  {grant.expires_at && !isExpired(grant.expires_at) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Expires: {new Date(grant.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevokePremium(grant.id, grant.user_id)}
                  className="text-destructive hover:text-destructive ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
