// One-off sweep: cancel non-active orphan subs + void open invoices.
// Specifically targets past_due, unpaid, incomplete subscriptions which are
// the ones still attempting card charges after account deletion.
// Also handles Jyothi (cus_UJAuhQS7uHnGrE) explicitly.

import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const result: any = {
    jyothi: { sub_cancelled: [], invoices_voided: [], errors: [] },
    sweep: { processed: 0, cancelled: 0, invoices_voided: 0, errors: [] as any[] },
  };

  // ---------- 1. Jyothi specific ----------
  const JYOTHI_CUSTOMER = "cus_UJAuhQS7uHnGrE";
  const JYOTHI_INVOICE = "in_1TgfeUHSS3JXsMDksvTaAU5v";

  try {
    // Cancel all her non-terminal subs
    for (const status of ["active", "past_due", "unpaid", "trialing", "incomplete"] as const) {
      const subs = await stripe.subscriptions.list({ customer: JYOTHI_CUSTOMER, status, limit: 100 });
      for (const s of subs.data) {
        try {
          await stripe.subscriptions.cancel(s.id, { invoice_now: false, prorate: false });
          result.jyothi.sub_cancelled.push({ id: s.id, status });
        } catch (e: any) {
          result.jyothi.errors.push({ sub: s.id, err: e.message });
        }
      }
    }
    // Void her open invoice explicitly + any other open ones
    const invs = await stripe.invoices.list({ customer: JYOTHI_CUSTOMER, limit: 100 });
    for (const inv of invs.data) {
      if (inv.status === "open") {
        try {
          await stripe.invoices.voidInvoice(inv.id);
          result.jyothi.invoices_voided.push(inv.id);
        } catch (e: any) {
          result.jyothi.errors.push({ invoice: inv.id, err: e.message });
        }
      } else if (inv.status === "draft") {
        try { await stripe.invoices.del(inv.id); result.jyothi.invoices_voided.push(inv.id + " (draft deleted)"); } catch {}
      }
    }
    // Belt-and-suspenders: void the known invoice id
    try {
      const target = await stripe.invoices.retrieve(JYOTHI_INVOICE);
      if (target.status === "open") {
        await stripe.invoices.voidInvoice(JYOTHI_INVOICE);
        result.jyothi.invoices_voided.push(JYOTHI_INVOICE + " (forced)");
      }
    } catch (e: any) {
      result.jyothi.errors.push({ invoice: JYOTHI_INVOICE, err: e.message });
    }
  } catch (e: any) {
    result.jyothi.errors.push({ section: "jyothi", err: e.message });
  }

  // ---------- 2. Sweep past_due / unpaid / incomplete ----------
  for (const status of ["past_due", "unpaid", "incomplete"] as const) {
    let startingAfter: string | undefined = undefined;
    for (let page = 0; page < 20; page++) {
      const list: any = await stripe.subscriptions.list({
        status,
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const sub of list.data) {
        result.sweep.processed++;
        try {
          await stripe.subscriptions.cancel(sub.id, { invoice_now: false, prorate: false });
          result.sweep.cancelled++;
          // Void open invoices for this customer
          const invs = await stripe.invoices.list({ customer: sub.customer as string, status: "open", limit: 100 });
          for (const inv of invs.data) {
            try {
              await stripe.invoices.voidInvoice(inv.id);
              result.sweep.invoices_voided++;
            } catch (e: any) {
              result.sweep.errors.push({ invoice: inv.id, err: e.message });
            }
          }
        } catch (e: any) {
          result.sweep.errors.push({ sub: sub.id, err: e.message });
        }
      }
      if (!list.has_more || list.data.length === 0) break;
      startingAfter = list.data[list.data.length - 1].id;
    }
  }

  return new Response(JSON.stringify(result, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
