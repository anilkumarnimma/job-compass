import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResumeIntelligence {
  primaryRole: string;
  topSkills: string[];
  secondarySkills?: string[];
  primaryStack?: string[];
  jobTitlesToTarget?: string[];
  experienceLevel?: string;
  locationPreference?: string[];
}

function normalizeSkill(s: string): string {
  return s.toLowerCase().trim().replace(/[.\-_]/g, "");
}

function scoreJob(
  job: any,
  intelligence: ResumeIntelligence,
  userSkillsNorm: Set<string>
): number {
  let score = 0;
  const jobSkills = (job.skills || []).map(normalizeSkill);
  const titleLower = job.title.toLowerCase();
  const primaryRoleLower = intelligence.primaryRole.toLowerCase();

  // Skill matching (0-45)
  let matched = 0;
  for (const js of jobSkills) {
    for (const us of userSkillsNorm) {
      if (js.includes(us) || us.includes(js)) { matched++; break; }
    }
  }
  const skillRatio = jobSkills.length > 0 ? matched / jobSkills.length : 0.5;
  score += skillRatio * 45;

  // Title matching (0-35)
  if (titleLower.includes(primaryRoleLower) || primaryRoleLower.includes(titleLower)) {
    score += 35;
  } else if (intelligence.jobTitlesToTarget?.some(t => titleLower.includes(t.toLowerCase()) || t.toLowerCase().includes(titleLower))) {
    score += 28;
  } else {
    const roleWords = new Set(primaryRoleLower.split(/[\s,/\-]+/).filter(w => w.length > 2));
    const titleWords = titleLower.split(/[\s,/\-]+/).filter(w => w.length > 2);
    let overlap = 0;
    for (const w of titleWords) { if (roleWords.has(w)) overlap++; }
    score += Math.min((overlap / Math.max(titleWords.length, 1)) * 20, 20);
  }

  // Location bonus (0-10)
  if (intelligence.locationPreference?.length) {
    const jobLoc = job.location.toLowerCase();
    if (intelligence.locationPreference.some((l: string) => jobLoc.includes(l.toLowerCase()))) {
      score += 10;
    }
  }

  // Recency bonus (0-10)
  const daysSincePosted = (Date.now() - new Date(job.posted_date).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSincePosted <= 1) score += 10;
  else if (daysSincePosted <= 3) score += 7;
  else if (daysSincePosted <= 7) score += 4;

  return Math.min(Math.round(score), 100);
}

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

    // Get profile with resume intelligence
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name, first_name, skills, resume_intelligence, location, current_title")
      .eq("user_id", user_id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const intelligence = profile.resume_intelligence as ResumeIntelligence | null;
    if (!intelligence && (!profile.skills || profile.skills.length === 0)) {
      return new Response(JSON.stringify({ message: "No intelligence or skills to match" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build user skills set
    const allUserSkills = [
      ...(intelligence?.topSkills || []),
      ...(intelligence?.secondarySkills || []),
      ...(intelligence?.primaryStack || []),
      ...(profile.skills || []),
    ];
    const userSkillsNorm = new Set(allUserSkills.map(normalizeSkill));

    // Fetch recent active jobs
    const excludePatterns = ["dice.com", "lensa.com", "lensa."];
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, title, company, location, description, skills, employment_type, salary_range, external_apply_link, posted_date")
      .eq("is_published", true)
      .eq("is_archived", false)
      .order("posted_date", { ascending: false })
      .limit(200);

    if (jobsError || !jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: "No jobs available" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter out aggregator jobs
    const filteredJobs = jobs.filter(j => {
      const link = (j.external_apply_link || "").toLowerCase();
      return !excludePatterns.some(p => link.includes(p));
    });

    // Score and rank jobs
    const mockIntel: ResumeIntelligence = intelligence || {
      primaryRole: profile.current_title || "",
      topSkills: profile.skills || [],
      jobTitlesToTarget: [],
    };

    const scored = filteredJobs
      .map(job => ({ ...job, score: scoreJob(job, mockIntel, userSkillsNorm) }))
      .filter(j => j.score > 20)
      .sort((a, b) => b.score - a.score);

    // Prioritize Greenhouse/Lever sources
    const priorityPatterns = ["greenhouse.io", "greenhouse.com", "lever.co"];
    const topJobs = scored.slice(0, 30);
    topJobs.sort((a, b) => {
      const aP = priorityPatterns.some(p => a.external_apply_link.toLowerCase().includes(p)) ? 0 : 1;
      const bP = priorityPatterns.some(p => b.external_apply_link.toLowerCase().includes(p)) ? 0 : 1;
      if (aP !== bP) return aP - bP;
      return b.score - a.score;
    });

    const finalJobs = topJobs.slice(0, 10);

    if (finalJobs.length === 0) {
      return new Response(JSON.stringify({ message: "No matching jobs found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userName = profile.first_name || profile.full_name?.split(" ")[0] || "there";
    const siteUrl = Deno.env.get("SITE_URL") || "https://jobpulse99.lovable.app";
    const primaryRole = intelligence?.primaryRole || profile.current_title || "your profile";

    // Build job cards HTML
    let jobsHtml = "";
    for (const job of finalJobs) {
      const salaryTag = job.salary_range ? `<span style="color:#059669;font-size:12px;"> · ${job.salary_range}</span>` : "";
      jobsHtml += `
      <div style="padding:14px 16px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:10px;background:white;">
        <a href="${job.external_apply_link}" style="font-weight:600;color:#2563eb;text-decoration:none;font-size:15px;line-height:1.3;">${job.title}</a>
        <p style="margin:4px 0 0;color:#475569;font-size:13px;">
          ${job.company} · ${job.location} · ${job.employment_type || "Full Time"}${salaryTag}
        </p>
        <div style="margin-top:8px;">
          <a href="${job.external_apply_link}" style="display:inline-block;padding:6px 16px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;font-size:12px;font-weight:600;">Apply →</a>
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
    <div style="text-align:center;margin-bottom:20px;">
      <h1 style="margin:0;font-size:22px;color:#0f172a;font-weight:700;">🎯 Your Personalized Job Matches</h1>
    </div>
    
    <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 8px;">
      Hey ${userName},
    </p>
    <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 20px;">
      Based on your resume as a <strong>${primaryRole}</strong>, here are your top job matches on Sociax:
    </p>

    <div style="margin-bottom:20px;">
      ${jobsHtml}
    </div>

    <div style="text-align:center;margin:24px 0 16px;">
      <a href="${siteUrl}/recommendations" style="display:inline-block;padding:14px 36px;background:#0f172a;color:white;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
        View All Matches on Sociax →
      </a>
    </div>

    <p style="font-size:13px;color:#94a3b8;text-align:center;margin:0;">
      We'll keep finding new matches as jobs are posted.
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
        subject: `🎯 ${userName}, ${finalJobs.length} jobs matched your ${primaryRole} profile`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Recommendations sent",
      matched_jobs: finalJobs.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
