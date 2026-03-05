import { useState, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { JobCard } from "@/components/JobCard";
import { JobPreviewPanel } from "@/components/JobPreviewPanel";
import { MobileJobPreviewSheet } from "@/components/MobileJobPreviewSheet";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { ApplyConfirmDialog } from "@/components/ApplyConfirmDialog";
import { useRecommendedJobs, RecommendedJob } from "@/hooks/useRecommendedJobs";
import { useJobContext } from "@/context/JobContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Job } from "@/types/job";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Upload, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Recommendations() {
  const { data: jobs, isLoading, canRecommend, hasResume } = useRecommendedJobs();
  const { showUpgradeDialog, setShowUpgradeDialog, showApplyConfirm, confirmApply, cancelApply, isApplied } = useJobContext();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [selectedJob, setSelectedJob] = useState<RecommendedJob | null>(null);
  const [mobilePreviewJob, setMobilePreviewJob] = useState<Job | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const handleJobTap = useCallback((job: Job) => {
    const recJob = jobs?.find(j => j.id === job.id) || null;
    if (isMobile) {
      setMobilePreviewJob(job);
      setMobileSheetOpen(true);
    } else {
      setSelectedJob(prev => prev?.id === job.id ? null : recJob);
    }
  }, [isMobile, jobs]);

  const filteredJobs = (jobs || []).filter(j => !isApplied(j.id));

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[1400px] mx-auto px-4 md:px-6 py-6"
      >
        <div className="flex gap-6 justify-center">
          {/* Main Content */}
          <div className="flex-1 max-w-[600px] min-w-0">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-accent" />
                <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                  Recommended for you
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Jobs matched to your resume, skills, and experience.
              </p>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-5 border border-border/60 bg-card rounded-2xl space-y-3 shadow-card">
                    <div className="flex items-start gap-3.5">
                      <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-7 w-20 rounded-full" />
                      <Skeleton className="h-7 w-24 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !canRecommend ? (
              /* Empty state - no resume/profile data */
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20 max-w-sm mx-auto"
              >
                <div className="h-20 w-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
                  <FileText className="h-8 w-8 text-accent/60" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-lg mb-2">
                  Get personalized job recommendations
                </h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Upload your resume or fill in your profile skills to get matched with relevant jobs.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    onClick={() => navigate("/profile")}
                    className="rounded-full px-5 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Resume
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/profile")}
                    className="rounded-full px-5"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Add Skills
                  </Button>
                </div>
              </motion.div>
            ) : filteredJobs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20 max-w-sm mx-auto"
              >
                <div className="h-20 w-20 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-5">
                  <Sparkles className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-lg mb-2">No recommendations yet</h3>
                <p className="text-muted-foreground text-sm">
                  We couldn't find matching jobs right now. Try updating your profile with more skills.
                </p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredJobs.map((job, index) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.35, ease: "easeOut" }}
                  >
                    <div className="relative">
                      {/* Recommendation label */}
                      <div className="absolute -top-2 left-4 z-10">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className="bg-accent/15 text-accent border-accent/20 text-[10px] px-2 py-0.5 rounded-full font-medium shadow-sm cursor-default">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Recommended
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {job.matchedSkills.length > 0
                              ? `Matched skills: ${job.matchedSkills.slice(0, 4).join(", ")}`
                              : "Matched based on your profile"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <JobCard
                        job={job}
                        onTap={handleJobTap}
                        isSelected={selectedJob?.id === job.id}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel - Job Preview (Desktop) */}
          {!isMobile && (
            <div className="hidden lg:flex shrink-0">
              <AnimatePresence mode="wait">
                {selectedJob && (
                  <motion.div
                    key={selectedJob.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="w-[580px] shrink-0 sticky top-[88px] self-start border border-border/50 rounded-2xl bg-card/80 backdrop-blur-sm overflow-hidden shadow-card max-h-[calc(100vh-112px)] flex flex-col"
                  >
                    <JobPreviewPanel job={selectedJob} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      <MobileJobPreviewSheet job={mobilePreviewJob} open={mobileSheetOpen} onOpenChange={setMobileSheetOpen} />
      <UpgradeDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
      <ApplyConfirmDialog open={showApplyConfirm} onConfirm={confirmApply} onCancel={cancelApply} />
    </Layout>
  );
}
