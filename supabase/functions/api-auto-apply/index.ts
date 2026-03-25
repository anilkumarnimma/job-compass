import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const url = new URL(req.url);

    // GET: Extension polls for pending auto-apply data by external URL
    if (req.method === "GET") {
      const externalUrl = url.searchParams.get("url");

      if (externalUrl) {
        // Fetch specific pending item by URL match
        const { data, error } = await supabase
          .from("auto_apply_queue")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .eq("external_url", externalUrl)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          // Mark as consumed
          await supabase
            .from("auto_apply_queue")
            .update({ status: "consumed", consumed_at: new Date().toISOString() })
            .eq("id", data.id);
        }

        return new Response(JSON.stringify({ item: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // List all pending items
      const { data, error } = await supabase
        .from("auto_apply_queue")
        .select("id, job_id, external_url, status, created_at")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return new Response(JSON.stringify({ items: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Web app queues an auto-apply item
    if (req.method === "POST") {
      const { job_id, external_url, tailored_resume, cover_letter, profile_data } = await req.json();

      if (!job_id || !external_url) throw new Error("Missing job_id or external_url");

      const { data, error } = await supabase
        .from("auto_apply_queue")
        .insert({
          user_id: user.id,
          job_id,
          external_url,
          tailored_resume,
          cover_letter,
          profile_data,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
