import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get today's job stats for context
    const today = new Date().toISOString().split("T")[0];
    const { count: todayJobs } = await supabaseAdmin
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true)
      .eq("is_archived", false)
      .gte("posted_date", today);

    // Get top hiring categories
    const { data: topRoles } = await supabaseAdmin.rpc("get_top_hiring_roles", { max_roles: 5 });

    const rolesContext = (topRoles || [])
      .map((r: { role_name: string; percentage: number; job_count: number }) =>
        `${r.role_name}: ${r.percentage}% (${r.job_count} jobs)`)
      .join(", ");

    const prompt = `You are a job market analyst for a tech job platform called Sociax. Generate a single, concise market alert message (1-2 sentences max, under 150 characters ideally) about today's job market trends. 

Context:
- ${todayJobs || 0} new jobs posted today
- Top hiring categories: ${rolesContext || "various tech roles"}
- Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}

Make it insightful, data-driven, and relevant to job seekers. Focus on trends like which roles are hot, industry shifts, or hiring momentum. Don't use generic filler. Be specific. Don't start with "Today" or "This week". Return ONLY the alert text, no quotes.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a concise job market analyst. Return only the alert message text." },
          { role: "user", content: prompt },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI API failed: ${aiResponse.status} - ${errText}`);
    }

    const aiData = await aiResponse.json();
    const alertMessage = aiData.choices?.[0]?.message?.content?.trim();

    if (!alertMessage) throw new Error("Empty AI response");

    // Deactivate existing alerts
    await supabaseAdmin
      .from("market_alerts")
      .update({ is_active: false })
      .eq("is_active", true);

    // Insert new alert
    const { error: insertError } = await supabaseAdmin
      .from("market_alerts")
      .insert({ message: alertMessage, is_active: true });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, message: alertMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Daily market alert error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
