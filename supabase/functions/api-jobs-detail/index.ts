import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, authorization, apikey, x-client-info",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function inferExperienceLevel(years: string | null): string {
  if (!years) return "Entry Level";
  const v = years.toLowerCase();
  if (/(^|\D)(0|1|2)(\D|$)/.test(v) || v.includes("entry") || v.includes("0-")) return "Entry Level";
  if (/3|associate/.test(v)) return "Associate";
  if (/4|5|mid|senior/.test(v)) return "Mid Senior";
  return "Entry Level";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    // Accept ?id=... or trailing path segment
    let id = url.searchParams.get("id");
    if (!id) {
      const parts = url.pathname.split("/").filter(Boolean);
      id = parts[parts.length - 1] || null;
    }

    if (!id || !UUID_RE.test(id)) {
      return new Response(JSON.stringify({ error: "Invalid or missing job id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: j, error } = await supabase
      .from("jobs")
      .select(
        "id,title,company,company_logo,location,employment_type,experience_years,salary_range,skills,posted_date,external_apply_link,description"
      )
      .eq("id", id)
      .eq("is_published", true)
      .eq("is_archived", false)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    if (!j) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = {
      job: {
        id: j.id,
        title: j.title,
        company: j.company,
        company_logo: j.company_logo,
        location: j.location,
        employment_type: j.employment_type,
        experience_level: inferExperienceLevel(j.experience_years),
        salary: j.salary_range,
        skills: j.skills || [],
        posted_date: j.posted_date ? new Date(j.posted_date).toISOString().split("T")[0] : null,
        apply_url: `https://sociax.tech/jobs/${j.id}`,
        description: j.description || "",
        job_url: `https://sociax.tech/jobs/${j.id}`,
        source: "sociax.tech",
      },
      powered_by: "sociax.tech",
      find_more: "https://sociax.tech",
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("api-jobs-detail error", err);
    return new Response(
      JSON.stringify({ error: "Internal error", message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
