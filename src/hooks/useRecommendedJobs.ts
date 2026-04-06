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

/**
 * Compute title proximity: 3 = exact/near-exact, 2 = close variant, 1 = same family, 0 = other.
 */
function computeTitleProximity(jobTitle: string, userRole: string, targetTitles: string[]): number {
  const jt = jobTitle.toLowerCase().trim();
  const pr = userRole.toLowerCase().trim();

  // Exact or substring match with primary role
  if (jt === pr || jt.includes(pr) || pr.includes(jt)) return 3;

  // Exact match with any target title
  for (const tt of targetTitles) {
    const ttl = tt.toLowerCase().trim();
    if (jt === ttl || jt.includes(ttl) || ttl.includes(jt)) return 2;
  }

  // Word-level overlap: if >50% of role keywords appear in job title → same family
  const roleWords = pr.split(/[\s,/\-]+/).filter(w => w.length > 2);
  const jobWords = new Set(jt.split(/[\s,/\-]+/).filter(w => w.length > 2));
  if (roleWords.length > 0) {
    const overlap = roleWords.filter(w => jobWords.has(w)).length;
    if (overlap / roleWords.length >= 0.5) return 1;
  }

  // Check target title word overlap
  for (const tt of targetTitles) {
    const ttWords = tt.toLowerCase().split(/[\s,/\-]+/).filter(w => w.length > 2);
    if (ttWords.length > 0) {
      const overlap = ttWords.filter(w => jobWords.has(w)).length;
      if (overlap / ttWords.length >= 0.5) return 1;
    }
  }

  return 0;
}

export interface RecommendedJob extends Job {
  matchScore: number;
  matchedSkills: string[];
  matchResult?: JobMatchResult;
  titleProximity?: number; // 0-3: 3=exact, 2=near-exact, 1=same-family, 0=other
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

      const allProcessed: RecommendedJob[] = [];

      for (const row of data) {
        const job = parseJob(row);
        const ageMs = now - job.posted_date.getTime();
        if (ageMs > 15 * 24 * 60 * 60 * 1000) continue;
        if (shouldExcludeJob(job)) continue;

        const match = calculateJobMatch(job, ri);
        const adjustedScore = Math.min(
          match.score + freshnessBonus(job.posted_date) + sourceBonus(job.external_apply_link),
          100
        );
        const proximity = computeTitleProximity(job.title, userRole, targetTitles);
        const roleRelevant = isRoleRelevant(job.title, userRole, targetTitles);

        allProcessed.push({
          ...job,
          matchScore: adjustedScore,
          matchedSkills: match.matchedSkills,
          matchResult: { ...match, score: adjustedScore },
          titleProximity: proximity,
          _roleRelevant: roleRelevant,
        } as RecommendedJob & { _roleRelevant: boolean });
      }

      // Tier 1: role-relevant + score >= 45
      const tier1 = allProcessed.filter(j => (j as any)._roleRelevant && j.matchScore >= MIN_MATCH_SCORE);
      // Tier 2: role-relevant + score >= 25
      const tier2 = allProcessed.filter(j => (j as any)._roleRelevant && j.matchScore >= 25 && j.matchScore < MIN_MATCH_SCORE);
      // Tier 3: any job with skill overlap >= 1
      const tier3 = allProcessed.filter(j => !(j as any)._roleRelevant && j.matchedSkills.length >= 1);
      // Tier 4: absolute fallback — recent jobs
      const tier4 = allProcessed;

      const sortFn = (a: RecommendedJob, b: RecommendedJob) => {
        // 1. Title proximity is king — exact title matches always on top
        const proxDiff = (b.titleProximity ?? 0) - (a.titleProximity ?? 0);
        if (proxDiff !== 0) return proxDiff;
        // 2. Within same proximity, show newest first (recently uploaded)
        const timeDiff = b.posted_date.getTime() - a.posted_date.getTime();
        // Only break recency tie with match score
        if (Math.abs(timeDiff) > 3600000) return timeDiff; // >1hr apart → recency wins
        return b.matchScore - a.matchScore;
      };

      // Use the highest non-empty tier, or combine tiers to fill
      let results: RecommendedJob[] = [];

      if (tier1.length > 0) {
        tier1.sort(sortFn);
        results = tier1.slice(0, 100);
      }

      // If tier1 is small, supplement with tier2
      if (results.length < 20 && tier2.length > 0) {
        tier2.sort(sortFn);
        const existingIds = new Set(results.map(j => j.id));
        for (const j of tier2) {
          if (!existingIds.has(j.id)) { results.push(j); existingIds.add(j.id); }
          if (results.length >= 50) break;
        }
      }

      // Still small? Add tier3
      if (results.length < 10 && tier3.length > 0) {
        tier3.sort(sortFn);
        const existingIds = new Set(results.map(j => j.id));
        for (const j of tier3) {
          if (!existingIds.has(j.id)) { results.push(j); existingIds.add(j.id); }
          if (results.length >= 30) break;
        }
      }

      // Absolute fallback: show newest jobs so page is never empty
      if (results.length === 0) {
        tier4.sort((a, b) => b.posted_date.getTime() - a.posted_date.getTime());
        results = tier4.slice(0, 30);
      }

      // Clean internal flag
      return results.map(({ _roleRelevant, ...rest }: any) => rest as RecommendedJob);
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
