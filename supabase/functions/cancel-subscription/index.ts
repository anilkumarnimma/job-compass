import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

function respond(ok: boolean, payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!stripeKey) {
    return respond(false, { error: "Server misconfigured" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData?.user) throw new Error("Auth failed");

    const user = userData.user;
    if (!user?.email) throw new Error("No email");
    logStep("User authenticated", { userId: user.id });

    const { action } = await req.json().catch(() => ({ action: "cancel" }));

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Strategy 1: Find Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : null;
    logStep("Customer lookup by email", { email: user.email, found: !!customerId });

    // Strategy 2: If not found by email, check user_subscriptions for a stored stripe_customer_id
    if (!customerId) {
      const { data: subRecord } = await supabase
        .from("user_subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (subRecord?.stripe_customer_id) {
        logStep("Found stored stripe_customer_id", { storedCustomerId: subRecord.stripe_customer_id });
        try {
          const storedCustomer = await stripe.customers.retrieve(subRecord.stripe_customer_id);
          if (storedCustomer && !storedCustomer.deleted) {
            customerId = storedCustomer.id;
            logStep("Verified stored customer exists in Stripe", { customerId });
          }
        } catch (e) {
          logStep("Stored customer not found in Stripe", { error: (e as Error).message });
        }
      }
    }

    if (!customerId) {
      return respond(false, { error: "No subscription found" });
    }
    logStep("Using customer", { customerId });
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    logStep("Active subscriptions", { count: subscriptions.data.length });

    if (subscriptions.data.length === 0) {
      // Check for cancel_at_period_end subscriptions (for resume)
      const allSubs = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
      if (allSubs.data.length > 0 && action === "resume") {
        const sub = allSubs.data[0];
        if (sub.cancel_at_period_end) {
          const updated = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false });
          logStep("Subscription resumed", { subscriptionId: sub.id });
          return respond(true, {
            action: "resumed",
            subscription_end: new Date(updated.current_period_end * 1000).toISOString(),
          });
        }
      }
      return respond(false, { error: "No active subscription" });
    }

    const subscription = subscriptions.data[0];

    if (action === "cancel") {
      logStep("Attempting cancel", { subscriptionId: subscription.id });
      try {
        const updated = await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
        logStep("Subscription set to cancel at period end", { subscriptionId: subscription.id });

        return respond(true, {
          success: true,
          action: "cancelled",
          subscription_end: new Date(updated.current_period_end * 1000).toISOString(),
        });
      } catch (stripeErr: any) {
        logStep("Stripe update failed", { message: stripeErr?.message, type: stripeErr?.type, code: stripeErr?.code });
        return respond(false, { error: "Unable to cancel subscription. Please try again or contact support." });
      }
    }

    if (action === "resume") {
      if (subscription.cancel_at_period_end) {
        const updated = await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: false });
        logStep("Subscription resumed", { subscriptionId: subscription.id });
        return respond(true, {
          success: true,
          action: "resumed",
          subscription_end: new Date(updated.current_period_end * 1000).toISOString(),
        });
      }
      return respond(false, { error: "Subscription is not pending cancellation" });
    }

    return respond(false, { error: "Invalid action" });
  } catch (err) {
    logStep("ERROR", { message: (err as Error).message, stack: (err as Error).stack?.slice(0, 300) });
    return respond(false, { error: "An unexpected error occurred" });
  }
});
