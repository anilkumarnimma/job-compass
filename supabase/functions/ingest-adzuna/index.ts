// Adzuna auto-ingestion edge function
// Fetches jobs from Adzuna's US search API using ADZUNA_APP_ID + ADZUNA_APP_KEY,
// reuses JSearch seed keywords, applies the same filters/skill enrichment,
// dedupes by external link + (title+company+location), and inserts into jobs table.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ───────────────────────── Skills enrichment ─────────────────────────
const COMMON_SKILLS: Record<string, string> = {
  js: "JavaScript", javascript: "JavaScript", typescript: "TypeScript", ts: "TypeScript",
  react: "React", reactjs: "React", "react.js": "React",
  angular: "Angular", vue: "Vue.js", vuejs: "Vue.js",
  node: "Node.js", nodejs: "Node.js", "node.js": "Node.js",
  python: "Python", java: "Java", "c#": "C#", csharp: "C#", "c++": "C++", cpp: "C++",
  go: "Go", golang: "Go", rust: "Rust", ruby: "Ruby", php: "PHP", swift: "Swift",
  kotlin: "Kotlin", scala: "Scala", r: "R",
  html: "HTML", html5: "HTML", css: "CSS", css3: "CSS", sass: "Sass", scss: "Sass",
  sql: "SQL", mysql: "MySQL", postgresql: "PostgreSQL", postgres: "PostgreSQL",
  mongodb: "MongoDB", redis: "Redis", elasticsearch: "Elasticsearch",
  aws: "AWS", azure: "Azure", gcp: "GCP", "google cloud": "GCP",
  docker: "Docker", kubernetes: "Kubernetes", k8s: "Kubernetes",
  terraform: "Terraform", jenkins: "Jenkins",
  git: "Git", github: "GitHub", "ci/cd": "CI/CD", cicd: "CI/CD",
  rest: "REST APIs", restful: "REST APIs", graphql: "GraphQL",
  kafka: "Kafka", linux: "Linux", bash: "Bash",
  agile: "Agile", scrum: "Scrum", jira: "Jira",
  figma: "Figma", "machine learning": "Machine Learning", ml: "Machine Learning",
  "deep learning": "Deep Learning", nlp: "NLP",
  tensorflow: "TensorFlow", pytorch: "PyTorch", pandas: "Pandas", numpy: "NumPy",
  spark: "Apache Spark", tableau: "Tableau", "power bi": "Power BI",
  salesforce: "Salesforce", "next.js": "Next.js", nextjs: "Next.js",
  express: "Express.js", django: "Django", flask: "Flask", spring: "Spring",
  ".net": ".NET", redux: "Redux", tailwind: "Tailwind CSS",
  jest: "Jest", cypress: "Cypress", selenium: "Selenium",
  firebase: "Firebase", snowflake: "Snowflake", databricks: "Databricks",
  airflow: "Airflow", microservices: "Microservices", serverless: "Serverless",
  excel: "Excel", etl: "ETL", devops: "DevOps", sre: "SRE",
  communication: "Communication", leadership: "Leadership",
};

const TITLE_SKILL_MAP: Record<string, string[]> = {
  "software engineer": ["JavaScript", "Python", "SQL", "Git", "REST APIs", "Agile", "Docker", "AWS"],
  frontend: ["JavaScript", "React", "CSS", "HTML", "TypeScript", "Git", "REST APIs", "Figma"],
  backend: ["Python", "Node.js", "SQL", "REST APIs", "Docker", "AWS", "Git", "PostgreSQL"],
  "full stack": ["JavaScript", "React", "Node.js", "SQL", "Git", "REST APIs", "Docker", "TypeScript"],
  "data engineer": ["Python", "SQL", "Apache Spark", "AWS", "ETL", "Airflow", "Docker", "PostgreSQL"],
  "data scientist": ["Python", "Machine Learning", "SQL", "Pandas", "TensorFlow", "NumPy", "Deep Learning", "R"],
  "data analyst": ["SQL", "Python", "Excel", "Tableau", "Power BI", "Pandas", "Communication", "Agile"],
  devops: ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform", "Linux", "Git", "Jenkins"],
  "cloud engineer": ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Linux", "CI/CD"],
  "machine learning": ["Python", "TensorFlow", "PyTorch", "Machine Learning", "Deep Learning", "SQL", "NumPy", "Pandas"],
  "qa engineer": ["Selenium", "Jest", "Cypress", "SQL", "Git", "Agile", "REST APIs", "JavaScript"],
  "product manager": ["Agile", "Scrum", "Jira", "Communication", "Leadership", "SQL", "Excel", "Tableau"],
  "business analyst": ["SQL", "Excel", "Tableau", "Power BI", "Communication", "Jira", "Agile", "Scrum"],
  "ux designer": ["Figma", "CSS", "HTML", "JavaScript", "Communication", "Agile", "Jira", "Sketch"],
  marketing: ["Excel", "Tableau", "SQL", "Communication", "Agile", "Salesforce", "Power BI", "Jira"],
  sales: ["Salesforce", "Communication", "Excel", "Leadership", "Agile", "SQL", "Tableau", "Jira"],
};

function enrichSkills(title: string, description: string, existing: string[]): string[] {
  const result = [...existing];
  const seen = new Set(existing.map((s) => s.toLowerCase()));
  const text = (description || "").toLowerCase();

  const patterns = Object.keys(COMMON_SKILLS).sort((a, b) => b.length - a.length);
  for (const p of patterns) {
    const re = new RegExp(
      `(?:^|[\\s,;/|()•\\-])${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[\\s,;/|()•\\-])`,
      "i"
    );
    if (re.test(text)) {
      const skill = COMMON_SKILLS[p];
      if (!seen.has(skill.toLowerCase())) {
        result.push(skill);
        seen.add(skill.toLowerCase());
      }
    }
  }

  if (result.length < 8) {
    const t = title.toLowerCase();
    for (const [key, skills] of Object.entries(TITLE_SKILL_MAP)) {
      if (t.includes(key)) {
        for (const s of skills) {
          if (!seen.has(s.toLowerCase())) {
            result.push(s);
            seen.add(s.toLowerCase());
          }
          if (result.length >= 8) break;
        }
        break;
      }
    }
  }
  return result;
}

// ───────────────────────── Filters ─────────────────────────
const EXCLUDED_TITLE_KEYWORDS = [
  "tutor", "tutoring", "teacher", "teaching assistant", "instructor", "lecturer",
  "trainer", "academic coach", "supervisor", "cleaning", "janitor", "janitorial",
  "custodian", "housekeeper", "housekeeping", "technician", "helper",
];

const SENIOR_TITLE_PATTERNS = [
  /\bsenior\b/i, /\bsr\.?\s/i, /\blead\s+(engineer|developer|designer|scientist|analyst)/i,
  /\bmanager\b/i, /\bhead\s+of\b/i, /\barchitect\b/i,
  /\bstaff\s+(engineer|developer|designer|scientist)/i,
  /\bprincipal\b/i, /\bdirector\b/i, /\bvp\b/i, /\bchief\b/i,
  /\b(cto|cfo|coo|ceo)\b/i, /\bfellow\b/i,
];

function isExcludedJob(title: string, description: string): boolean {
  const t = title.toLowerCase();
  if (EXCLUDED_TITLE_KEYWORDS.some((kw) => t.includes(kw))) return true;
  if (SENIOR_TITLE_PATTERNS.some((p) => p.test(title))) return true;
  const yrMatch = (description || "").match(/\b([4-9]|[1-9]\d)\+?\s*[-–]?\s*(?:\d+\s*)?(?:years?|yrs?)/i);
  if (yrMatch) {
    const num = parseInt(yrMatch[0].match(/\d+/)?.[0] || "0", 10);
    if (num > 5) return true;
  }
  return false;
}

// ───────────────────────── Adzuna API ─────────────────────────
interface AdzunaJob {
  id: string | number;
  title?: string;
  description?: string;
  redirect_url?: string;
  created?: string;
  salary_min?: number;
  salary_max?: number;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  category?: { label?: string; tag?: string };
  contract_time?: string;
}

async function fetchAdzuna(
  appId: string,
  appKey: string,
  query: string
): Promise<AdzunaJob[]> {
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: query,
    results_per_page: "50",
    full_time: "1",
    what_exclude:
      "senior,director,executive,lead,principal,manager,head,vp,vice president",
    "content-type": "application/json",
  });

  const res = await fetch(
    `https://api.adzuna.com/v1/api/jobs/us/search/1?${params}`,
    {
      headers: { Accept: "application/json" },
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Adzuna API ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return (json.results || []) as AdzunaJob[];
}

function formatSalary(j: AdzunaJob): string | null {
  if (!j.salary_min && !j.salary_max) return null;
  const min = j.salary_min ? Math.round(j.salary_min).toLocaleString() : null;
  const max = j.salary_max ? Math.round(j.salary_max).toLocaleString() : null;
  if (min && max) return `USD ${min} - ${max}/yr`;
  if (min) return `USD ${min}+/yr`;
  if (max) return `Up to USD ${max}/yr`;
  return null;
}

interface ProcessSeedArgs {
  admin: ReturnType<typeof createClient>;
  appId: string;
  appKey: string;
  seed: { id: string; query: string };
  stats: {
    total_fetched: number;
    total_imported: number;
    total_skipped: number;
    total_filtered: number;
    duplicates_removed: number;
    errors: { query: string; error: string }[];
    per_query: { query: string; fetched: number; imported: number }[];
  };
}

async function processSeed({ admin, appId, appKey, seed, stats }: ProcessSeedArgs): Promise<void> {
  try {
    const jobs = await fetchAdzuna(appId, appKey, seed.query);
    stats.total_fetched += jobs.length;
    let importedThisSeed = 0;

    for (const j of jobs) {
      const title = (j.title || "").trim();
      const company = j.company?.display_name?.trim() || "";
      const url = j.redirect_url;
      if (!title || !company || !url) {
        stats.total_skipped++;
        continue;
      }

      const description = (j.description || "").trim();
      if (description.length <= 200) {
        stats.total_filtered++;
        continue;
      }

      if (isExcludedJob(title, description)) {
        stats.total_filtered++;
        continue;
      }

      const location = (j.location?.display_name || "United States").trim();

      // Dedup #1: exact URL
      const { data: existingByUrl } = await admin
        .from("jobs")
        .select("id")
        .eq("external_apply_link", url)
        .maybeSingle();
      if (existingByUrl) {
        stats.total_skipped++;
        continue;
      }

      // Dedup #2: title + company + location
      const { data: existingByCombo } = await admin
        .from("jobs")
        .select("id")
        .ilike("title", title)
        .ilike("company", company)
        .ilike("location", location)
        .limit(1)
        .maybeSingle();
      if (existingByCombo) {
        stats.total_skipped++;
        continue;
      }

      const enrichedSkills = enrichSkills(title, description, []);

      const postedDate = j.created
        ? new Date(j.created).toISOString()
        : new Date().toISOString();

      const { error: insertErr } = await admin.from("jobs").insert({
        title,
        company,
        company_logo: null,
        location,
        description,
        skills: enrichedSkills,
        external_apply_link: url,
        employment_type: "Full Time",
        salary_range: formatSalary(j),
        posted_date: postedDate,
        is_published: true,
        is_archived: false,
        is_direct_apply: true,
        description_source: "adzuna",
      });

      if (insertErr) {
        stats.errors.push({ query: seed.query, error: insertErr.message });
        stats.total_skipped++;
      } else {
        stats.total_imported++;
        importedThisSeed++;
      }
    }

    stats.per_query.push({
      query: seed.query,
      fetched: jobs.length,
      imported: importedThisSeed,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[ingest-adzuna] Error on "${seed.query}":`, msg);
    stats.errors.push({ query: seed.query, error: msg });
  }
}

// ───────────────────────── Main handler ─────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const ADZUNA_APP_ID = Deno.env.get("ADZUNA_APP_ID");
  const ADZUNA_APP_KEY = Deno.env.get("ADZUNA_APP_KEY");

  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    return new Response(
      JSON.stringify({ error: "ADZUNA_APP_ID / ADZUNA_APP_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  let triggeredBy: string | null = null;
  let triggerType = "manual";

  if (token === SERVICE_KEY) {
    triggerType = "scheduled";
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

  let bodySeedId: string | null = null;
  try {
    const body = await req.json();
    bodySeedId = body?.seed_id || null;
  } catch { /* no body */ }

  const { data: runRow } = await admin
    .from("adzuna_ingest_runs")
    .insert({ triggered_by: triggeredBy, trigger_type: triggerType, status: "running" })
    .select("id")
    .single();
  const runId = runRow?.id;

  const startedAt = Date.now();
  const stats = {
    total_fetched: 0,
    total_imported: 0,
    total_skipped: 0,
    total_filtered: 0,
    duplicates_removed: 0,
    errors: [] as { query: string; error: string }[],
    per_query: [] as { query: string; fetched: number; imported: number }[],
  };

  // Reuse JSearch seed keywords (read-only)
  let seedQuery = admin
    .from("jsearch_query_seeds")
    .select("id, query")
    .eq("is_active", true)
    .order("sort_order");
  if (bodySeedId) {
    seedQuery = admin.from("jsearch_query_seeds").select("id, query").eq("id", bodySeedId);
  }

  const { data: seeds, error: seedErr } = await seedQuery;
  if (seedErr || !seeds?.length) {
    await admin.from("adzuna_ingest_runs").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      errors: [{ query: "seeds", error: seedErr?.message || "No active seeds" }],
    }).eq("id", runId);
    return new Response(
      JSON.stringify({ error: "No active seeds configured" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const backgroundWork = async () => {
    console.log(`[ingest-adzuna] Starting ${seeds.length} seeds (run ${runId})`);

    const BATCH_SIZE = 4;
    const PAUSE_MS = 2000;
    for (let i = 0; i < seeds.length; i += BATCH_SIZE) {
      const batch = seeds.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((seed) =>
          processSeed({
            admin,
            appId: ADZUNA_APP_ID,
            appKey: ADZUNA_APP_KEY,
            seed: { id: seed.id as string, query: seed.query as string },
            stats,
          })
        )
      );

      await admin.from("adzuna_ingest_runs").update({
        total_fetched: stats.total_fetched,
        total_imported: stats.total_imported,
        total_skipped: stats.total_skipped,
        total_filtered: stats.total_filtered,
        details: { per_query: stats.per_query },
      }).eq("id", runId);

      if (i + BATCH_SIZE < seeds.length) {
        await new Promise((r) => setTimeout(r, PAUSE_MS));
      }
    }

    try {
      const { data: dedupRes } = await admin.rpc("remove_duplicate_jobs");
      stats.duplicates_removed =
        (dedupRes as { removed?: number })?.removed || 0;
    } catch (e) {
      console.error("[ingest-adzuna] Dedup error:", e);
    }

    await admin.from("adzuna_ingest_runs").update({
      status: stats.errors.length > 0 ? "completed_with_errors" : "completed",
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      total_fetched: stats.total_fetched,
      total_imported: stats.total_imported,
      total_skipped: stats.total_skipped,
      total_filtered: stats.total_filtered,
      duplicates_removed: stats.duplicates_removed,
      errors: stats.errors,
      details: { per_query: stats.per_query },
    }).eq("id", runId);

    console.log(`[ingest-adzuna] Run ${runId} done: ${stats.total_imported} imported, ${stats.total_filtered} filtered`);
  };

  // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
  EdgeRuntime.waitUntil(backgroundWork());

  return new Response(
    JSON.stringify({
      success: true,
      run_id: runId,
      message: "Adzuna ingest started in background — check /admin/import for progress",
      seeds_count: seeds.length,
    }),
    {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
