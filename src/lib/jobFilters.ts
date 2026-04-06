import { Job } from "@/types/job";

// ── Tutor / Teaching keywords ──────────────────────────────────────
const EXCLUDED_TITLE_KEYWORDS = [
  'tutor', 'tutoring', 'teacher', 'teaching assistant',
  'instructor', 'lecturer', 'trainer', 'academic coach',
  'private lesson', 'teaching',
];

// ── High-experience title patterns ─────────────────────────────────
const HIGH_EXP_TITLE_PATTERNS = [
  /\bstaff\s+(engineer|developer|designer|scientist)/i,
  /\bprincipal\s+(engineer|developer|designer|scientist|architect)/i,
  /\bdirector\b/i,
  /\bvp\b/i,
  /\bvice\s+president\b/i,
  /\bchief\b/i,
  /\b(cto|cfo|coo|ceo)\b/i,
  /\bfellow\b/i,
  /\bdistinguished\s+(engineer|scientist)/i,
];

// ── Experience year patterns in text ──────────────────────────────
// Matches "6+ years", "7-10 years", "8 years of experience", etc.
const HIGH_EXP_TEXT_PATTERNS = [
  /\b([6-9]|[1-9]\d)\+?\s*[-–]?\s*(?:\d+\s*)?(?:years?|yrs?)(?:\s+of)?\s*(?:experience|exp\.?)?/i,
  /(?:minimum|at\s+least|requires?)\s*(?:of\s+)?([6-9]|[1-9]\d)\s*(?:years?|yrs?)/i,
  /(?:experience|exp\.?)\s*(?:required)?[\s:]+([6-9]|[1-9]\d)\+?\s*(?:years?|yrs?)/i,
];

/** Returns true if the job is a tutor/teaching listing */
export function isTutorListing(job: Pick<Job, 'title' | 'description'>): boolean {
  const t = job.title.toLowerCase();
  return EXCLUDED_TITLE_KEYWORDS.some(kw => t.includes(kw));
}

/** Parse numeric years from experience_years field */
function parseExpYears(exp: string | null | undefined): number | null {
  if (!exp) return null;
  // e.g. "3-5", "5+", "3 years", "Entry Level"
  const nums = exp.match(/\d+/g);
  if (!nums?.length) return null;
  // Use the highest number mentioned
  return Math.max(...nums.map(Number));
}

/** Returns true if the job clearly requires >5 years experience */
export function isHighExperienceJob(job: Pick<Job, 'title' | 'description' | 'experience_years'>): boolean {
  // 1. Check experience_years field
  const expNum = parseExpYears(job.experience_years);
  if (expNum !== null && expNum > 5) return true;

  // 2. Check title for staff/principal/director level
  if (HIGH_EXP_TITLE_PATTERNS.some(p => p.test(job.title))) return true;

  // 3. Check description for explicit high-year requirements
  if (job.description) {
    for (const pattern of HIGH_EXP_TEXT_PATTERNS) {
      const match = job.description.match(pattern);
      if (match) {
        // Extract the number from the match
        const numMatch = match[0].match(/\d+/);
        if (numMatch && parseInt(numMatch[0], 10) > 5) return true;
      }
    }
  }

  return false;
}

/** Returns true if the job should be excluded from the platform */
export function shouldExcludeJob(job: Pick<Job, 'title' | 'description' | 'experience_years'>): boolean {
  return isTutorListing(job) || isHighExperienceJob(job);
}

/** Filter an array of jobs, removing unwanted ones */
export function filterExcludedJobs<T extends Pick<Job, 'title' | 'description' | 'experience_years'>>(jobs: T[]): T[] {
  return jobs.filter(job => !shouldExcludeJob(job));
}
