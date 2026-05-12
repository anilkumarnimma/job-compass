import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const log: any = { processed: 0, cancelled: 0, already: 0, errors: [] };

  // Process up to 25 subs per call to avoid timeout
  const list: any = await stripe.subscriptions.list({ status: "active", limit: 25 });
  for (const sub of list.data) {
    log.processed++;
    if (sub.cancel_at_period_end) {
      log.already++;
      continue;
    }
    try {
      await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
      log.cancelled++;
    } catch (e: any) {
      log.errors.push({ sub: sub.id, error: e.message });
    }
  }
  log.has_more = list.has_more;

  return new Response(JSON.stringify(log, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
