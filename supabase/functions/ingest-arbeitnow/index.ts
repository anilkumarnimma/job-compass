// Arbeitnow auto-ingestion edge function.
// Fetches jobs from Arbeitnow's free public API (no key needed),
// reuses JSearch seed keywords (filters client-side per query),
// applies the same filters/skill enrichment used by other sources,
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

function stripHtml(html: string): string {
  return html
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

// ───────────────────────── Arbeitnow API ─────────────────────────
// Public free API, no key required. Returns ~100 most-recent jobs per page.
// Docs: https://documenter.getpostman.com/view/18545278/UVJbJdKh
interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote?: boolean;
  url: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number; // unix seconds
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[];
  links?: { next?: string | null };
}

async function fetchArbeitnow(maxPages = 4): Promise<ArbeitnowJob[]> {
  const all: ArbeitnowJob[] = [];
  let page = 1;
  while (page <= maxPages) {
    const res = await fetch(
      `https://www.arbeitnow.com/api/job-board-api?page=${page}`,
      {
        headers: {
          "User-Agent": "Sociax-Job-Ingest/1.0 (admin@sociax.tech)",
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Arbeitnow API ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as ArbeitnowResponse;
    const jobs = Array.isArray(json.data) ? json.data : [];
    if (!jobs.length) break;
    all.push(...jobs);
    if (!json.links?.next) break;
    page++;
  }
  return all;
}

function matchesQuery(job: ArbeitnowJob, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  // Tokenize the query so multi-word seeds match loosely on title/tags
  const tokens = q.split(/\s+/).filter((t) => t.length > 2);
  if (tokens.length === 0) return true;
  const hay =
    `${job.title || ""} ${(job.tags || []).join(" ")} ${(job.job_types || []).join(" ")}`.toLowerCase();
  // Require every meaningful token to appear in title/tags/types
  return tokens.every((t) => hay.includes(t));
}

function normalizeEmploymentType(types?: string[]): string {
  if (!types?.length) return "Full Time";
  const joined = types.join(",").toLowerCase();
  if (joined.includes("intern")) return "Internship";
  if (joined.includes("part")) return "Part Time";
  if (joined.includes("contract") || joined.includes("freelance")) return "Contract";
  return "Full Time";
}

interface ProcessSeedArgs {
  admin: ReturnType<typeof createClient>;
  seed: { id: string; query: string };
  pool: ArbeitnowJob[];
  stats: {
    total_fetched: number;
    total_imported: number;
    total_skipped: number;
    total_filtered: number;
    duplicates_removed: number;
    errors: { query: string; error: string }[];
    per_query: { query: string; fetched: number; imported: number }[];
  };
  // Track URLs already inserted within the same run to avoid duplicate work
  seenUrls: Set<string>;
}

async function processSeed({ admin, seed, pool, stats, seenUrls }: ProcessSeedArgs): Promise<void> {
  try {
    const matched = pool.filter((j) => matchesQuery(j, seed.query));
    stats.total_fetched += matched.length;
    let importedThisSeed = 0;

    for (const j of matched) {
      if (!j.title || !j.company_name || !j.url) {
        stats.total_skipped++;
        continue;
      }

      if (seenUrls.has(j.url)) {
        stats.total_skipped++;
        continue;
      }

      const description = stripHtml(j.description || "");
      // Rule: only insert when description > 200 chars
      if (description.length <= 200) {
        stats.total_filtered++;
        continue;
      }

      if (isExcludedJob(j.title, description)) {
        stats.total_filtered++;
        continue;
      }

      const location = (j.location || (j.remote ? "Remote" : "")).trim() || "Remote";

      // Dedup #1: exact URL
      const { data: existingByUrl } = await admin
        .from("jobs")
        .select("id")
        .eq("external_apply_link", j.url)
        .maybeSingle();
      if (existingByUrl) {
        stats.total_skipped++;
        seenUrls.add(j.url);
        continue;
      }

      // Dedup #2: title + company + location (case-insensitive)
      const { data: existingByCombo } = await admin
        .from("jobs")
        .select("id")
        .ilike("title", j.title.trim())
        .ilike("company", j.company_name.trim())
        .ilike("location", location)
        .limit(1)
        .maybeSingle();
      if (existingByCombo) {
        stats.total_skipped++;
        seenUrls.add(j.url);
        continue;
      }

      const enrichedSkills = enrichSkills(
        j.title,
        description,
        Array.isArray(j.tags) ? j.tags.slice(0, 12) : []
      );

      const postedDate = j.created_at
        ? new Date(j.created_at * 1000).toISOString()
        : new Date().toISOString();

      const { error: insertErr } = await admin.from("jobs").insert({
        title: j.title.trim(),
        company: j.company_name.trim(),
        company_logo: null,
        location,
        description,
        skills: enrichedSkills,
        external_apply_link: j.url,
        employment_type: normalizeEmploymentType(j.job_types),
        salary_range: null,
        posted_date: postedDate,
        is_published: true,
        is_archived: false,
        is_direct_apply: true,
        description_source: "arbeitnow",
      });

      if (insertErr) {
        const msg = insertErr.message || "";
        const isDuplicate =
          (insertErr as { code?: string }).code === "23505" ||
          /duplicate key|unique constraint/i.test(msg);
        if (isDuplicate) {
          stats.duplicates_removed++;
        } else {
          stats.errors.push({ query: seed.query, error: msg });
        }
        stats.total_skipped++;
      } else {
        stats.total_imported++;
        importedThisSeed++;
        seenUrls.add(j.url);
      }
    }

    stats.per_query.push({
      query: seed.query,
      fetched: matched.length,
      imported: importedThisSeed,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[ingest-arbeitnow] Error on "${seed.query}":`, msg);
    stats.errors.push({ query: seed.query, error: msg });
  }
}

// ───────────────────────── Main handler ─────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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
    .from("arbeitnow_ingest_runs")
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

  // Reuse the existing JSearch seed keywords (read-only)
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
    await admin.from("arbeitnow_ingest_runs").update({
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
    console.log(`[ingest-arbeitnow] Starting ${seeds.length} seeds (run ${runId})`);

    // Fetch the Arbeitnow pool ONCE per run, then filter per seed (API doesn't support search params).
    let pool: ArbeitnowJob[] = [];
    try {
      pool = await fetchArbeitnow(4); // ~400 most-recent jobs
      console.log(`[ingest-arbeitnow] Fetched ${pool.length} jobs from Arbeitnow`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[ingest-arbeitnow] Fetch failed:", msg);
      stats.errors.push({ query: "_fetch", error: msg });
      await admin.from("arbeitnow_ingest_runs").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        errors: stats.errors,
      }).eq("id", runId);
      return;
    }

    const seenUrls = new Set<string>();

    // Process in parallel batches of 4 with 2-second pause between batches
    const BATCH_SIZE = 4;
    const PAUSE_MS = 2000;
    for (let i = 0; i < seeds.length; i += BATCH_SIZE) {
      const batch = seeds.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((seed) =>
          processSeed({
            admin,
            seed: { id: seed.id as string, query: seed.query as string },
            pool,
            stats,
            seenUrls,
          })
        )
      );

      // Persist progress after each batch
      await admin.from("arbeitnow_ingest_runs").update({
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

    // Dedup sweep (add to the in-insert duplicate count)
    try {
      const { data: dedupRes } = await admin.rpc("remove_duplicate_jobs");
      stats.duplicates_removed +=
        (dedupRes as { removed?: number })?.removed || 0;
    } catch (e) {
      console.error("[ingest-arbeitnow] Dedup error:", e);
    }

    await admin.from("arbeitnow_ingest_runs").update({
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

    console.log(`[ingest-arbeitnow] Run ${runId} done: ${stats.total_imported} imported, ${stats.total_filtered} filtered`);
  };

  // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
  EdgeRuntime.waitUntil(backgroundWork());

  return new Response(
    JSON.stringify({
      success: true,
      run_id: runId,
      message: "Arbeitnow ingest started in background — check /admin/import for progress",
      seeds_count: seeds.length,
    }),
    {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
