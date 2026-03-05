import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Target, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
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
  const { isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();

  const maxScore = useMemo(() => {
    if (!jobs?.length) return 1;
    return jobs[0].matchScore;
  }, [jobs]);

  const { strong, good, needsSkills, topMatches } = useMemo(() => {
    if (!jobs?.length) return { strong: 0, good: 0, needsSkills: 0, topMatches: [] as { title: string; percent: number }[] };

    let s = 0, g = 0, n = 0;
    const top: { title: string; percent: number }[] = [];

    for (const job of jobs) {
      const pct = computeMatchPercent(job, maxScore);
      if (pct >= 80) s++;
      else if (pct >= 60) g++;
      else n++;
      if (top.length < 3) top.push({ title: job.title, percent: pct });
    }

    return { strong: s, good: g, needsSkills: n, topMatches: top };
  }, [jobs, maxScore]);

  if (profileLoading || isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    );
  }

  if (!canRecommend) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-lg border border-border/60 bg-card p-3 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-[13px] font-semibold text-foreground">Job matches for you</h3>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="text-[11px] font-medium px-3 py-1 rounded-md border border-border bg-background text-foreground hover:bg-secondary transition-colors"
          >
            Complete Profile
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Add skills or upload a resume to get matches.
        </p>
      </motion.div>
    );
  }

  const stats = [
    { label: "Strong matches", count: strong, icon: Target, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Good matches", count: good, icon: TrendingUp, color: "text-amber-600 dark:text-amber-400" },
    { label: "Needs skills", count: needsSkills, icon: AlertTriangle, color: "text-muted-foreground" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border border-border/40 bg-card p-3 shadow-sm"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-[13px] font-semibold text-foreground">Job matches for you</h3>
        </div>
        <button
          onClick={() => navigate("/recommendations")}
          className="flex items-center gap-0.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Inline stats */}
      <div className="flex items-center gap-3 text-[11px]">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <s.icon className={cn("h-3 w-3", s.color)} />
            <span className={cn("font-semibold", s.color)}>{s.count}</span>
            <span className="text-muted-foreground">{s.label.toLowerCase()}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
