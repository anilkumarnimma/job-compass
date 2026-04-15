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
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData?.user) {
      logStep("Auth failed", { message: authErr?.message });
      return new Response(JSON.stringify({ error: "Auth unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData!.user;
    if (!user?.email) throw new Error("User not authenticated or no email");
    logStep("User authenticated", { userId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Strategy 1: Find Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : null;
    logStep("Customer lookup by email", { found: !!customerId, email: user.email });

    // Strategy 2: If not found by email, check user_subscriptions for a stored stripe_customer_id
    if (!customerId) {
      const { data: subRecord } = await supabase
        .from("user_subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (subRecord?.stripe_customer_id) {
        logStep("Found stored stripe_customer_id, verifying with Stripe", {
          storedCustomerId: subRecord.stripe_customer_id,
        });
        try {
          const storedCustomer = await stripe.customers.retrieve(subRecord.stripe_customer_id);
          if (storedCustomer && !storedCustomer.deleted) {
            // Verify the Stripe customer's email matches the authenticated user's email
            const stripeEmail = (storedCustomer as { email?: string }).email?.toLowerCase();
            const userEmail = user.email!.toLowerCase();
            if (stripeEmail === userEmail) {
              customerId = storedCustomer.id;
              logStep("Verified stored customer exists and email matches", { customerId });
            } else {
              logStep("WARNING: Stored customer email mismatch, detaching", {
                stripeEmail,
                userEmail,
                storedCustomerId: subRecord.stripe_customer_id,
              });
              // Clear the mismatched stripe_customer_id
              await supabase.from("user_subscriptions").update({
                stripe_customer_id: null,
                updated_at: new Date().toISOString(),
              }).eq("user_id", user.id);
            }
          }
        } catch (e) {
          logStep("Stored customer not found in Stripe", { error: e.message });
        }
      }
    }

    if (!customerId) {
      // No Stripe customer — check for manual premium grants before revoking
      logStep("No Stripe customer found, checking manual grants");
      const { data: manualGrant } = await supabase
        .from("manual_premium_grants")
        .select("id, duration_type, expires_at")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      const hasValidGrant = manualGrant && (
        !manualGrant.expires_at || new Date(manualGrant.expires_at) > new Date()
      );

      if (hasValidGrant) {
        logStep("Manual premium grant active, preserving premium", { grantId: manualGrant.id });
        await supabase.from("profiles").update({ is_premium: true }).eq("user_id", user.id);
      } else {
        logStep("No manual grant found, revoking premium");
        await supabase.from("profiles").update({ is_premium: false }).eq("user_id", user.id);
      }

      await supabase.from("user_subscriptions").upsert({
        user_id: user.id,
        is_subscribed: false,
        stripe_customer_id: null,
        next_renewal_date: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify({ subscribed: hasValidGrant ? true : false, manual_grant: !!hasValidGrant }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Using customer", { customerId });

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

    // If no active Stripe sub, check manual grants before revoking
    let isPremium = hasActive;
    if (!hasActive) {
      const { data: manualGrant } = await supabase
        .from("manual_premium_grants")
        .select("id, expires_at")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (manualGrant && (!manualGrant.expires_at || new Date(manualGrant.expires_at) > new Date())) {
        isPremium = true;
        logStep("Manual premium grant active, preserving premium", { grantId: manualGrant.id });
      }
    }

    // Update profiles
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ is_premium: isPremium })
      .eq("user_id", user.id);
    if (profileErr) logStep("ERROR: Profile update failed", { message: profileErr.message });
    else logStep("Profile updated", { is_premium: isPremium });

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
