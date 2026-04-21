import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, authorization, apikey, x-client-info",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function mapExperienceLevel(input: string | null): string[] | null {
  if (!input) return null;
  const v = input.toLowerCase().trim();
  if (v === "entry level" || v === "entry") return ["0", "1", "0-1", "0-2", "1-2", "entry"];
  if (v === "associate") return ["1-3", "2-3", "2", "3", "associate"];
  if (v === "mid senior" || v === "mid-senior" || v === "mid senior level")
    return ["3-5", "4-5", "5", "mid", "senior"];
  return null;
}

function normalizeEmploymentType(input: string | null): string {
  const v = (input || "fulltime").toLowerCase().replace(/[-_\s]/g, "");
  if (v === "fulltime" || v === "full") return "Full Time";
  if (v === "parttime" || v === "part") return "Part Time";
  if (v === "contract") return "Contract";
  if (v === "internship" || v === "intern") return "Internship";
  return "Full Time";
}

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
    const keyword = url.searchParams.get("keyword")?.trim() || null;
    const location = url.searchParams.get("location")?.trim() || null;
    const experienceLevel = url.searchParams.get("experience_level");
    const employmentTypeRaw = url.searchParams.get("employment_type");
    const limitRaw = parseInt(url.searchParams.get("limit") || "10", 10);
    const limit = Math.min(Math.max(isNaN(limitRaw) ? 10 : limitRaw, 1), 20);

    const employmentType = normalizeEmploymentType(employmentTypeRaw);
    const expTerms = mapExperienceLevel(experienceLevel);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    let query = supabase
      .from("jobs")
      .select(
        "id,title,company,company_logo,location,employment_type,experience_years,salary_range,skills,posted_date,external_apply_link,description",
        { count: "exact" }
      )
      .eq("is_published", true)
      .eq("is_archived", false)
      .eq("is_direct_apply", true)
      .is("deleted_at", null)
      .eq("employment_type", employmentType);

    if (keyword) {
      const safe = keyword.replace(/[%,]/g, " ");
      query = query.or(
        `title.ilike.%${safe}%,company.ilike.%${safe}%,description.ilike.%${safe}%`
      );
    }

    if (location) {
      const safe = location.replace(/[%,]/g, " ");
      query = query.ilike("location", `%${safe}%`);
    }

    if (expTerms && expTerms.length > 0) {
      const ors = expTerms.map((t) => `experience_years.ilike.%${t}%`).join(",");
      query = query.or(ors);
    }

    // Fetch more than limit so we can post-filter by description length
    const { data, error, count } = await query
      .order("posted_date", { ascending: false })
      .limit(limit * 3);

    if (error) throw error;

    const filtered = (data || [])
      .filter((j) => (j.description || "").length > 200)
      .slice(0, limit)
      .map((j) => ({
        title: j.title,
        company: j.company,
        company_logo: j.company_logo,
        location: j.location,
        employment_type: j.employment_type,
        experience_level: inferExperienceLevel(j.experience_years),
        salary: j.salary_range,
        skills: j.skills || [],
        posted_date: j.posted_date ? new Date(j.posted_date).toISOString().split("T")[0] : null,
        apply_url: j.external_apply_link,
        description_preview: (j.description || "").slice(0, 300),
        job_url: `https://sociax.tech/?job=${j.id}`,
        source: "sociax.tech",
      }));

    const body = {
      jobs: filtered,
      total_results: count ?? filtered.length,
      query: {
        keyword,
        location,
        experience_level: experienceLevel || null,
        employment_type: employmentType,
      },
      powered_by: "sociax.tech",
      find_more: "https://sociax.tech",
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("api-jobs-search error", err);
    return new Response(
      JSON.stringify({ error: "Internal error", message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
