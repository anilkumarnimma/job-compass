import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const log = (step: string, details?: unknown) => {
  console.log(`[DELETE-ACCOUNT] ${step}${details ? " - " + JSON.stringify(details) : ""}`);
};

async function cleanupStripe(email: string | undefined) {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey || !email) {
    log("Skipping Stripe cleanup", { hasKey: !!stripeKey, hasEmail: !!email });
    return;
  }
  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email, limit: 10 });
    log("Stripe customers found", { count: customers.data.length, email });

    for (const customer of customers.data) {
      // Cancel ALL non-terminal subscriptions (active, past_due, unpaid, trialing, paused)
      const statuses: Array<Stripe.Subscription.Status | "all"> = ["all"];
      for (const status of statuses) {
        const subs = await stripe.subscriptions.list({
          customer: customer.id,
          status: status as Stripe.Subscription.Status,
          limit: 100,
        });
        for (const sub of subs.data) {
          if (["canceled", "incomplete_expired"].includes(sub.status)) continue;
          try {
            await stripe.subscriptions.cancel(sub.id, { invoice_now: false, prorate: false });
            log("Cancelled subscription", { id: sub.id, status: sub.status });
          } catch (e) {
            log("Cancel sub failed", { id: sub.id, err: (e as Error).message });
          }
        }
      }

      // Void any open/draft invoices so Stripe stops retrying
      const invoices = await stripe.invoices.list({ customer: customer.id, limit: 100 });
      for (const inv of invoices.data) {
        try {
          if (inv.status === "open") {
            await stripe.invoices.voidInvoice(inv.id);
            log("Voided open invoice", { id: inv.id });
          } else if (inv.status === "draft") {
            await stripe.invoices.del(inv.id);
            log("Deleted draft invoice", { id: inv.id });
          }
        } catch (e) {
          log("Invoice cleanup failed", { id: inv.id, err: (e as Error).message });
        }
      }
    }
  } catch (e) {
    log("Stripe cleanup error (non-fatal)", { err: (e as Error).message });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // FIRST: Cancel Stripe subscriptions + void open invoices BEFORE deleting DB rows
    await cleanupStripe(userEmail);

    const tables = [
      "applications", "saved_jobs", "cover_letters", "user_streaks",
      "user_visits", "user_subscriptions", "user_roles",
      "email_notification_preferences", "feature_feedback",
      "auto_apply_queue", "linkedin_message_usage", "manual_premium_grants",
      "support_tickets", "role_requests", "weekly_digest_log",
      "new_jobs_notification_log", "import_history", "profiles",
    ];
    for (const t of tables) {
      await admin.from(t).delete().eq("user_id", userId);
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
