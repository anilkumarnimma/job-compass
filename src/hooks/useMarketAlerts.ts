import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MarketAlert {
  id: string;
  message: string;
  created_at: string;
  created_by: string | null;
  is_active: boolean;
}

// Fetch the latest active alert for dashboard display
export function useActiveMarketAlert() {
  return useQuery({
    queryKey: ["market-alerts", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_alerts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as MarketAlert | null;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Fetch all alerts for founder management
export function useAllMarketAlerts() {
  return useQuery({
    queryKey: ["market-alerts", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as MarketAlert[];
    },
  });
}

// Publish a new market alert (deactivates previous ones)
export function usePublishMarketAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: string) => {
      // First, deactivate all existing alerts
      const { error: deactivateError } = await supabase
        .from("market_alerts")
        .update({ is_active: false })
        .eq("is_active", true);

      if (deactivateError) throw deactivateError;

      // Insert the new alert
      const { data, error } = await supabase
        .from("market_alerts")
        .insert({
          message,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MarketAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market-alerts"] });
      toast.success("Market alert published!");
    },
    onError: (error: Error) => {
      console.error("Failed to publish alert:", error);
      toast.error("Failed to publish alert: " + error.message);
    },
  });
}

// Deactivate an alert
export function useDeactivateMarketAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("market_alerts")
        .update({ is_active: false })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market-alerts"] });
      toast.success("Alert deactivated");
    },
    onError: (error: Error) => {
      console.error("Failed to deactivate alert:", error);
      toast.error("Failed to deactivate: " + error.message);
    },
  });
}
