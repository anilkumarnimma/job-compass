// ATS Ingest
// Pulls jobs from Greenhouse, Lever, and Ashby public job board APIs for every
// ats_companies row with status='active'. Inserts into the jobs table using the
// same dedup, location-filter, and skills-enrichment patterns as JSearch/Muse/Arbeitnow.
// Admin-only or service-role triggered.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ───────────── Skills enrichment (mirrored from ingest-jsearch) ─────────────
const COMMON_SKILLS: Record<string, string> = {
  js: "JavaScript", javascript: "JavaScript", typescript: "TypeScript", ts: "TypeScript",
  react: "React", reactjs: "React", "react.js": "React",
  angular: "Angular", vue: "Vue.js", vuejs: "Vue.js",
  node: "Node.js", nodejs: "Node.js", "node.js": "Node.js",
  python: "Python", java: "Java", "c#": "C#", csharp: "C#", "c++": "C++", cpp: "C++",
  go: "Go", golang: "Go", rust: "Rust", ruby: "Ruby", php: "PHP", swift: "Swift",
  kotlin: "Kotlin", scala: "Scala", r: "R",
  html: "HTML", css: "CSS", sass: "Sass", scss: "Sass",
  sql: "SQL", mysql: "MySQL", postgresql: "PostgreSQL", postgres: "PostgreSQL",
  mongodb: "MongoDB", redis: "Redis", elasticsearch: "Elasticsearch",
  aws: "AWS", azure: "Azure", gcp: "GCP", "google cloud": "GCP",
  docker: "Docker", kubernetes: "Kubernetes", k8s: "Kubernetes",
  terraform: "Terraform", jenkins: "Jenkins",
  git: "Git", github: "GitHub", "ci/cd": "CI/CD",
  rest: "REST APIs", graphql: "GraphQL", kafka: "Kafka", linux: "Linux",
  agile: "Agile", scrum: "Scrum", jira: "Jira", figma: "Figma",
  "machine learning": "Machine Learning", ml: "Machine Learning",
  tensorflow: "TensorFlow", pytorch: "PyTorch", pandas: "Pandas", numpy: "NumPy",
  tableau: "Tableau", "power bi": "Power BI", salesforce: "Salesforce",
  "next.js": "Next.js", nextjs: "Next.js", django: "Django", flask: "Flask",
  excel: "Excel", etl: "ETL", devops: "DevOps",
};

function enrichSkills(text: string): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const lower = (text || "").toLowerCase();
  const patterns = Object.keys(COMMON_SKILLS).sort((a, b) => b.length - a.length);
  for (const p of patterns) {
    const re = new RegExp(
      `(?:^|[\\s,;/|()•\\-])${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[\\s,;/|()•\\-])`,
      "i"
    );
    if (re.test(lower)) {
      const skill = COMMON_SKILLS[p];
      if (!seen.has(skill.toLowerCase())) {
        result.push(skill);
        seen.add(skill.toLowerCase());
      }
    }
    if (result.length >= 12) break;
  }
  return result;
}

// ───────────── Entry-level filter ─────────────
const SENIOR_TOKENS = [
  "senior", "sr.", "staff", "principal", "lead ", "director", "vp ", "vice president",
  "head of", "manager", "architect", "executive", "chief ",
];
function isSeniorRole(title: string): boolean {
  const t = (title || "").toLowerCase();
  return SENIOR_TOKENS.some((tok) => t.includes(tok));
}

// ───────────── USA-only location filter (mirrored from src/lib/usaLocationFilter.ts) ─────────────
const US_STATES_ABBR = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
]);
const US_STATE_NAMES = [
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware","florida","georgia",
  "hawaii","idaho","illinois","indiana","iowa","kansas","kentucky","louisiana","maine","maryland",
  "massachusetts","michigan","minnesota","mississippi","missouri","montana","nebraska","nevada",
  "new hampshire","new jersey","new mexico","new york","north carolina","north dakota","ohio","oklahoma","oregon",
  "pennsylvania","rhode island","south carolina","south dakota","tennessee","texas","utah","vermont","virginia",
  "washington","west virginia","wisconsin","wyoming","district of columbia",
];
const NON_US_INDICATORS = [
  "canada","mexico","india","uk","united kingdom","england","scotland","wales","ireland","germany","france","spain",
  "italy","netherlands","sweden","norway","denmark","finland","switzerland","austria","belgium","portugal","poland",
  "czech","romania","hungary","greece","turkey","israel","japan","china","korea","singapore","australia",
  "new zealand","brazil","argentina","colombia","chile","philippines","indonesia","malaysia","thailand","vietnam",
  "taiwan","hong kong","dubai","uae","saudi","qatar","egypt","nigeria","kenya","south africa","ukraine","russia",
  "slovenia","croatia","serbia","estonia","latvia","lithuania","luxembourg","iceland","bulgaria","slovakia",
  "british columbia","alberta","ontario","quebec","manitoba","saskatchewan",
  "europe","asia","africa","latin america","apac","emea","global",
  // common ISO/abbrev tails
  "ie","de","fr","es","it","nl","se","no","dk","fi","ch","at","be","pt","pl","jp","cn","kr","sg","au","nz","br","mx","ca",
];
function isUSALocation(location: string | null | undefined): boolean {
  if (!location || !location.trim()) return false;
  const loc = location.trim();
  const lower = loc.toLowerCase();
  for (const indicator of NON_US_INDICATORS) {
    const re = new RegExp(`(^|[^a-z])${indicator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");
    if (re.test(lower)) {
      if (indicator === "mexico" && /new mexico/.test(lower)) continue;
      if (indicator === "england" && /new england/.test(lower)) continue;
      if (lower.includes(", us") || lower.includes("usa") || lower.includes("united states")) {
        if (lower.includes(";") || lower.includes("|")) return false;
        continue;
      }
      return false;
    }
  }
  if (/\bUS\b/.test(loc) || /\bUSA\b/i.test(loc) || /united states/i.test(loc)) return true;
  const stateAbbrMatch = loc.match(/,\s*([A-Z]{2})\s*(?:,\s*US)?(?:\s*\(.*\))?\s*$/);
  if (stateAbbrMatch && US_STATES_ABBR.has(stateAbbrMatch[1])) return true;
  const midStateMatch = loc.match(/,\s*([A-Z]{2})\s*,/);
  if (midStateMatch && US_STATES_ABBR.has(midStateMatch[1])) return true;
  for (const s of US_STATE_NAMES) if (lower.includes(s)) return true;
  if (/remote/i.test(loc)) {
    if (/\bUS\b/.test(loc) || /\bUSA\b/i.test(loc) || /united states/i.test(loc)) return true;
    return false;
  }
  return false;
}

// ───────────── Per-platform fetchers ─────────────
interface NormalizedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  apply_link: string;
  posted_date: string;
  employment_type: string;
}

function stripHtml(html: string): string {
  return (html || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchGreenhouse(slug: string, companyName: string): Promise<NormalizedJob[]> {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
    { signal: AbortSignal.timeout(20000) }
  );
  if (!res.ok) throw new Error(`Greenhouse ${slug}: HTTP ${res.status}`);
  const json = await res.json();
  const jobs = Array.isArray(json?.jobs) ? json.jobs : [];
  return jobs.map((j: any) => ({
    title: j.title || "",
    company: companyName,
    location: j.location?.name || "Remote",
    description: stripHtml(j.content || ""),
    apply_link: j.absolute_url || "",
    posted_date: j.updated_at || new Date().toISOString(),
    employment_type: "Full Time",
  })).filter((j: NormalizedJob) => j.title && j.apply_link);
}

async function fetchLever(slug: string, companyName: string): Promise<NormalizedJob[]> {
  const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Lever ${slug}: HTTP ${res.status}`);
  const arr = await res.json();
  const jobs = Array.isArray(arr) ? arr : [];
  return jobs.map((j: any) => {
    const desc =
      stripHtml(j.descriptionPlain || j.description || "") +
      (j.lists?.length
        ? "\n\n" + j.lists.map((l: any) => `${l.text || ""}\n${stripHtml(l.content || "")}`).join("\n\n")
        : "");
    const commitment = j.categories?.commitment || "";
    const empType = /intern/i.test(commitment) ? "Internship" : "Full Time";
    return {
      title: j.text || "",
      company: companyName,
      location: j.categories?.location || "Remote",
      description: desc,
      apply_link: j.hostedUrl || j.applyUrl || "",
      posted_date: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString(),
      employment_type: empType,
    };
  }).filter((j: NormalizedJob) => j.title && j.apply_link);
}

async function fetchAshby(slug: string, companyName: string): Promise<NormalizedJob[]> {
  const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=false`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Ashby ${slug}: HTTP ${res.status}`);
  const json = await res.json();
  const jobs = Array.isArray(json?.jobs) ? json.jobs : [];
  return jobs.map((j: any) => ({
    title: j.title || "",
    company: companyName,
    location: j.location || (j.isRemote ? "Remote" : ""),
    description: stripHtml(j.descriptionHtml || j.descriptionPlain || ""),
    apply_link: j.jobUrl || j.applyUrl || "",
    posted_date: j.publishedAt || new Date().toISOString(),
    employment_type: /intern/i.test(j.employmentType || "") ? "Internship" : "Full Time",
  })).filter((j: NormalizedJob) => j.title && j.apply_link);
}

async function fetchPlatform(platform: string, slug: string, companyName: string): Promise<NormalizedJob[]> {
  if (platform === "greenhouse") return fetchGreenhouse(slug, companyName);
  if (platform === "lever") return fetchLever(slug, companyName);
  if (platform === "ashby") return fetchAshby(slug, companyName);
  return [];
}

// ───────────── Main handler ─────────────
// Chunked, self-invoking design:
//  - Each invocation processes BATCH_SIZE companies in parallel, then self-invokes
//    with the next offset until all companies are done.
//  - This keeps every invocation well under the edge function wall-time limit.
const BATCH_SIZE = 6;            // companies processed in parallel per invocation
const FETCH_CONCURRENCY = 6;     // parallel platform fetches inside a batch

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  let triggeredBy: string | null = null;
  let triggerType = "manual";
  let isServiceCall = false;

  if (token === SERVICE_KEY) {
    triggerType = "scheduled";
    isServiceCall = true;
  } else {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdminRes } = await userClient.rpc("is_admin");
    if (!isAdminRes) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    triggeredBy = userData.user.id;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Body parameters:
  //   company_id  – run a single company only
  //   run_id      – continue an in-progress run (chunked self-invocation)
  //   offset      – starting offset within the company list (chunked)
  let bodyCompanyId: string | null = null;
  let continuationRunId: string | null = null;
  let chunkOffset = 0;
  try {
    const body = await req.json();
    bodyCompanyId = body?.company_id || null;
    continuationRunId = body?.run_id || null;
    chunkOffset = Number(body?.offset) || 0;
    if (body?.trigger_type) triggerType = body.trigger_type;
  } catch { /* no body */ }

  // Either reuse an existing run row (continuation) or insert a new one (first call)
  let runId: string | null = continuationRunId;
  if (!runId) {
    const { data: runRow } = await admin
      .from("ats_ingest_runs")
      .insert({ trigger_type: triggerType, triggered_by: triggeredBy, status: "running" })
      .select("id")
      .single();
    runId = runRow?.id ?? null;
  }
  const startedAt = Date.now();

  const stats = {
    companies_processed: 0,
    total_fetched: 0,
    total_imported: 0,
    total_skipped: 0,
    total_filtered: 0,
    duplicates_removed: 0,
    errors: [] as Array<{ slug: string; platform: string; error: string }>,
    per_company: [] as Array<{ slug: string; platform: string; fetched: number; imported: number }>,
  };

  // Probe both active AND inactive companies. If an inactive one returns jobs,
  // we'll auto-reactivate it below. Skip only 'pending' (never validated) and
  // 'failed' (permanently broken slugs).
  let companyQuery = admin
    .from("ats_companies")
    .select("id, slug, company_name, ats_platform, status")
    .in("status", ["active", "inactive"]);
  if (bodyCompanyId) companyQuery = admin.from("ats_companies").select("id, slug, company_name, ats_platform, status").eq("id", bodyCompanyId);

  const { data: companies, error: cErr } = await companyQuery;

  if (cErr || !companies?.length) {
    await admin.from("ats_ingest_runs").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      errors: [{ slug: "n/a", platform: "n/a", error: cErr?.message || "No active companies" }],
    }).eq("id", runId);
    return new Response(
      JSON.stringify({ error: "No active companies. Run discovery first." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const backgroundWork = async () => {
    console.log(`[ats-ingest] Starting ingest for ${companies.length} active companies (run ${runId})`);

    for (const company of companies) {
      try {
        const jobs = await fetchPlatform(company.ats_platform, company.slug, company.company_name);
        stats.total_fetched += jobs.length;
        let importedThisCompany = 0;

        // Pre-filter (cheap, in-memory)
        const candidates: NormalizedJob[] = [];
        for (const j of jobs) {
          if (!j.title || !j.apply_link) { stats.total_skipped++; continue; }
          if (isSeniorRole(j.title)) { stats.total_filtered++; continue; }
          if (!isUSALocation(j.location)) { stats.total_filtered++; continue; }
          candidates.push(j);
        }

        // Batch dedup: single query per company instead of one query per job
        const links = candidates.map((c) => c.apply_link);
        const existingLinks = new Set<string>();
        if (links.length > 0) {
          // Chunk to avoid PostgREST URL limits (~1000 items per .in())
          const CHUNK = 500;
          for (let i = 0; i < links.length; i += CHUNK) {
            const slice = links.slice(i, i + CHUNK);
            const { data: existingRows } = await admin
              .from("jobs")
              .select("external_apply_link")
              .in("external_apply_link", slice);
            for (const row of existingRows || []) {
              if (row.external_apply_link) existingLinks.add(row.external_apply_link);
            }
          }
        }

        // Build batch insert payload (skip duplicates)
        const toInsert: any[] = [];
        for (const j of candidates) {
          if (existingLinks.has(j.apply_link)) {
            stats.total_skipped++;
            continue;
          }
          // Avoid duplicates within the same batch
          if (toInsert.some((row) => row.external_apply_link === j.apply_link)) {
            stats.total_skipped++;
            continue;
          }
          const skills = enrichSkills(`${j.title} ${j.description}`);
          toInsert.push({
            title: j.title.trim(),
            company: j.company.trim(),
            location: j.location || "Remote",
            description: j.description || "",
            skills,
            external_apply_link: j.apply_link,
            employment_type: j.employment_type,
            posted_date: j.posted_date,
            is_published: true,
            is_archived: false,
            is_direct_apply: true,
          });
        }

        // Batch insert in chunks of 100
        if (toInsert.length > 0) {
          const INSERT_CHUNK = 100;
          for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
            const slice = toInsert.slice(i, i + INSERT_CHUNK);
            const { error: insertErr, count } = await admin
              .from("jobs")
              .insert(slice, { count: "exact" });
            if (insertErr) {
              stats.errors.push({ slug: company.slug, platform: company.ats_platform, error: insertErr.message });
              stats.total_skipped += slice.length;
            } else {
              const inserted = count ?? slice.length;
              stats.total_imported += inserted;
              importedThisCompany += inserted;
            }
          }
        }

        stats.per_company.push({
          slug: company.slug,
          platform: company.ats_platform,
          fetched: jobs.length,
          imported: importedThisCompany,
        });

        // Auto-reactivate inactive companies that returned jobs.
        // Auto-deactivate active companies that have been silent (0 jobs).
        const newStatus =
          jobs.length > 0
            ? "active"
            : (company.status === "active" ? "inactive" : company.status);

        await admin
          .from("ats_companies")
          .update({
            last_checked: new Date().toISOString(),
            jobs_found_last_run: jobs.length,
            status: newStatus,
          })
          .eq("id", company.id);

        stats.companies_processed++;

        // Live progress
        await admin.from("ats_ingest_runs").update({
          companies_processed: stats.companies_processed,
          total_fetched: stats.total_fetched,
          total_imported: stats.total_imported,
          total_skipped: stats.total_skipped,
          total_filtered: stats.total_filtered,
          details: { per_company: stats.per_company.slice(-50) },
        }).eq("id", runId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[ats-ingest] Error on ${company.ats_platform}/${company.slug}:`, msg);
        stats.errors.push({ slug: company.slug, platform: company.ats_platform, error: msg });
      }
    }

    // Dedup sweep
    try {
      const { data: dedupRes } = await admin.rpc("remove_duplicate_jobs");
      stats.duplicates_removed = (dedupRes as { removed?: number })?.removed || 0;
    } catch (e) {
      console.error("[ats-ingest] Dedup error:", e);
    }

    await admin.from("ats_ingest_runs").update({
      status: stats.errors.length > 0 ? "completed_with_errors" : "completed",
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      companies_processed: stats.companies_processed,
      total_fetched: stats.total_fetched,
      total_imported: stats.total_imported,
      total_skipped: stats.total_skipped,
      total_filtered: stats.total_filtered,
      duplicates_removed: stats.duplicates_removed,
      errors: stats.errors.slice(0, 50),
      details: { per_company: stats.per_company.slice(-100) },
    }).eq("id", runId);

    console.log(`[ats-ingest] Run ${runId} done: ${stats.total_imported} imported across ${stats.companies_processed} companies`);

    // Notify opted-in users about new jobs (fire-and-forget)
    if (stats.total_imported > 0) {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-new-jobs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ count: stats.total_imported, source: "ats" }),
        });
      } catch (e) {
        console.error("[ats-ingest] notify-new-jobs error:", e);
      }
    }
  };

  // @ts-ignore EdgeRuntime
  EdgeRuntime.waitUntil(backgroundWork());

  return new Response(
    JSON.stringify({
      success: true,
      run_id: runId,
      message: "ATS ingest started in background",
      companies_count: companies.length,
    }),
    {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
