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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!stripeSecretKey || !webhookSecret) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    logStep("Event received", { eventType: event.type, eventId: event.id });

    // ── Idempotency: skip already-processed events ──
    const { data: existingEvent } = await supabase
      .from("processed_stripe_events")
      .select("id")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      logStep("Event already processed, skipping", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record event as processed
    await supabase.from("processed_stripe_events").insert({
      event_id: event.id,
      event_type: event.type,
    });

    // ══════════════════════════════════════════════
    // checkout.session.completed — SUCCESS
    // ══════════════════════════════════════════════
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_details?.email || session.customer_email;

      if (!customerEmail) {
        return new Response(JSON.stringify({ error: "No email" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const emailLower = customerEmail.toLowerCase();

      // Upgrade to premium
      const { data, error } = await supabase
        .from("profiles")
        .update({ is_premium: true })
        .eq("email", emailLower)
        .select("user_id");

      if (error || !data || data.length === 0) {
        logStep("ERROR: Profile update failed", { error: error?.message });
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep("Premium upgrade successful", { email: emailLower });

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

      // ── Mark any prior failed_payments for this email as resolved ──
      await supabase
        .from("failed_payments")
        .update({ email_sent: true, failure_reason: "RESOLVED — payment completed successfully" })
        .eq("email", emailLower)
        .eq("email_sent", false);

      // ── Mark any checkout recovery emails as completed ──
      await supabase
        .from("checkout_recovery_emails")
        .update({ payment_completed: true, completed_at: new Date().toISOString() })
        .eq("email", emailLower)
        .eq("payment_completed", false);

      logStep("Cleared pending failure/recovery records for user", { email: emailLower });
    }

    // ══════════════════════════════════════════════
    // FAILURE EVENTS
    // ══════════════════════════════════════════════
    if (
      event.type === "checkout.session.expired" ||
      event.type === "invoice.payment_failed" ||
      event.type === "charge.failed"
    ) {
      let customerEmail: string | null = null;
      let customerName: string | null = null;
      let amount: number | null = null;
      let currency = "USD";
      let failureReason = "Payment failed";
      let retryLink = "";

      if (event.type === "checkout.session.expired") {
        const session = event.data.object as Stripe.Checkout.Session;
        customerEmail = session.customer_details?.email || session.customer_email;
        customerName = session.customer_details?.name || null;
        amount = session.amount_total;
        currency = (session.currency || "usd").toUpperCase();
        failureReason = "Checkout session expired — user did not complete payment";
      } else if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object as any;
        customerEmail = invoice.customer_email;
        customerName = invoice.customer_name;
        amount = invoice.amount_due;
        currency = (invoice.currency || "usd").toUpperCase();
        failureReason = invoice.last_finalization_error?.message || "Payment method declined";
        retryLink = invoice.hosted_invoice_url || "";
      } else if (event.type === "charge.failed") {
        const charge = event.data.object as any;
        customerEmail = charge.billing_details?.email || charge.receipt_email;
        customerName = charge.billing_details?.name || null;
        amount = charge.amount ? charge.amount / 100 : null;
        currency = (charge.currency || "usd").toUpperCase();
        failureReason = charge.failure_message || charge.outcome?.seller_message || "Charge failed";
      }

      if (customerEmail) {
        const emailLower = customerEmail.toLowerCase();
        if (!retryLink) {
          retryLink = `${STRIPE_BASE_LINK}?prefilled_email=${encodeURIComponent(emailLower)}`;
        }

        // ── Check if user is already premium (payment succeeded in the meantime) ──
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_premium")
          .eq("email", emailLower)
          .maybeSingle();

        if (profile?.is_premium) {
          logStep("User is already premium, skipping failure email", { email: emailLower });
          // Still log the event but mark as resolved
          await supabase.from("failed_payments").insert({
            email: emailLower,
            customer_name: customerName,
            stripe_event_id: event.id,
            event_type: event.type.replace(".", "_"),
            amount, currency, failure_reason: failureReason,
            retry_link: retryLink,
            email_sent: true, // marked true = no email needed
          });
        } else {
          // ── Check for duplicate: same email + same event_type within last 30 min ──
          const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
          const { data: recentFailures } = await supabase
            .from("failed_payments")
            .select("id")
            .eq("email", emailLower)
            .eq("event_type", event.type.replace(".", "_"))
            .gte("created_at", thirtyMinAgo)
            .limit(1);

          const isDuplicate = recentFailures && recentFailures.length > 0;

          // Insert the record
          await supabase.from("failed_payments").insert({
            email: emailLower,
            customer_name: customerName,
            stripe_event_id: event.id,
            event_type: event.type.replace(".", "_"),
            amount, currency,
            failure_reason: failureReason,
            retry_link: retryLink,
            email_sent: isDuplicate, // if duplicate, skip email
          });

          if (!isDuplicate) {
            await sendFailureEmail(supabase, emailLower, customerName, retryLink, event.id);
            logStep("Failure email sent", { email: emailLower, eventType: event.type });
          } else {
            logStep("Duplicate failure within 30min, skipped email", { email: emailLower });
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    logStep("ERROR", { message: (err as Error).message });
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Send payment failure notification email via Resend */
async function sendFailureEmail(
  supabase: any,
  email: string,
  name: string | null,
  retryLink: string,
  eventId: string
) {
  try {
    const greeting = name ? `Hi ${name},` : "Hi,";

    const htmlContent = `<!DOCTYPE html>
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

    // Send via Resend connector
    const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (lovableApiKey && resendApiKey) {
      const res = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lovableApiKey}`,
          "X-Connection-Api-Key": resendApiKey,
        },
        body: JSON.stringify({
          from: "Sociax <noreply@sociax.tech>",
          to: [email],
          subject: "Complete your Sociax Premium upgrade",
          html: htmlContent,
        }),
      });

      if (res.ok) {
        logStep("Resend email sent successfully", { email });
      } else {
        const errBody = await res.text();
        logStep("Resend email failed", { status: res.status, body: errBody });
      }
    } else {
      logStep("Email keys not available, skipping send", { email });
    }

    // Mark as sent
    await supabase
      .from("failed_payments")
      .update({ email_sent: true })
      .eq("stripe_event_id", eventId);

  } catch (err) {
    logStep("Email send error (non-fatal)", { message: (err as Error).message });
  }
}
