import { Job } from "@/types/job";
import { JobCard } from "@/components/JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface JobListPaginatedProps {
  jobs: Job[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onTap?: (job: Job) => void;
  selectedJobId?: string | null;
}

function JobCardSkeleton() {
  return (
    <div className="p-5 border border-border/60 bg-card rounded-2xl space-y-3 shadow-card">
      <div className="flex items-start gap-3.5">
        <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      <div className="flex justify-between gap-3 pt-3 border-t border-border/30">
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
    </div>
  );
}

export function JobListPaginated({
  jobs,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
  onTap,
  selectedJobId,
}: JobListPaginatedProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 max-w-[600px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
          >
            <JobCardSkeleton />
          </motion.div>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-20 max-w-sm mx-auto"
      >
        <div className="h-20 w-20 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-5">
          <Search className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="font-display font-semibold text-foreground text-lg mb-2">No jobs found</h3>
        <p className="text-muted-foreground text-sm">Try adjusting your search or filters to find what you're looking for.</p>
      </motion.div>
    );
  }

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col gap-4 max-w-[600px]">
      {jobs.map((job, index) => (
        <motion.div
          key={job.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.35, ease: "easeOut" }}
        >
          <JobCard job={job} onTap={onTap} isSelected={selectedJobId === job.id} />
        </motion.div>
      ))}

      {totalPages > 1 && (
        <div className="py-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                  className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {getPageNumbers().map((page, idx) =>
                page === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={currentPage === page}
                      onClick={() => onPageChange(page as number)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                  className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
