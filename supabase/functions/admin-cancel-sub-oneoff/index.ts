import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { subscription_id } = await req.json();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!.trim(), {
      apiVersion: "2025-08-27.basil",
    });
    const updated = await stripe.subscriptions.update(subscription_id, {
      cancel_at_period_end: true,
    });
    return new Response(
      JSON.stringify({
        ok: true,
        id: updated.id,
        cancel_at_period_end: updated.cancel_at_period_end,
        current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
        status: updated.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
