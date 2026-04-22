// Cron trigger: invoked daily by pg_cron (e.g. 02:30 UTC).
// Runs the ATS ingest across all active companies.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  console.log("[CRON-ATS-INGEST] Starting daily ATS ingest");

  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/ats-ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ trigger_type: "scheduled" }),
    });
    const body = await r.text();
    console.log(`[CRON-ATS-INGEST] ats-ingest responded ${r.status}`);
    return new Response(JSON.stringify({ ok: r.ok, status: r.status, body: body.slice(0, 500) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[CRON-ATS-INGEST] error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
