import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Job } from "@/types/job";
import { JobMatchResult } from "@/lib/jobMatcher";
import { LandingProbabilityResult } from "@/lib/landingProbability";
import { LandingProbabilityBadge } from "@/components/LandingProbabilityBadge";
import { useJobContext } from "@/context/JobContext";
import { useAuth } from "@/context/AuthContext";
import { CompanyLogo } from "@/components/CompanyLogo";
import { MapPin, Clock, DollarSign, Bookmark, BookmarkCheck, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useRef, useCallback, useMemo } from "react";
import { analyzeVisaSponsorship } from "@/lib/visaSponsorship";
import { VisaSponsorshipBadge } from "@/components/VisaSponsorshipBadge";

interface JobCardProps {
  job: Job;
  onViewDetails?: (job: Job) => void;
  onTap?: (job: Job) => void;
  isSelected?: boolean;
  style?: React.CSSProperties;
  matchResult?: JobMatchResult;
  landingProbability?: LandingProbabilityResult | null;
}

export function JobCard({ job, onViewDetails, onTap, isSelected, style, matchResult, landingProbability }: JobCardProps) {
  const { applyToJob, saveJob, unsaveJob, isApplied, isSaved } = useJobContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  const saved = isSaved(job.id);
  const applied = isApplied(job.id);

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    if (saved) unsaveJob(job.id);
    else saveJob(job);
  };

  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    applyToJob(job);
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(job.external_apply_link, "_blank");
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (onTap) {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a')) return;
      onTap(job);
    }
  };

  // Subtle 3D tilt
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.transform = `perspective(800px) rotateY(${x * 3}deg) rotateX(${-y * 3}deg) translateY(-2px)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0px)";
  }, []);

  const getLocationBadge = () => {
    const loc = job.location.toLowerCase();
    if (loc.includes("remote")) return "bg-success-bg text-success-text";
    if (loc.includes("hybrid")) return "bg-tab-selected-bg text-tab-selected-text";
    return "bg-secondary text-foreground";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
    >
    <Card
      ref={cardRef}
      className={`group p-5 border bg-card/80 backdrop-blur-sm rounded-2xl cursor-pointer overflow-visible relative transition-all duration-300 ${
        isSelected 
          ? "border-accent ring-1 ring-accent/30 bg-accent/5 shadow-[0_0_20px_hsl(var(--accent)/0.15)]" 
          : "border-border/40 shadow-card hover:shadow-[0_8px_30px_hsl(var(--glow-accent)/0.1)] hover:border-accent/25"
      }`}
      onClick={handleCardClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ ...style, transition: "transform 0.2s ease, box-shadow 0.3s ease, border-color 0.3s ease" }}
    >
      {/* Shimmer sweep on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden rounded-2xl z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
      </div>

      {/* Header Row */}
      <div className="flex items-start gap-3.5 mb-3 relative z-10">
        <CompanyLogo
          logoUrl={job.company_logo}
          companyName={job.company}
          size="md"
          className="rounded-xl shrink-0 ring-1 ring-border/30"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3
                className="font-display font-semibold text-foreground text-base leading-tight cursor-pointer hover:text-accent transition-colors duration-200"
                onClick={handleTitleClick}
              >
                {job.title}
              </h3>
              <p className="text-muted-foreground text-sm mt-0.5">
                {job.company}
                <span className="mx-1.5 text-border">·</span>
                <span className="text-muted-foreground">
                  {job.salary_range || "Salary not disclosed"}
                </span>
              </p>
              <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(job.posted_date, { addSuffix: true })}
              </p>
            </div>
            {/* Match score & tier badges */}
            <div className="flex items-center gap-1.5 shrink-0">
              {matchResult && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${matchResult.scoreColor}`}>
                        {matchResult.score}%
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="z-[9999] text-xs max-w-[200px] whitespace-pre-line">
                      {matchResult.reason}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {matchResult && matchResult.score >= 40 && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${matchResult.tierColor}`}>
                  {matchResult.tierLabel}
                </span>
              )}
              {landingProbability && (
                <LandingProbabilityBadge result={landingProbability} compact />
              )}
              {!matchResult && job.is_reviewing && (
                <Badge className="shrink-0 px-2.5 py-1 text-[11px] font-medium bg-success-bg text-success-text border-0 rounded-full whitespace-nowrap animate-pulse">
                  ● Reviewing
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Meta Row */}
      <div className="flex flex-wrap items-center gap-2 mb-3 relative z-10">
        <VisaSponsorshipBadge result={analyzeVisaSponsorship(job)} compact />
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${getLocationBadge()}`}>
          <MapPin className="h-3.5 w-3.5" />
          {job.location}
        </span>

        {job.salary_range && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold">
            <DollarSign className="h-3.5 w-3.5" />
            {job.salary_range}
          </span>
        )}

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-foreground text-xs font-medium">
          <Clock className="h-3.5 w-3.5" />
          {job.employment_type}
        </span>
      </div>

      {/* Skills - max 5 visible + N more */}
      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 relative z-10">
          {job.skills.slice(0, 5).map((skill) => (
            <Badge
              key={skill}
              variant="outline"
              className="text-xs font-normal px-2.5 py-1 rounded-full bg-secondary/50 text-foreground border-border/40 hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all duration-200"
            >
              {skill}
            </Badge>
          ))}
          {job.skills.length > 5 && (
            <Badge variant="outline" className="text-xs font-normal px-2.5 py-1 rounded-full text-muted-foreground">
              +{job.skills.length - 5} more
            </Badge>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/30 relative z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSaveClick}
          className={`h-9 px-3 text-sm font-normal gap-1.5 rounded-full transition-all duration-200 active:scale-95 ${
            saved ? "text-accent" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          {saved ? "Saved" : "Save"}
        </Button>
        <Button
          size="sm"
          onClick={handleApplyClick}
          disabled={applied}
          className={`h-9 px-5 text-sm font-medium rounded-full gap-1.5 group/btn transition-all duration-200 active:scale-95 ${
            applied
              ? "bg-secondary text-foreground border border-border cursor-default"
              : "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm hover:shadow-glow btn-glow"
          }`}
        >
          {applied ? "Applied ✓" : (
            <>
              Apply Now
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
            </>
          )}
        </Button>
      </div>
    </Card>
    </motion.div>
  );
}
