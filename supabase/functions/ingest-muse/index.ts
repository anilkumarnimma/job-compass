// The Muse auto-ingestion edge function
// Fetches jobs from The Muse API, applies USA + entry-level filters,
// enriches skills, deduplicates, and inserts into the jobs table.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ───────────────────────── Skills enrichment (same as JSearch) ─────────────────────────
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
  designer: ["Figma", "CSS", "HTML", "Communication", "Agile", "Jira", "Sketch", "Adobe XD"],
  marketing: ["Excel", "Tableau", "SQL", "Communication", "Agile", "Salesforce", "Power BI", "Jira"],
  sales: ["Salesforce", "Communication", "Excel", "Leadership", "Agile", "SQL", "Tableau", "Jira"],
  product: ["Agile", "Scrum", "Jira", "Communication", "Leadership", "SQL", "Excel", "Figma"],
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

const US_STATES_ABBR = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
]);

const US_STATE_NAMES = new Set([
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware",
  "florida","georgia","hawaii","idaho","illinois","indiana","iowa","kansas","kentucky","louisiana",
  "maine","maryland","massachusetts","michigan","minnesota","mississippi","missouri","montana",
  "nebraska","nevada","new hampshire","new jersey","new mexico","new york","north carolina",
  "north dakota","ohio","oklahoma","oregon","pennsylvania","rhode island","south carolina",
  "south dakota","tennessee","texas","utah","vermont","virginia","washington","west virginia",
  "wisconsin","wyoming","district of columbia",
]);

function isUSALocation(loc: string): boolean {
  if (!loc) return false;
  const lower = loc.toLowerCase();
  // Muse uses "Flexible / Remote" — accept as US-friendly remote
  if (/flexible\s*\/\s*remote/i.test(loc)) return true;
  if (/\bUS\b|\bUSA\b|united states/i.test(loc)) return true;
  const m = loc.match(/,\s*([A-Z]{2})\b/);
  if (m && US_STATES_ABBR.has(m[1])) return true;
  for (const name of US_STATE_NAMES) {
    if (lower.includes(name)) return true;
  }
  return false;
}

// ───────────────────────── Aggregator blocklist ─────────────────────────
const BLOCKED_APPLY_DOMAINS = new Set([
  "talent.com", "www.talent.com",
  "indeed.com", "www.indeed.com", "in.indeed.com",
  "click.appcast.io", "appcast.io",
  "ziprecruiter.com", "www.ziprecruiter.com",
  "glassdoor.com", "www.glassdoor.com",
  "monster.com", "www.monster.com",
  "simplyhired.com", "www.simplyhired.com",
  "snagajob.com", "www.snagajob.com",
  "careerbuilder.com", "www.careerbuilder.com",
  "neuvoo.com", "www.neuvoo.com",
  "jobcase.com", "www.jobcase.com",
  "joblist.com", "www.joblist.com",
  "jooble.org", "www.jooble.org",
  "trabajo.org",
  "learn4good.com", "www.learn4good.com",
  "adzuna.com", "www.adzuna.com",
  "linkedin.com", "www.linkedin.com",
  "clearancejobs.com", "www.clearancejobs.com",
]);

const BLOCKED_APPLY_DOMAIN_SUFFIXES = ["jometer.com", "jobsyn.org", "learn4good.com"];

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isBlockedApplyLink(url: string): boolean {
  const d = getDomain(url);
  if (!d) return true;
  if (BLOCKED_APPLY_DOMAINS.has(d)) return true;
  for (const suffix of BLOCKED_APPLY_DOMAIN_SUFFIXES) {
    if (d === suffix || d.endsWith("." + suffix)) return true;
  }
  return false;
}

// ───────────────────────── Muse API ─────────────────────────
interface MuseLocation { name: string }
interface MuseLevel { name: string; short_name?: string }
interface MuseCategory { name: string }
interface MuseCompany { name: string; short_name?: string }

interface MuseJob {
  id: number;
  name: string; // title
  type?: string;
  publication_date: string;
  short_name: string;
  model_type: string;
  contents: string; // HTML description
  refs: { landing_page: string };
  company: MuseCompany;
  locations: MuseLocation[];
  levels: MuseLevel[];
  categories: MuseCategory[];
  tags?: { name: string; short_name: string }[];
}

async function fetchMuse(
  apiKey: string,
  category: string,
  level: string,
  location: string,
  page: number = 1
): Promise<{ results: MuseJob[]; page_count: number }> {
  const params = new URLSearchParams({
    api_key: apiKey,
    page: String(page),
    descending: "true",
  });
  // Muse expects multiple `category`, `level`, `location` params
  if (category) params.append("category", category);
  if (level) params.append("level", level);
  if (location) params.append("location", location);

  const res = await fetch(`https://www.themuse.com/api/public/jobs?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Muse API ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return { results: json.results || [], page_count: json.page_count || 1 };
}

function isInternship(job: MuseJob): boolean {
  if (job.levels?.some((l) => /intern/i.test(l.name))) return true;
  if (/intern/i.test(job.name)) return true;
  return false;
}

function buildLocation(j: MuseJob): string {
  if (!j.locations?.length) return "Remote";
  return j.locations.map((l) => l.name).join(" • ");
}

function getCompanyLogo(j: MuseJob): string | null {
  // Muse doesn't return logo in public API — derive from company name via clearbit
  const name = j.company?.name;
  if (!name) return null;
  const slug = (j.company.short_name || name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (!slug) return null;
  return `https://logo.clearbit.com/${slug}.com`;
}

// ───────────────────────── Main handler ─────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const MUSE_API_KEY = Deno.env.get("MUSE_API_KEY");

  if (!MUSE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "MUSE_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Auth
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
    .from("muse_ingest_runs")
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

  let seedQuery = admin
    .from("muse_query_seeds")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (bodySeedId) seedQuery = admin.from("muse_query_seeds").select("*").eq("id", bodySeedId);

  const { data: seeds, error: seedErr } = await seedQuery;
  if (seedErr || !seeds?.length) {
    await admin.from("muse_ingest_runs").update({
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
    console.log(`[ingest-muse] Starting ${seeds.length} seeds (run ${runId})`);
    for (const seed of seeds) {
      const seedLabel = `${seed.category} / ${seed.level} / ${seed.location}`;
      try {
        // Fetch up to 3 pages per seed (60 jobs max)
        const allJobs: MuseJob[] = [];
        for (let page = 1; page <= 3; page++) {
          const { results, page_count } = await fetchMuse(
            MUSE_API_KEY,
            seed.category,
            seed.level,
            seed.location,
            page
          );
          allJobs.push(...results);
          if (page >= page_count) break;
        }
        stats.total_fetched += allJobs.length;
        let importedThisSeed = 0;

        for (const j of allJobs) {
          if (!j.name || !j.company?.name) {
            stats.total_skipped++;
            continue;
          }

          const applyLink = j.refs?.landing_page;
          if (!applyLink || isBlockedApplyLink(applyLink)) {
            stats.total_filtered++;
            continue;
          }

          const location = buildLocation(j);
          if (!isUSALocation(location)) {
            stats.total_filtered++;
            continue;
          }

          const cleanDescription = stripHtml(j.contents || "");
          if (isExcludedJob(j.name, cleanDescription)) {
            stats.total_filtered++;
            continue;
          }

          const { data: existing } = await admin
            .from("jobs")
            .select("id")
            .eq("external_apply_link", applyLink)
            .maybeSingle();
          if (existing) {
            stats.total_skipped++;
            continue;
          }

          const tagSkills = (j.tags || []).map((t) => t.name).slice(0, 5);
          const enrichedSkills = enrichSkills(j.name, cleanDescription, tagSkills);

          const { error: insertErr } = await admin.from("jobs").insert({
            title: j.name.trim(),
            company: j.company.name.trim(),
            company_logo: getCompanyLogo(j),
            location,
            description: cleanDescription,
            skills: enrichedSkills,
            external_apply_link: applyLink,
            employment_type: isInternship(j) ? "Internship" : "Full Time",
            salary_range: null, // Muse rarely provides salary
            posted_date: j.publication_date || new Date().toISOString(),
            is_published: true,
            is_archived: false,
            is_direct_apply: true,
          });

          if (insertErr) {
            stats.errors.push({ query: seedLabel, error: insertErr.message });
            stats.total_skipped++;
          } else {
            stats.total_imported++;
            importedThisSeed++;
          }
        }

        stats.per_query.push({ query: seedLabel, fetched: allJobs.length, imported: importedThisSeed });

        await admin
          .from("muse_query_seeds")
          .update({ last_run_at: new Date().toISOString(), last_imported_count: importedThisSeed })
          .eq("id", seed.id);

        await admin.from("muse_ingest_runs").update({
          total_fetched: stats.total_fetched,
          total_imported: stats.total_imported,
          total_skipped: stats.total_skipped,
          total_filtered: stats.total_filtered,
          details: { per_query: stats.per_query },
        }).eq("id", runId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[ingest-muse] Error on "${seedLabel}":`, msg);
        stats.errors.push({ query: seedLabel, error: msg });
      }
    }

    try {
      const { data: dedupRes } = await admin.rpc("remove_duplicate_jobs");
      stats.duplicates_removed = (dedupRes as { removed?: number })?.removed || 0;
    } catch (e) {
      console.error("[ingest-muse] Dedup error:", e);
    }

    await admin.from("muse_ingest_runs").update({
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

    console.log(`[ingest-muse] Run ${runId} done: ${stats.total_imported} imported, ${stats.total_filtered} filtered`);
  };

  // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
  EdgeRuntime.waitUntil(backgroundWork());

  return new Response(
    JSON.stringify({
      success: true,
      run_id: runId,
      message: "Muse ingest started in background — check /admin/import for progress",
      seeds_count: seeds.length,
    }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
