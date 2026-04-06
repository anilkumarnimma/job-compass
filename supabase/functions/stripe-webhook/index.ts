import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const STRIPE_BASE_LINK = "https://buy.stripe.com/eVqaEX9treQ0eOL4dX3AY00";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  logStep("Request received", { method: req.method });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!stripeSecretKey || !webhookSecret) {
    logStep("ERROR: Missing Stripe configuration");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    logStep("Event received", { eventType: event.type, eventId: event.id });

    // ── checkout.session.completed ──
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_details?.email || session.customer_email;

      if (!customerEmail) {
        return new Response(JSON.stringify({ error: "No email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({ is_premium: true })
        .eq("email", customerEmail.toLowerCase())
        .select("user_id");

      if (error || !data || data.length === 0) {
        logStep("ERROR: Profile update failed", { error: error?.message });
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep("Premium upgrade successful", { email: customerEmail });

      const userId = data[0].user_id;
      const stripeCustomerId = (session as any).customer as string | null;
      const nextRenewal = new Date();
      nextRenewal.setMonth(nextRenewal.getMonth() + 1);

      await supabase.from("user_subscriptions").upsert(
        {
          user_id: userId,
          is_subscribed: true,
          stripe_customer_id: stripeCustomerId || null,
          next_renewal_date: nextRenewal.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    }

    // ── checkout.session.expired (user abandoned checkout) ──
    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_details?.email || session.customer_email;

      if (customerEmail) {
        const retryLink = `${STRIPE_BASE_LINK}?prefilled_email=${encodeURIComponent(customerEmail)}`;

        await supabase.from("failed_payments").insert({
          email: customerEmail.toLowerCase(),
          customer_name: session.customer_details?.name || null,
          stripe_event_id: event.id,
          event_type: "checkout_expired",
          amount: session.amount_total ? session.amount_total : null,
          currency: (session.currency || "usd").toUpperCase(),
          failure_reason: "Checkout session expired — user did not complete payment",
          retry_link: retryLink,
          email_sent: false,
        });

        // Send failure email via Resend or SMTP (when email infra is ready)
        await sendFailureEmail(supabase, customerEmail, session.customer_details?.name || null, retryLink);

        logStep("Checkout expired logged", { email: customerEmail });
      }
    }

    // ── invoice.payment_failed (subscription renewal failed) ──
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as any;
      const customerEmail = invoice.customer_email;
      const customerName = invoice.customer_name;

      if (customerEmail) {
        const retryLink = invoice.hosted_invoice_url || `${STRIPE_BASE_LINK}?prefilled_email=${encodeURIComponent(customerEmail)}`;

        await supabase.from("failed_payments").insert({
          email: customerEmail.toLowerCase(),
          customer_name: customerName || null,
          stripe_event_id: event.id,
          event_type: "invoice_payment_failed",
          amount: invoice.amount_due || null,
          currency: (invoice.currency || "usd").toUpperCase(),
          failure_reason: invoice.last_finalization_error?.message || "Payment method declined",
          retry_link: retryLink,
          email_sent: false,
        });

        await sendFailureEmail(supabase, customerEmail, customerName || null, retryLink);

        logStep("Invoice payment failed logged", { email: customerEmail });
      }
    }

    // ── charge.failed ──
    if (event.type === "charge.failed") {
      const charge = event.data.object as any;
      const customerEmail = charge.billing_details?.email || charge.receipt_email;

      if (customerEmail) {
        const retryLink = `${STRIPE_BASE_LINK}?prefilled_email=${encodeURIComponent(customerEmail)}`;

        await supabase.from("failed_payments").insert({
          email: customerEmail.toLowerCase(),
          customer_name: charge.billing_details?.name || null,
          stripe_event_id: event.id,
          event_type: "charge_failed",
          amount: charge.amount ? charge.amount / 100 : null,
          currency: (charge.currency || "usd").toUpperCase(),
          failure_reason: charge.failure_message || charge.outcome?.seller_message || "Charge failed",
          retry_link: retryLink,
          email_sent: false,
        });

        await sendFailureEmail(supabase, customerEmail, charge.billing_details?.name || null, retryLink);

        logStep("Charge failed logged", { email: customerEmail });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    logStep("ERROR", { message: (err as Error).message });
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Send a payment failure notification email */
async function sendFailureEmail(
  supabase: any,
  email: string,
  name: string | null,
  retryLink: string
) {
  try {
    const greeting = name ? `Hi ${name},` : "Hi,";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;padding:32px 24px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
    <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 16px;">Complete your Sociax Premium upgrade</h1>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 12px;">${greeting}</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">Your recent payment attempt was not successful.</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">You can complete your upgrade using the button below:</p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${retryLink}" style="display:inline-block;padding:14px 32px;background:#6366f1;color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none;">Try Payment Again</a>
    </div>
    <p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 8px;">Once the payment is successful, your account will be upgraded to Premium immediately.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
    <p style="font-size:13px;color:#9ca3af;margin:0;">— Team Sociax</p>
  </div>
</body>
</html>`;

    // Use Supabase Edge Function to send email (if email infra available)
    // For now, log the email content and mark as sent attempt
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (lovableApiKey) {
      // Try sending via the transactional email function if available
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "payment-failed",
            recipientEmail: email,
            idempotencyKey: `payment-failed-${email}-${Date.now()}`,
            templateData: { name: name || undefined, retryLink },
          },
        });
      } catch {
        // Transactional email not set up yet — fallback: just log it
        logStep("Transactional email not available, email logged only", { email });
      }
    }

    // Mark email_sent in the latest record for this email
    // We use a raw update on the most recent record
    await supabase
      .from("failed_payments")
      .update({ email_sent: true })
      .eq("email", email.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1);

    logStep("Failure email processed", { email });
  } catch (err) {
    logStep("Email send error (non-fatal)", { message: (err as Error).message });
  }
}
