import { useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";
import { Job } from "@/types/job";
import { calculateMatchesForJobs } from "@/lib/jobMatcher";
import { analyzeVisaSponsorship } from "@/lib/visaSponsorship";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";
import { motion } from "framer-motion";
import { Target, Globe, Flame, Sparkles } from "lucide-react";
import { differenceInHours } from "date-fns";

interface WelcomeBannerProps {
  jobs: Job[];
}

export function WelcomeBanner({ jobs }: WelcomeBannerProps) {
  const { user } = useAuth();
  const { profile } = useProfile();

  const intelligence = profile?.resume_intelligence as ResumeIntelligence | null | undefined;

  const stats = useMemo(() => {
    if (!intelligence || !jobs.length) return null;

    const matchResults = calculateMatchesForJobs(jobs, intelligence);
    let perfectCount = 0;
    let sponsorCount = 0;
    let newTodayCount = 0;

    const now = new Date();

    for (const job of jobs) {
      const match = matchResults.get(job.id);
      if (match && match.score >= 80) perfectCount++;

      const visa = analyzeVisaSponsorship(job);
      if (visa.status === "sponsors" || visa.status === "opt_friendly" || visa.status === "stem_opt") {
        sponsorCount++;
      }

      if (differenceInHours(now, job.posted_date) <= 24) {
        newTodayCount++;
      }
    }

    return { perfectCount, sponsorCount, newTodayCount };
  }, [jobs, intelligence]);

  if (!user || !intelligence || !stats) return null;

  const firstName = profile?.first_name || profile?.full_name?.split(" ")[0] || "there";
  const primaryRole = intelligence.primaryRole || "your background";
  const topSkills = (intelligence.topSkills || [])
    .map(s => s.replace(/[^\x00-\x7F]+/g, "").trim())
    .filter(s => s.length > 1)
    .slice(0, 2)
    .join(" + ");

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mb-5 rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/5 via-primary/5 to-accent/5 p-4 md:p-5 relative overflow-hidden"
    >
      {/* Subtle glow */}
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-start gap-3 mb-3">
          <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base md:text-lg font-semibold text-foreground">
              Welcome back, {firstName}! 👋
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Based on your <span className="text-foreground font-medium">{primaryRole}</span> background,
              we found <span className="text-accent font-semibold">{stats.perfectCount} perfect matches</span> today.
              {topSkills && (
                <> {stats.newTodayCount > 0 ? stats.newTodayCount : "New"} jobs match your <span className="text-foreground font-medium">{topSkills}</span> skills ✨</>
              )}
            </p>
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex flex-wrap gap-2 ml-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-semibold border border-success/20">
            <Target className="h-3.5 w-3.5" />
            {stats.perfectCount} Perfect Matches
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold border border-accent/20">
            <Globe className="h-3.5 w-3.5" />
            {stats.sponsorCount} Sponsor Jobs
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-xs font-semibold border border-warning/20">
            <Flame className="h-3.5 w-3.5" />
            {stats.newTodayCount} New Today
          </span>
        </div>
      </div>
    </motion.div>
  );
}
