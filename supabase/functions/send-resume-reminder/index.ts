import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name, first_name, resume_url")
      .eq("user_id", user_id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If resume already exists, skip
    if (profile.resume_url) {
      return new Response(JSON.stringify({ message: "Resume already uploaded, skipping" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch 6 unique companies from latest active jobs
    // Prioritize: Greenhouse/Lever > direct career pages > others
    // Exclude aggregators
    const { data: recentJobs } = await supabase
      .from("jobs")
      .select("company, company_logo, title, external_apply_link")
      .eq("is_published", true)
      .eq("is_archived", false)
      .gte("posted_date", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order("posted_date", { ascending: false })
      .limit(100);

    // Deduplicate by company and prioritize quality sources
    const seen = new Set<string>();
    const excludePatterns = ["dice.com", "lensa.com", "lensa.", "ziprecruiter", "indeed.com"];
    const priorityPatterns = ["greenhouse.io", "greenhouse.com", "lever.co"];

    const companies: { company: string; title: string; logo: string | null }[] = [];

    // First pass: priority sources (Greenhouse, Lever)
    for (const job of recentJobs || []) {
      if (companies.length >= 6) break;
      const key = job.company.toLowerCase().trim();
      if (seen.has(key)) continue;
      const link = (job.external_apply_link || "").toLowerCase();
      if (excludePatterns.some(p => link.includes(p))) continue;
      if (priorityPatterns.some(p => link.includes(p))) {
        seen.add(key);
        companies.push({ company: job.company, title: job.title, logo: job.company_logo });
      }
    }

    // Second pass: remaining direct company pages
    for (const job of recentJobs || []) {
      if (companies.length >= 6) break;
      const key = job.company.toLowerCase().trim();
      if (seen.has(key)) continue;
      const link = (job.external_apply_link || "").toLowerCase();
      if (excludePatterns.some(p => link.includes(p))) continue;
      seen.add(key);
      companies.push({ company: job.company, title: job.title, logo: job.company_logo });
    }

    const userName = profile.first_name || profile.full_name?.split(" ")[0] || "there";
    const siteUrl = Deno.env.get("SITE_URL") || "https://jobpulse99.lovable.app";

    // Build company cards HTML
    let companiesHtml = "";
    for (const c of companies) {
      companiesHtml += `
        <div style="display:inline-block;width:48%;margin-bottom:8px;vertical-align:top;">
          <div style="padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
            <p style="margin:0;font-weight:600;font-size:14px;color:#0f172a;">${c.company}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#64748b;">${c.title}</p>
          </div>
        </div>`;
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'DM Sans',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:white;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="margin:0;font-size:22px;color:#0f172a;font-weight:700;">Welcome to Sociax! 🎉</h1>
    </div>
    
    <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 16px;">
      Hey ${userName},
    </p>
    <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 20px;">
      Upload your resume to unlock <strong>personalized job matches</strong> — we'll analyze your skills and experience to show you the most relevant opportunities.
    </p>

    ${companies.length > 0 ? `
    <div style="margin-bottom:24px;">
      <p style="font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;">🏢 Companies hiring right now on Sociax</p>
      <div style="font-size:0;">
        ${companiesHtml}
      </div>
    </div>
    ` : ""}

    <div style="text-align:center;margin:28px 0 16px;">
      <a href="${siteUrl}/profile" style="display:inline-block;padding:14px 36px;background:#2563eb;color:white;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
        Upload Resume →
      </a>
    </div>

    <p style="font-size:13px;color:#94a3b8;text-align:center;margin:0;">
      Once uploaded, you'll get matched jobs delivered to your inbox.
    </p>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">
    Sociax · Find Your Dream Job
  </p>
</div>
</body>
</html>`;

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sociax Jobs <support@sociax.tech>",
        to: [profile.email],
        subject: `🚀 ${userName}, upload your resume to unlock personalized job matches`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Resume reminder sent" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
