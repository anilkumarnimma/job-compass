import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const errorPage = (msg: string) =>
  `<!DOCTYPE html><html><body style="font-family:Arial;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;">
  <div style="text-align:center;padding:32px;"><h1>❌ ${msg}</h1><p>This unsubscribe link is invalid or expired.</p></div></body></html>`;

function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token || !token.includes(".")) {
      return new Response(errorPage("Invalid Link"), {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    const [userId, sigB64] = token.split(".", 2);
    if (!userId || !sigB64 || !UUID_RE.test(userId)) {
      return new Response(errorPage("Invalid Link"), {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify HMAC signature
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(serviceRoleKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const expected = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(userId)),
    );
    let provided: Uint8Array;
    try {
      provided = b64urlDecode(sigB64);
    } catch {
      return new Response(errorPage("Invalid Link"), {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }
    if (!timingSafeEqual(expected, provided)) {
      return new Response(errorPage("Invalid Link"), {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: existing } = await supabase
      .from("email_notification_preferences")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("email_notification_preferences")
        .update({
          daily_digest_enabled: false,
          unsubscribed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("email_notification_preferences")
        .insert({
          user_id: userId,
          daily_digest_enabled: false,
          unsubscribed_at: new Date().toISOString(),
        });
    }

    return new Response(
      `<!DOCTYPE html><html><body style="font-family:Arial;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;">
      <div style="text-align:center;padding:32px;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:400px;">
        <h1 style="color:#0f172a;">✅ Unsubscribed</h1>
        <p style="color:#64748b;">You've been unsubscribed from Sociax daily job digest emails.</p>
        <p style="color:#94a3b8;font-size:14px;">You can re-enable notifications anytime from your profile settings.</p>
      </div></body></html>`,
      { headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  } catch (err: any) {
    return new Response(errorPage("Error"), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }
});
