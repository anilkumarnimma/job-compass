import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");

  if (!lovableApiKey || !resendApiKey) {
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { requestId, recipientEmail, recipientName, requestedRole, location, customMessage } = await req.json();

    if (!requestId || !recipientEmail || !requestedRole) {
      return new Response(JSON.stringify({ error: "requestId, recipientEmail, and requestedRole are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";
    const locationLine = location ? `<p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 12px;">📍 <strong>Location preference:</strong> ${location}</p>` : "";
    const customLine = customMessage ? `<p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">${customMessage}</p>` : "";

    const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;padding:32px 24px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
    <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 16px;">We received your role request! 🎯</h1>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 12px;">${greeting}</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 12px;">Thank you for requesting the role <strong>"${requestedRole}"</strong> on Sociax.</p>
    ${locationLine}
    ${customLine || '<p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">Our team is actively sourcing roles matching your request. We\'ll have matching jobs live within <strong>24 hours</strong>!</p>'}
    <div style="text-align:center;margin:0 0 24px;">
      <a href="https://sociax.tech/dashboard" style="display:inline-block;padding:14px 32px;background:#6366f1;color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none;">Browse Jobs</a>
    </div>
    <p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 8px;">Keep an eye on your dashboard — new matches will appear as they're added.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
    <p style="font-size:13px;color:#9ca3af;margin:0;">— Team Sociax</p>
  </div>
</body>
</html>`;

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": resendApiKey,
      },
      body: JSON.stringify({
        from: "Sociax <noreply@sociax.tech>",
        to: [recipientEmail.toLowerCase()],
        subject: `Your role request "${requestedRole}" has been received — Sociax`,
        html: htmlContent,
      }),
    });

    const resBody = await res.json();

    if (!res.ok) {
      console.error("[ROLE-REQUEST-ACK] Resend failed:", resBody);
      return new Response(JSON.stringify({ error: "Email send failed", details: resBody }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, messageId: resBody.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ROLE-REQUEST-ACK] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
