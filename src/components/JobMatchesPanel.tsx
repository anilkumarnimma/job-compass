import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Target, AlertTriangle, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useRecommendedJobs, RecommendedJob } from "@/hooks/useRecommendedJobs";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function computeMatchPercent(job: RecommendedJob, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.min(100, Math.round((job.matchScore / maxScore) * 100));
}

export function JobMatchesPanel() {
  const { data: jobs, isLoading, canRecommend } = useRecommendedJobs();
  const { profile, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();

  const maxScore = useMemo(() => {
    if (!jobs?.length) return 1;
    return jobs[0].matchScore; // highest score is 100%
  }, [jobs]);

  const { strong, good, needsSkills, topMatches, profileStrength } = useMemo(() => {
    if (!jobs?.length) return { strong: 0, good: 0, needsSkills: 0, topMatches: [] as { title: string; percent: number }[], profileStrength: 0 };

    let s = 0, g = 0, n = 0;
    const top: { title: string; percent: number }[] = [];

    for (const job of jobs) {
      const pct = computeMatchPercent(job, maxScore);
      if (pct >= 80) s++;
      else if (pct >= 60) g++;
      else n++;
      if (top.length < 3) top.push({ title: job.title, percent: pct });
    }

    // Profile strength: based on how many profile fields are filled
    let filled = 0;
    let total = 5;
    if (profile?.skills?.length) filled++;
    if (profile?.current_title) filled++;
    if (profile?.resume_url) filled++;
    if (profile?.location) filled++;
    if (Array.isArray(profile?.work_experience) && profile.work_experience.length > 0) filled++;
    const strength = Math.round((filled / total) * 100);

    return { strong: s, good: g, needsSkills: n, topMatches: top, profileStrength: strength };
  }, [jobs, maxScore, profile]);

  if (profileLoading || isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-sm">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
        <div className="space-y-3 pt-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!canRecommend) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4.5 w-4.5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Job Matches for You</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Get personalized job recommendations by adding your skills or uploading a resume.
        </p>
        <button
          onClick={() => navigate("/profile")}
          className="w-full text-xs font-medium px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Complete Your Profile
        </button>
      </motion.div>
    );
  }

  const stats = [
    { label: "Strong Matches", count: strong, icon: Target, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
    { label: "Good Matches", count: good, icon: TrendingUp, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40" },
    { label: "Needs Skills", count: needsSkills, icon: AlertTriangle, color: "text-muted-foreground", bg: "bg-secondary" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4.5 w-4.5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Job Matches for You</h3>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">Based on your resume and profile skills</p>

      {/* Stats */}
      <div className="space-y-2 mb-4">
        {stats.map((s) => (
          <div key={s.label} className={cn("flex items-center justify-between px-3 py-2.5 rounded-xl", s.bg)}>
            <div className="flex items-center gap-2">
              <s.icon className={cn("h-3.5 w-3.5", s.color)} />
              <span className="text-xs font-medium text-foreground">{s.label}</span>
            </div>
            <span className={cn("text-xs font-semibold", s.color)}>{s.count} jobs</span>
          </div>
        ))}
      </div>

      {/* Top Matches */}
      {topMatches.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Matches</p>
          <div className="space-y-1.5">
            {topMatches.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-xs px-1">
                <span className="text-foreground truncate mr-2">• {m.title}</span>
                <span className="text-primary font-semibold shrink-0">{m.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Matching Jobs */}
      <button
        onClick={() => navigate("/recommendations")}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mb-4"
      >
        View Matching Jobs
        <ArrowRight className="h-3.5 w-3.5" />
      </button>

      {/* Profile Match Strength */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Profile Match Strength</span>
          <span className="text-[11px] font-semibold text-foreground">{profileStrength}%</span>
        </div>
        <Progress value={profileStrength} className="h-2 bg-secondary" />
        {profileStrength < 60 && (
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Add more skills to improve your job matches.
          </p>
        )}
      </div>
    </motion.div>
  );
}
