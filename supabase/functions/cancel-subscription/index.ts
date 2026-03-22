import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "npm:stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or no email");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find the Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No billing account found.");
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Find active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found.");
    }

    const subscription = subscriptions.data[0];
    logStep("Found active subscription", { subscriptionId: subscription.id });

    // Cancel the subscription at period end (user keeps access until billing period ends)
    const canceled = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    logStep("Subscription set to cancel at period end", {
      subscriptionId: canceled.id,
      cancelAt: canceled.cancel_at,
      currentPeriodEnd: canceled.current_period_end,
    });

    // Update the local database
    const periodEnd = new Date(canceled.current_period_end * 1000).toISOString();
    await supabase
      .from("user_subscriptions")
      .update({
        is_subscribed: false,
        next_renewal_date: periodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    logStep("Updated local subscription record");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscription will be canceled at the end of the current billing period.",
        cancel_at: periodEnd,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = (err as Error).message;
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
