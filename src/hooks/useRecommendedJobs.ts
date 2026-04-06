import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Job } from "@/types/job";
import { calculateJobMatch, JobMatchResult } from "@/lib/jobMatcher";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";
import { isRoleRelevant } from "@/lib/roleMatching";
import { getResumeVersion } from "@/lib/resumeSync";
import { shouldExcludeJob } from "@/lib/jobFilters";

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

const MIN_MATCH_SCORE = 45;

function freshnessBonus(postedDate: Date): number {
  const hoursAgo = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60);
  if (hoursAgo <= 6) return 12;
  if (hoursAgo <= 24) return 10;
  if (hoursAgo <= 48) return 6;
  if (hoursAgo <= 72) return 3;
  if (hoursAgo <= 168) return 1;
  return 0;
}

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
  const intelligence = profile?.resume_intelligence as ResumeIntelligence | null;
  const hasIntelligence = !!intelligence;

  // Resume version ensures query re-runs after every resume replacement
  const resumeVersion = getResumeVersion(profile);

  // Stable fingerprint of intelligence content
  const intelligenceFingerprint = intelligence
    ? `${intelligence.primaryRole || ""}|${(intelligence.topSkills || []).slice(0, 5).join(",")}|${intelligence.experienceLevel || ""}`
    : null;

  const enabled = !profileLoading && !!profile;

  const query = useQuery({
    queryKey: ["recommended-jobs", resumeVersion, intelligenceFingerprint],
    queryFn: async (): Promise<RecommendedJob[]> => {
      if (!profile) return [];

      const ri = profile.resume_intelligence as ResumeIntelligence | null;

      // If user has a resume but intelligence hasn't synced yet, return empty
      // so we never show stale/unfiltered results
      if (hasResume && !ri) return [];

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

      // No intelligence → recent jobs fallback
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
      const domainFallback: RecommendedJob[] = [];

      for (const row of data) {
        const job = parseJob(row);
        const ageMs = now - job.posted_date.getTime();
        if (ageMs > 15 * 24 * 60 * 60 * 1000) continue;

        // Exclude tutor/high-experience jobs
        if (shouldExcludeJob(job)) continue;

        const match = calculateJobMatch(job, ri);
        const adjustedScore = Math.min(
          match.score + freshnessBonus(job.posted_date) + sourceBonus(job.external_apply_link),
          100
        );

        const recJob: RecommendedJob = {
          ...job,
          matchScore: adjustedScore,
          matchedSkills: match.matchedSkills,
          matchResult: { ...match, score: adjustedScore },
        };

        // Strict role relevance filter
        const roleRelevant = isRoleRelevant(job.title, userRole, targetTitles);

        if (roleRelevant && adjustedScore >= MIN_MATCH_SCORE) {
          scored.push(recJob);
        } else if (roleRelevant && adjustedScore >= 25) {
          // Same domain but lower score — fallback within role family
          domainFallback.push(recJob);
        }
      }

      // Primary: strict role-matched jobs sorted by match tier then recency
      if (scored.length > 0) {
        scored.sort((a, b) => {
          const tierA = a.matchScore >= 70 ? 2 : a.matchScore >= 50 ? 1 : 0;
          const tierB = b.matchScore >= 70 ? 2 : b.matchScore >= 50 ? 1 : 0;
          if (tierB !== tierA) return tierB - tierA;
          return b.posted_date.getTime() - a.posted_date.getTime();
        });
        return scored.slice(0, 100);
      }

      // Fallback: lower-scoring jobs still within the user's role domain
      if (domainFallback.length > 0) {
        domainFallback.sort((a, b) => b.posted_date.getTime() - a.posted_date.getTime());
        return domainFallback.slice(0, 50);
      }

      // Last resort: show recent jobs with any skill overlap (still exclude unrelated)
      const skillFallback = data
        .map(parseJob)
        .filter(job => !shouldExcludeJob(job))
        .map(job => {
          const match = calculateJobMatch(job, ri);
          return {
            ...job,
            matchScore: match.score,
            matchedSkills: match.matchedSkills,
            matchResult: match,
          } as RecommendedJob;
        })
        .filter(j => j.matchedSkills.length >= 2)
        .sort((a, b) => b.posted_date.getTime() - a.posted_date.getTime())
        .slice(0, 30);

      return skillFallback;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    hasResume,
    hasProfileData,
    canRecommend: hasResume || hasProfileData || hasIntelligence,
  };
}
