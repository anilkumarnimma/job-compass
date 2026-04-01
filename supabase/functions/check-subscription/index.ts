import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!stripeKey) {
    logStep("ERROR: Missing STRIPE_SECRET_KEY");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    // Retry auth.getUser up to 3 times to handle transient connection resets
    let userData: { user: any } | null = null;
    let lastAuthErr: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        userData = data;
        lastAuthErr = null;
        break;
      }
      lastAuthErr = error?.message || "Unknown auth error";
      logStep(`Auth attempt ${attempt + 1} failed`, { message: lastAuthErr });
      if (attempt < 2) await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
    }
    if (!userData?.user) throw new Error(`Auth error after retries: ${lastAuthErr}`);

    const user = userData!.user;
    if (!user?.email) throw new Error("User not authenticated or no email");
    logStep("User authenticated", { userId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    logStep("Customer lookup", { found: customers.data.length > 0 });

    if (customers.data.length === 0) {
      // No Stripe customer — ensure premium is off
      logStep("No Stripe customer, revoking premium");
      await supabase.from("profiles").update({ is_premium: false }).eq("user_id", user.id);
      await supabase.from("user_subscriptions").upsert({
        user_id: user.id,
        is_subscribed: false,
        stripe_customer_id: null,
        next_renewal_date: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActive = subscriptions.data.length > 0;
    logStep("Subscription check", { hasActive });

    let nextRenewal: string | null = null;
    if (hasActive) {
      const periodEnd = subscriptions.data[0].current_period_end;
      if (periodEnd && !isNaN(periodEnd)) {
        nextRenewal = new Date(periodEnd * 1000).toISOString();
      }
      logStep("Active subscription found", { nextRenewal, periodEnd });
    }

    // Update profiles
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ is_premium: hasActive })
      .eq("user_id", user.id);
    if (profileErr) logStep("ERROR: Profile update failed", { message: profileErr.message });
    else logStep("Profile updated", { is_premium: hasActive });

    // Update user_subscriptions
    const { error: subErr } = await supabase
      .from("user_subscriptions")
      .upsert({
        user_id: user.id,
        is_subscribed: hasActive,
        stripe_customer_id: customerId,
        next_renewal_date: nextRenewal,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    if (subErr) logStep("ERROR: Subscription update failed", { message: subErr.message });
    else logStep("Subscription record updated");

    return new Response(JSON.stringify({
      subscribed: hasActive,
      subscription_end: nextRenewal,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    logStep("ERROR", { message: err.message });
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
