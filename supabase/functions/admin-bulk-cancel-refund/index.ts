import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Shared-secret auth (one-shot admin tool)
  const authHeader = req.headers.get("Authorization") || "";
  if (authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const log: any = { refunds: [], cancels: [], errors: [] };

  // 1) Refund latest succeeded payment for these customers
  const refundCustomers = [
    { name: "sachi", id: "cus_UJn5TdPZzOf2Sx" },
    { name: "chandra", id: "cus_UJLh6F9QpsagUn" },
    { name: "jyothi", id: "cus_UJAuhQS7uHnGrE" },
  ];
  for (const c of refundCustomers) {
    try {
      const pis = await stripe.paymentIntents.list({ customer: c.id, limit: 5 });
      const latest = pis.data.find((p) => p.status === "succeeded");
      if (!latest) {
        log.refunds.push({ customer: c.name, status: "no succeeded payment" });
        continue;
      }
      const refund = await stripe.refunds.create({
        payment_intent: latest.id,
        reason: "requested_by_customer",
      });
      log.refunds.push({ customer: c.name, payment_intent: latest.id, refund_id: refund.id, amount: refund.amount });
    } catch (e: any) {
      log.errors.push({ scope: "refund", customer: c.name, error: e.message });
    }
  }

  // 2) Cancel ALL active subscriptions at period end (stop auto-renewal)
  let hasMore = true;
  let startingAfter: string | undefined = undefined;
  while (hasMore) {
    const list: any = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      starting_after: startingAfter,
    });
    for (const sub of list.data) {
      if (sub.cancel_at_period_end) {
        log.cancels.push({ id: sub.id, status: "already_pending_cancel" });
        continue;
      }
      try {
        await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
        log.cancels.push({ id: sub.id, status: "cancelled_at_period_end" });
      } catch (e: any) {
        log.errors.push({ scope: "cancel", sub: sub.id, error: e.message });
      }
    }
    hasMore = list.has_more;
    if (hasMore && list.data.length > 0) startingAfter = list.data[list.data.length - 1].id;
  }

  return new Response(JSON.stringify(log, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
