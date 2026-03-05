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
        className="rounded-xl border border-border/60 bg-card p-4 shadow-sm"
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-xs font-semibold text-foreground">Job matches for you</h3>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">
          Add skills or upload a resume to get matches.
        </p>
        <button
          onClick={() => navigate("/profile")}
          className="w-full text-[11px] font-medium px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Complete Profile
        </button>
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
      className="rounded-xl border border-border/40 bg-card p-4 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.08)] hover:shadow-[0_4px_16px_-4px_hsl(var(--foreground)/0.12)] transition-all duration-300"
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-xs font-semibold text-foreground">Job matches for you</h3>
      </div>
      <p className="text-[10px] text-muted-foreground mb-3">Based on your resume + skills</p>

      {/* Compact stats */}
      <div className="space-y-1.5 mb-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <s.icon className={cn("h-3 w-3", s.color)} />
              <span className="text-[11px] text-foreground">{s.label}</span>
            </div>
            <span className={cn("text-[11px] font-semibold", s.color)}>{s.count}</span>
          </div>
        ))}
      </div>

      {/* Top 3 matches */}
      {topMatches.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Top matches</p>
          <div className="space-y-1">
            {topMatches.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="text-foreground truncate mr-2">• {m.title}</span>
                <span className="text-primary font-semibold shrink-0">{m.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => navigate("/recommendations")}
        className="w-full flex items-center justify-center gap-1 text-[11px] font-medium px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        View matches
        <ArrowRight className="h-3 w-3" />
      </button>
    </motion.div>
  );
}
