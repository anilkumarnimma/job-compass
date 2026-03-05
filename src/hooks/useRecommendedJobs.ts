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

function extractKeywords(profile: any): string[] {
  const keywords: string[] = [];

  // Skills
  if (profile.skills?.length) {
    keywords.push(...profile.skills);
  }

  // Current title keywords
  if (profile.current_title) {
    keywords.push(...profile.current_title.split(/[\s,/]+/).filter((w: string) => w.length > 2));
  }

  // Work experience titles
  if (Array.isArray(profile.work_experience)) {
    for (const exp of profile.work_experience) {
      if (exp.title) {
        keywords.push(...exp.title.split(/[\s,/]+/).filter((w: string) => w.length > 2));
      }
    }
  }

  // Deduplicate, lowercase
  return [...new Set(keywords.map((k: string) => k.toLowerCase()))].slice(0, 15);
}

function scoreJob(job: Job, keywords: string[], profileLocation?: string | null): { score: number; matchedSkills: string[] } {
  let score = 0;
  const matchedSkills: string[] = [];
  const jobText = `${job.title} ${job.description} ${job.skills.join(" ")}`.toLowerCase();

  for (const kw of keywords) {
    if (jobText.includes(kw)) {
      score += 1;
      // Track matched skills specifically
      if (job.skills.some(s => s.toLowerCase().includes(kw))) {
        matchedSkills.push(kw);
      }
    }
  }

  // Bonus for title match
  const titleLower = job.title.toLowerCase();
  for (const kw of keywords) {
    if (titleLower.includes(kw)) score += 2;
  }

  // Location bonus
  if (profileLocation && job.location.toLowerCase().includes(profileLocation.toLowerCase())) {
    score += 1;
  }

  return { score, matchedSkills };
}

export interface RecommendedJob extends Job {
  matchScore: number;
  matchedSkills: string[];
}

export function useRecommendedJobs() {
  const { profile, isLoading: profileLoading } = useProfile();

  const hasResume = !!profile?.resume_url;
  const hasProfileData = !!(profile?.skills?.length || profile?.current_title || (Array.isArray(profile?.work_experience) && profile.work_experience.length));

  const enabled = !profileLoading && (hasResume || hasProfileData);

  const query = useQuery({
    queryKey: ["recommended-jobs", profile?.skills, profile?.current_title, profile?.location],
    queryFn: async (): Promise<RecommendedJob[]> => {
      if (!profile) return [];

      const keywords = extractKeywords(profile);
      if (keywords.length === 0) return [];

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

      const scored = data
        .map(row => {
          const job = parseJob(row);
          const { score, matchedSkills } = scoreJob(job, keywords, profile.location);
          return { ...job, matchScore: score, matchedSkills } as RecommendedJob;
        })
        .filter(j => j.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 50);

      return scored;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    hasResume,
    hasProfileData,
    canRecommend: hasResume || hasProfileData,
  };
}
