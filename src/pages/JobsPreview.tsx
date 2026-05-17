import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, Building2, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface PreviewJob {
  id: string;
  title: string;
  company: string;
  company_logo: string | null;
  location: string | null;
  employment_type: string | null;
  salary_range: string | null;
  skills: string[] | null;
  posted_date: string;
}

function usePublicJobsPreview() {
  return useQuery({
    queryKey: ["public-jobs-preview"],
    queryFn: async (): Promise<PreviewJob[]> => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, company, company_logo, location, employment_type, salary_range, skills, posted_date")
        .eq("is_published", true)
        .eq("is_archived", false)
        .eq("is_direct_apply", true)
        .is("deleted_at", null)
        .gte("posted_date", cutoff.toISOString())
        .order("posted_date", { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data ?? []) as PreviewJob[];
    },
    staleTime: 60_000,
  });
}

function formatPostedDate(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString();
}

export default function JobsPreview() {
  const { data: jobs, isLoading, error } = usePublicJobsPreview();

  return (
    <Layout>
      <Helmet>
        <title>Browse Jobs — Sociax</title>
        <meta
          name="description"
          content="Preview the latest entry-level and early-career roles on Sociax. Sign up free to apply, save, and track jobs."
        />
        <link rel="canonical" href="https://www.sociax.tech/jobs" />
      </Helmet>

      <div className="min-h-[calc(100vh-64px)] bg-background">
        <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">
          {/* Header */}
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-4 border-accent/30 text-accent">
              <Sparkles className="h-3 w-3 mr-1.5" />
              Live job preview
            </Badge>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Latest jobs on Sociax
            </h1>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              A quick look at what's hiring right now. Sign up free to apply, save jobs, and unlock AI-powered matches.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link to="/auth?signup=true">
                <Button size="lg" className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                  Sign up to apply
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="rounded-full">
                  Log in
                </Button>
              </Link>
            </div>
          </div>

          {/* Job list */}
          {isLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-20 text-muted-foreground">
              Couldn't load jobs right now. Please refresh.
            </div>
          )}

          {!isLoading && !error && jobs && jobs.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              No jobs available right now — check back soon.
            </div>
          )}

          <div className="grid gap-3">
            {jobs?.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                className="group relative p-5 rounded-xl bg-card border border-border/50 hover:border-accent/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Logo */}
                  <div className="shrink-0 h-12 w-12 rounded-lg bg-secondary flex items-center justify-center overflow-hidden border border-border/40">
                    {job.company_logo ? (
                      <img
                        src={job.company_logo}
                        alt={`${job.company} logo`}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-foreground text-base leading-tight truncate">
                      {job.title}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">{job.company}</span>
                      {job.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.location}
                        </span>
                      )}
                      {job.employment_type && (
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {job.employment_type}
                        </span>
                      )}
                      <span>· {formatPostedDate(job.posted_date)}</span>
                    </div>

                    {job.skills && job.skills.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {job.skills.slice(0, 5).map((s) => (
                          <span
                            key={s}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="shrink-0 hidden sm:block">
                    <Link to="/auth?signup=true">
                      <Button size="sm" variant="outline" className="rounded-full text-xs">
                        Sign in to apply
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Mobile CTA */}
                <div className="sm:hidden mt-3">
                  <Link to="/auth?signup=true">
                    <Button size="sm" variant="outline" className="w-full rounded-full text-xs">
                      Sign in to apply
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer CTA */}
          {jobs && jobs.length > 0 && (
            <div className="mt-10 p-6 rounded-2xl border border-accent/30 bg-accent/5 text-center">
              <h3 className="font-display text-xl font-bold text-foreground">
                See every job + AI match scores
              </h3>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
                Free account unlocks the full job board, saved lists, application tracking, and AI tools.
              </p>
              <Link to="/auth?signup=true">
                <Button className="mt-4 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                  Create free account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
