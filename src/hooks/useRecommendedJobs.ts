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

// Role category mapping for strict relevance filtering
const ROLE_CATEGORIES: Record<string, string[]> = {
  engineering: ["software", "engineer", "developer", "frontend", "backend", "fullstack", "full stack", "devops", "sre", "platform", "infrastructure", "mobile", "ios", "android", "web", "qa", "sdet", "test automation", "embedded"],
  data: ["data", "analytics", "machine learning", "ml", "ai", "scientist", "data engineer", "bi ", "business intelligence", "nlp"],
  design: ["design", "ux", "ui", "product design", "graphic", "visual", "interaction"],
  product: ["product manager", "product owner", "program manager", "scrum master", "agile"],
  marketing: ["marketing", "growth", "seo", "content", "brand", "social media", "communications"],
  sales: ["sales", "account executive", "business development", "bdr", "sdr"],
  operations: ["operations", "supply chain", "logistics", "procurement"],
  hr: ["human resources", "recruiter", "talent", "people ops", "hr "],
  finance: ["finance", "accounting", "controller", "cfo", "financial analyst"],
  support: ["customer success", "customer support", "customer experience", "cx ", "help desk"],
};

function detectRoleCategory(title: string): string | null {
  const t = title.toLowerCase();
  for (const [category, keywords] of Object.entries(ROLE_CATEGORIES)) {
    if (keywords.some(kw => t.includes(kw))) return category;
  }
  return null;
}

function isRoleRelevant(jobTitle: string, userRole: string, targetTitles: string[]): boolean {
  const jobCategory = detectRoleCategory(jobTitle);
  const userCategory = detectRoleCategory(userRole);

  // If we can't categorize either, allow it (don't block unknown roles)
  if (!jobCategory || !userCategory) return true;

  // Same category = relevant
  if (jobCategory === userCategory) return true;

  // Check target titles for cross-category matches
  for (const tt of targetTitles) {
    const ttCategory = detectRoleCategory(tt);
    if (ttCategory === jobCategory) return true;
  }

  // Adjacent categories (engineering <-> data is OK)
  const ADJACENT: Record<string, string[]> = {
    engineering: ["data"],
    data: ["engineering"],
  };
  if (ADJACENT[userCategory]?.includes(jobCategory)) return true;

  return false;
}

// Minimum match score to include in recommendations
const MIN_MATCH_SCORE = 35;

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

  const enabled = !profileLoading && !!profile;

  const query = useQuery({
    queryKey: ["recommended-jobs", profile?.skills, profile?.current_title, profile?.location, profile?.resume_intelligence],
    queryFn: async (): Promise<RecommendedJob[]> => {
      if (!profile) return [];

      const intelligence = profile.resume_intelligence as ResumeIntelligence | null;

      // Fetch recent published jobs
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
      if (!intelligence) {
        return data.slice(0, 50).map(row => ({
          ...parseJob(row),
          matchScore: 0,
          matchedSkills: [],
        }));
      }

      const userRole = intelligence.primaryRole || "";
      const targetTitles = intelligence.jobTitlesToTarget || [];

      const scored: RecommendedJob[] = [];

      for (const row of data) {
        const job = parseJob(row);

        // Step 1: Strict role relevance filter
        if (!isRoleRelevant(job.title, userRole, targetTitles)) continue;

        // Step 2: Calculate match using jobMatcher
        const match = calculateJobMatch(job, intelligence);

        // Step 3: Skip very low matches
        if (match.score < MIN_MATCH_SCORE) continue;

        scored.push({
          ...job,
          matchScore: match.score,
          matchedSkills: match.matchedSkills,
          matchResult: match,
        });
      }

      // Step 4: Sort by match score (highest first), then by recency
      scored.sort((a, b) => {
        // Primary: match score descending
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        // Secondary: recency
        return b.posted_date.getTime() - a.posted_date.getTime();
      });

      return scored.slice(0, 50);
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