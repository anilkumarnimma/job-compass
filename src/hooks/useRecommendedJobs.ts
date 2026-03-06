import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Job } from "@/types/job";

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

// Common abbreviation / alias map for fuzzy matching
const SKILL_ALIASES: Record<string, string[]> = {
  react: ["reactjs", "react.js"],
  node: ["nodejs", "node.js"],
  javascript: ["js"],
  typescript: ["ts"],
  python: ["py"],
  "machine learning": ["ml"],
  "artificial intelligence": ["ai"],
  "deep learning": ["dl"],
  postgresql: ["postgres"],
  mongodb: ["mongo"],
  kubernetes: ["k8s"],
  "amazon web services": ["aws"],
  "google cloud platform": ["gcp"],
  "continuous integration": ["ci/cd", "ci"],
  "continuous deployment": ["cd"],
};

function buildAliasMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    map.set(canonical, aliases);
    for (const alias of aliases) {
      map.set(alias, [canonical, ...aliases.filter(a => a !== alias)]);
    }
  }
  return map;
}

const aliasMap = buildAliasMap();

function extractKeywords(profile: any): string[] {
  const keywords: string[] = [];

  // Skills from profile
  if (profile.skills?.length) {
    for (const skill of profile.skills) {
      keywords.push(skill); // full phrase e.g. "Machine Learning"
      // Also add individual words for partial matching
      const words = skill.split(/[\s,/\-()]+/).filter((w: string) => w.length > 1);
      keywords.push(...words);
    }
  }

  // Current title keywords
  if (profile.current_title) {
    keywords.push(profile.current_title); // full title
    keywords.push(...profile.current_title.split(/[\s,/\-]+/).filter((w: string) => w.length > 1));
  }

  // Work experience titles
  if (Array.isArray(profile.work_experience)) {
    for (const exp of profile.work_experience) {
      if (exp.title) {
        keywords.push(exp.title);
        keywords.push(...exp.title.split(/[\s,/\-]+/).filter((w: string) => w.length > 1));
      }
    }
  }

  // Resume intelligence data
  const intel = profile.resume_intelligence;
  if (intel) {
    if (intel.topSkills?.length) {
      for (const skill of intel.topSkills) {
        keywords.push(skill);
        keywords.push(...skill.split(/[\s,/\-()]+/).filter((w: string) => w.length > 1));
      }
    }
    if (intel.secondarySkills?.length) keywords.push(...intel.secondarySkills);
    if (intel.primaryStack?.length) keywords.push(...intel.primaryStack);
    if (intel.primaryRole) {
      keywords.push(intel.primaryRole);
      keywords.push(...intel.primaryRole.split(/[\s,/\-]+/).filter((w: string) => w.length > 1));
    }
    if (intel.jobTitlesToTarget?.length) {
      for (const title of intel.jobTitlesToTarget) {
        keywords.push(title);
        keywords.push(...title.split(/[\s,/\-]+/).filter((w: string) => w.length > 1));
      }
    }
  }

  // Add aliases for known skills
  const expanded: string[] = [...keywords];
  for (const kw of keywords) {
    const aliases = aliasMap.get(kw.toLowerCase());
    if (aliases) expanded.push(...aliases);
  }

  // Deduplicate, lowercase, remove noise words
  const noise = new Set(["the", "and", "for", "with", "using", "based", "level", "full", "time", "of", "in", "on", "to", "is", "an", "or"]);
  return [...new Set(expanded.map((k: string) => k.toLowerCase().trim()).filter(k => k.length > 1 && !noise.has(k)))].slice(0, 60);
}

function scoreJob(job: Job, keywords: string[], profileLocation?: string | null): { score: number; matchedSkills: string[] } {
  let score = 0;
  const matchedSkills: string[] = [];
  const jobText = `${job.title} ${job.description} ${job.skills.join(" ")}`.toLowerCase();
  const jobSkillsLower = job.skills.map(s => s.toLowerCase());
  const titleLower = job.title.toLowerCase();

  const counted = new Set<string>();

  for (const kw of keywords) {
    if (counted.has(kw)) continue;

    // Check full keyword in job text (handles multi-word like "machine learning")
    if (jobText.includes(kw)) {
      // Higher score for longer (more specific) matches
      const specificity = kw.length > 8 ? 2 : 1;
      score += specificity;
      counted.add(kw);

      // Track matched skills
      if (jobSkillsLower.some(s => s.includes(kw) || kw.includes(s))) {
        matchedSkills.push(kw);
      }
    }

    // Bonus for title match
    if (titleLower.includes(kw)) {
      score += kw.length > 5 ? 3 : 1.5;
    }
  }

  // Location bonus
  if (profileLocation && job.location.toLowerCase().includes(profileLocation.toLowerCase())) {
    score += 1;
  }

  return { score, matchedSkills: [...new Set(matchedSkills)] };
}

export interface RecommendedJob extends Job {
  matchScore: number;
  matchedSkills: string[];
}

export function useRecommendedJobs() {
  const { profile, isLoading: profileLoading } = useProfile();

  const hasResume = !!profile?.resume_url;
  const hasProfileData = !!(profile?.skills?.length || profile?.current_title || (Array.isArray(profile?.work_experience) && profile.work_experience.length));
  const hasIntelligence = !!(profile?.resume_intelligence);

  const enabled = !profileLoading && !!profile;

  const query = useQuery({
    queryKey: ["recommended-jobs", profile?.skills, profile?.current_title, profile?.location, profile?.resume_intelligence],
    queryFn: async (): Promise<RecommendedJob[]> => {
      if (!profile) return [];

      const keywords = extractKeywords(profile);

      // Fetch a batch of recent published jobs
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("is_published", true)
        .eq("is_archived", false)
        .order("posted_date", { ascending: false })
        .limit(200);

      if (error) throw error;
      if (!data) return [];

      // If no keywords at all, return recent jobs as fallback (no scoring)
      if (keywords.length === 0) {
        return data.slice(0, 50).map(row => ({
          ...parseJob(row),
          matchScore: 0,
          matchedSkills: [],
        }));
      }

      const scored = data
        .map(row => {
          const job = parseJob(row);
          const { score, matchedSkills } = scoreJob(job, keywords, profile.location);
          return { ...job, matchScore: score, matchedSkills } as RecommendedJob;
        })
        .sort((a, b) => b.matchScore - a.matchScore);

      // If scoring produced no matches at all, return all jobs sorted by date
      if (scored.every(j => j.matchScore === 0)) {
        return scored.slice(0, 50);
      }

      // Return all scored jobs (including low scores) - let the UI decide thresholds
      return scored.filter(j => j.matchScore > 0).slice(0, 50);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    hasResume,
    hasProfileData,
    canRecommend: hasResume || hasProfileData || hasIntelligence,
  };
}
