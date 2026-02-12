import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "npm:stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  logStep("Request received", { method: req.method });

  if (req.method === "OPTIONS") {
    logStep("CORS preflight handled");
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  logStep("Environment check", {
    hasStripeKey: !!stripeSecretKey,
    hasWebhookSecret: !!webhookSecret,
    hasSupabaseUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
  });

  if (!stripeSecretKey || !webhookSecret) {
    logStep("ERROR: Missing Stripe configuration");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  logStep("Stripe and DB clients initialized");

  try {
    const body = await req.text();
    logStep("Request body read", { bodyLength: body.length });

    const signature = req.headers.get("stripe-signature");
    logStep("Signature header check", { hasSignature: !!signature });

    if (!signature) {
      logStep("ERROR: No stripe-signature header");
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Verifying webhook signature");
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    logStep("Signature verified", { eventType: event.type, eventId: event.id });

    if (event.type === "checkout.session.completed") {
      logStep("Processing checkout.session.completed");
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_details?.email || session.customer_email;

      logStep("Session details", {
        sessionId: session.id,
        hasEmail: !!customerEmail,
        paymentStatus: session.payment_status,
      });

      if (!customerEmail) {
        logStep("ERROR: No customer email in session");
        return new Response(JSON.stringify({ error: "No email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep("Updating profile to premium");
      const { data, error } = await supabase
        .from("profiles")
        .update({ is_premium: true })
        .eq("email", customerEmail.toLowerCase())
        .select("user_id");

      if (error) {
        logStep("ERROR: DB update failed", { errorMessage: error.message, errorCode: error.code });
        return new Response(JSON.stringify({ error: "DB update failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!data || data.length === 0) {
        logStep("ERROR: No profile found for email");
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep("Premium upgrade successful", { matchedProfiles: data.length });

      // Update user_subscriptions table
      const userId = data[0].user_id;
      const stripeCustomerId = (session as any).customer as string | null;
      const subscriptionId = (session as any).subscription as string | null;

      logStep("Updating user_subscriptions", {
        hasUserId: !!userId,
        hasStripeCustomerId: !!stripeCustomerId,
        hasSubscriptionId: !!subscriptionId,
      });

      // Calculate next renewal date (1 month from now for monthly subscription)
      const nextRenewal = new Date();
      nextRenewal.setMonth(nextRenewal.getMonth() + 1);

      const { error: subError } = await supabase
        .from("user_subscriptions")
        .upsert(
          {
            user_id: userId,
            is_subscribed: true,
            stripe_customer_id: stripeCustomerId || null,
            next_renewal_date: nextRenewal.toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (subError) {
        logStep("ERROR: Subscription update failed", { errorMessage: subError.message, errorCode: subError.code });
      } else {
        logStep("Subscription record updated successfully");
      }
    } else {
      logStep("Unhandled event type, acknowledging", { eventType: event.type });
    }

    logStep("Webhook processing complete, returning 200");
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    logStep("ERROR: Webhook processing failed", { errorMessage: err.message });
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
