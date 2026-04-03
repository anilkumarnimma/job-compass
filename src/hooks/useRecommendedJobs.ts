import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Job } from "@/types/job";
import { calculateJobMatch, JobMatchResult } from "@/lib/jobMatcher";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";

function parseJob(row: any): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    company_logo: row.company_logo,
    location: row.location,
    description: row.description,
    skills: row.skills || [],
    external_apply_link: row.external_apply_link,
    is_published: row.is_published,
    is_reviewing: row.is_reviewing,
    salary_range: row.salary_range,
    employment_type: row.employment_type || "Full Time",
    experience_years: row.experience_years,
    posted_date: new Date(row.posted_date),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    is_archived: row.is_archived,
  };
}

// Precise role domain detection using ordered regex patterns (first match wins)
const ROLE_DOMAIN_PATTERNS: { domain: string; patterns: RegExp[] }[] = [
  {
    domain: "data-science",
    patterns: [
      /\b(data\s*scientist|machine\s*learning|ml\s*engineer|ai\s*engineer|deep\s*learning|nlp|computer\s*vision)\b/i,
    ],
  },
  {
    domain: "data-analytics",
    patterns: [
      /\b(data\s*analyst|bi\s*analyst|business\s*intelligence|analytics\s*engineer|reporting\s*analyst)\b/i,
    ],
  },
  {
    domain: "data-engineering",
    patterns: [
      /\b(data\s*engineer|etl|data\s*platform|data\s*infrastructure)\b/i,
    ],
  },
  {
    domain: "software-engineering",
    patterns: [
      /\b(software\s*(engineer|developer)|full[\s-]?stack|front[\s-]?end|back[\s-]?end|web\s*developer|sde\b|swe\b|java\s*developer|python\s*developer|react\s*developer|node\s*developer|\.net\s*developer|golang|rust\s*developer|c\+\+\s*developer)\b/i,
      /\b(application\s*developer|systems?\s*developer|api\s*developer|cloud\s*developer)\b/i,
    ],
  },
  {
    domain: "mobile",
    patterns: [
      /\b(mobile\s*(developer|engineer)|ios\s*(developer|engineer)|android\s*(developer|engineer)|react\s*native|flutter\s*(developer|engineer)|swift\s*developer|kotlin\s*developer)\b/i,
    ],
  },
  {
    domain: "devops",
    patterns: [
      /\b(devops|sre|site\s*reliability|platform\s*engineer|infrastructure\s*engineer|cloud\s*engineer|aws\s*engineer|azure\s*engineer|gcp\s*engineer|kubernetes\s*engineer)\b/i,
    ],
  },
  {
    domain: "qa",
    patterns: [
      /\b(qa\s*(engineer|analyst|lead)|quality\s*assurance|test\s*(engineer|automation|lead)|sdet|automation\s*engineer)\b/i,
    ],
  },
  {
    domain: "security",
    patterns: [
      /\b(security\s*(engineer|analyst|architect)|cyber\s*security|infosec|penetration\s*test|appsec)\b/i,
    ],
  },
  {
    domain: "design",
    patterns: [
      /\b(ux|ui|product\s*design|interaction\s*design|visual\s*design|graphic\s*design)\b/i,
    ],
  },
  {
    domain: "product",
    patterns: [
      /\b(product\s*manager|product\s*owner|program\s*manager|technical\s*program\s*manager|scrum\s*master)\b/i,
    ],
  },
  {
    domain: "marketing",
    patterns: [
      /\b(marketing|growth\s*(manager|lead|hacker)|seo|content\s*(manager|strategist)|brand\s*manager|social\s*media|digital\s*marketing)\b/i,
    ],
  },
  {
    domain: "sales",
    patterns: [
      /\b(sales|account\s*executive|business\s*development|bdr|sdr|revenue)\b/i,
    ],
  },
  {
    domain: "support",
    patterns: [
      /\b(customer\s*(success|support|experience|service)|cx\s*(manager|lead)|help\s*desk|technical\s*support)\b/i,
    ],
  },
  {
    domain: "hr",
    patterns: [
      /\b(human\s*resources|recruiter|talent\s*(acquisition|partner)|people\s*ops|hr\s*(manager|generalist|business\s*partner))\b/i,
    ],
  },
  {
    domain: "finance",
    patterns: [
      /\b(finance|accounting|financial\s*analyst|controller|cfo|treasury|audit)\b/i,
    ],
  },
  {
    domain: "operations",
    patterns: [
      /\b(operations\s*(manager|analyst|lead)|supply\s*chain|logistics|procurement)\b/i,
    ],
  },
  {
    domain: "management-consulting",
    patterns: [
      /\b(management\s*consult|strategy\s*consult|business\s*consult|associate\s*consult)\b/i,
    ],
  },
  {
    domain: "project-management",
    patterns: [
      /\b(project\s*(manager|coordinator|lead)|pmp)\b/i,
    ],
  },
];

// Which domains are considered closely related
const DOMAIN_ADJACENCY: Record<string, string[]> = {
  "software-engineering": ["mobile", "devops", "qa", "data-engineering"],
  "mobile": ["software-engineering"],
  "devops": ["software-engineering", "security"],
  "qa": ["software-engineering"],
  "data-science": ["data-analytics", "data-engineering"],
  "data-analytics": ["data-science", "data-engineering"],
  "data-engineering": ["data-science", "data-analytics", "software-engineering"],
  "security": ["devops", "software-engineering"],
  "design": [],
  "product": ["project-management"],
  "project-management": ["product"],
  "marketing": [],
  "sales": [],
  "support": [],
  "hr": [],
  "finance": [],
  "operations": [],
  "management-consulting": [],
};

function detectDomain(title: string): string | null {
  for (const { domain, patterns } of ROLE_DOMAIN_PATTERNS) {
    if (patterns.some(p => p.test(title))) return domain;
  }
  return null;
}

function isRoleRelevant(jobTitle: string, userRole: string, targetTitles: string[]): boolean {
  const jobDomain = detectDomain(jobTitle);
  const userDomain = detectDomain(userRole);

  // If we can't categorize the job, exclude it (strict mode)
  if (!jobDomain) return false;

  // If we can't categorize the user, fall back to target titles
  if (!userDomain) {
    // Check if any target title maps to the job domain
    for (const tt of targetTitles) {
      const ttDomain = detectDomain(tt);
      if (ttDomain === jobDomain) return true;
      if (ttDomain && DOMAIN_ADJACENCY[ttDomain]?.includes(jobDomain)) return true;
    }
    // Can't determine user domain at all — allow cautiously
    return targetTitles.length === 0;
  }

  // Same domain = relevant
  if (jobDomain === userDomain) return true;

  // Adjacent domain = relevant
  if (DOMAIN_ADJACENCY[userDomain]?.includes(jobDomain)) return true;

  // Check target titles for cross-domain matches
  for (const tt of targetTitles) {
    const ttDomain = detectDomain(tt);
    if (ttDomain === jobDomain) return true;
    if (ttDomain && DOMAIN_ADJACENCY[ttDomain]?.includes(jobDomain)) return true;
  }

  return false;
}

// Minimum match score to include in recommendations
const MIN_MATCH_SCORE = 45;

// Freshness bonus: jobs posted recently get a score boost
function freshnessBonus(postedDate: Date): number {
  const hoursAgo = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60);
  if (hoursAgo <= 24) return 8;
  if (hoursAgo <= 48) return 5;
  if (hoursAgo <= 72) return 3;
  if (hoursAgo <= 168) return 1; // within 1 week
  return 0;
}

// Source quality: Greenhouse/Lever/direct career pages rank higher
function sourceBonus(link: string): number {
  const l = (link || "").toLowerCase();
  if (l.includes("greenhouse.io") || l.includes("greenhouse.com")) return 3;
  if (l.includes("lever.co")) return 2;
  if (l.includes("dice.com") || l.includes("lensa.")) return -3;
  return 0;
}

export interface RecommendedJob extends Job {
  matchScore: number;
  matchedSkills: string[];
  matchResult?: JobMatchResult;
}

export function useRecommendedJobs() {
  const { profile, isLoading: profileLoading } = useProfile();

  const hasResume = !!profile?.resume_url;
  const hasProfileData = !!(profile?.skills?.length || profile?.current_title || (Array.isArray(profile?.work_experience) && profile.work_experience.length));
  const hasIntelligence = !!(profile?.resume_intelligence);

  // Build a stable fingerprint of resume intelligence to ensure queryKey changes on replacement
  const intelligence = profile?.resume_intelligence as ResumeIntelligence | null;
  const intelligenceFingerprint = intelligence
    ? `${intelligence.primaryRole || ""}|${(intelligence.topSkills || []).slice(0, 5).join(",")}|${intelligence.experienceLevel || ""}`
    : null;

  const enabled = !profileLoading && !!profile;

  const query = useQuery({
    queryKey: ["recommended-jobs", intelligenceFingerprint, profile?.current_title],
    queryFn: async (): Promise<RecommendedJob[]> => {
      if (!profile) return [];

      const ri = profile.resume_intelligence as ResumeIntelligence | null;

      // Fetch recent published jobs (only last 15 days, sorted by recency)
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("is_published", true)
        .eq("is_archived", false)
        .is("deleted_at", null)
        .order("posted_date", { ascending: false })
        .limit(300);

      if (error) throw error;
      if (!data) return [];

      // If no intelligence data, return recent jobs as fallback
      if (!ri) {
        return data.slice(0, 30).map(row => ({
          ...parseJob(row),
          matchScore: 0,
          matchedSkills: [],
        }));
      }

      const userRole = ri.primaryRole || "";
      const targetTitles = ri.jobTitlesToTarget || [];
      const now = Date.now();

      const scored: RecommendedJob[] = [];

      for (const row of data) {
        const job = parseJob(row);

        // Skip jobs older than 15 days (extra safety)
        const ageMs = now - job.posted_date.getTime();
        if (ageMs > 15 * 24 * 60 * 60 * 1000) continue;

        // Step 1: Strict role relevance filter
        if (!isRoleRelevant(job.title, userRole, targetTitles)) continue;

        // Step 2: Calculate match using jobMatcher
        const match = calculateJobMatch(job, ri);

        // Step 3: Apply freshness and source bonuses
        const adjustedScore = Math.min(
          match.score + freshnessBonus(job.posted_date) + sourceBonus(job.external_apply_link),
          100
        );

        // Step 4: Skip low matches (use adjusted score)
        if (adjustedScore < MIN_MATCH_SCORE) continue;

        scored.push({
          ...job,
          matchScore: adjustedScore,
          matchedSkills: match.matchedSkills,
          matchResult: { ...match, score: adjustedScore },
        });
      }

      // Sort: match score desc → recency desc
      scored.sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return b.posted_date.getTime() - a.posted_date.getTime();
      });

      return scored.slice(0, 50);
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 min — refresh faster after resume changes
    gcTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    hasResume,
    hasProfileData,
    canRecommend: hasResume || hasProfileData || hasIntelligence,
  };
}