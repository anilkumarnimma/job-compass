// Cron trigger: invoked by pg_cron daily.
// Uses the function's service role key to authenticate against ingest-jsearch.
// No external auth required (called only from same Supabase project via pg_net).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  console.log("[CRON-TRIGGER-INGEST] Invoking ingest-jsearch with service role");

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ingest-jsearch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ trigger_type: "scheduled" }),
    });

    const body = await res.text();
    console.log(`[CRON-TRIGGER-INGEST] ingest-jsearch responded ${res.status}`);

    return new Response(
      JSON.stringify({ ok: res.ok, status: res.status, body: body.slice(0, 500) }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[CRON-TRIGGER-INGEST] Error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
