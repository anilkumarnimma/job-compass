import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { useAdminJobs, useUpdateJob, useDeleteJob, useDuplicateJob } from "@/hooks/useAdminJobs";
import { JobForm } from "@/components/admin/JobForm";
import { CSVBulkUpload } from "@/components/admin/CSVBulkUpload";
import { SupportTicketsPanel } from "@/components/admin/SupportTicketsPanel";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Job } from "@/types/job";
import { Plus, Pencil, Trash2, Loader2, Shield, Copy, FileSpreadsheet } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Admin() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { data: jobs = [], isLoading: jobsLoading } = useAdminJobs();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const duplicateJob = useDuplicateJob();

  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setShowForm(true);
    setShowBulkUpload(false);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingJob(null);
  };

  const handleTogglePublished = async (job: Job) => {
    await updateJob.mutateAsync({
      id: job.id,
      data: { is_published: !job.is_published },
    });
  };

  const handleToggleReviewing = async (job: Job) => {
    await updateJob.mutateAsync({
      id: job.id,
      data: { is_reviewing: !job.is_reviewing },
    });
  };

  const handleDelete = async () => {
    if (deletingJobId) {
      await deleteJob.mutateAsync(deletingJobId);
      setDeletingJobId(null);
    }
  };

  const handleDuplicate = async (job: Job) => {
    await duplicateJob.mutateAsync(job);
  };

  return (
    <Layout>
      <div className="container max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
              <Shield className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Admin Panel
              </h1>
              <p className="text-muted-foreground">Manage job listings</p>
            </div>
          </div>
        {!showForm && !showBulkUpload && (
            <div className="flex gap-2">
              <Link to="/admin/import">
                <Button variant="outline">
                  <FileSpreadsheet className="h-4 w-4" />
                  Google Sheet Import
                </Button>
              </Link>
              <Button variant="outline" onClick={() => { setShowBulkUpload(true); setShowForm(false); }}>
                <FileSpreadsheet className="h-4 w-4" />
                CSV Upload
              </Button>
              <Button variant="accent" onClick={() => { setShowForm(true); setShowBulkUpload(false); }}>
                <Plus className="h-4 w-4" />
                Add Job
              </Button>
            </div>
          )}
        </div>

        {/* Bulk Upload Section */}
        {showBulkUpload && (
          <div className="mb-8 animate-fade-in">
            <CSVBulkUpload onComplete={() => setShowBulkUpload(false)} />
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={() => setShowBulkUpload(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Job Form */}
        {showForm && (
          <div className="mb-8 animate-fade-in">
            <JobForm job={editingJob} onClose={handleCloseForm} />
          </div>
        )}

        {/* Jobs List */}
        {jobsLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <Card className="p-12 text-center border-border/60">
            <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No jobs yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first job listing or upload via CSV
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => setShowBulkUpload(true)}>
                <FileSpreadsheet className="h-4 w-4" />
                Bulk Upload
              </Button>
              <Button variant="accent" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                Add Job
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id} className="p-5 border-border/60">
                <div className="flex items-start gap-4">
                  <CompanyLogo
                    logoUrl={job.company_logo}
                    companyName={job.company}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg truncate">
                          {job.title}
                        </h3>
                        <p className="text-muted-foreground">{job.company}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {job.location} • Posted {formatDistanceToNow(job.posted_date, { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {!job.is_published && (
                          <Badge variant="outline">Draft</Badge>
                        )}
                        {job.is_published && (
                          <Badge variant="accent">Published</Badge>
                        )}
                        {job.is_reviewing && (
                          <Badge variant="success">Reviewing</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.skills.slice(0, 4).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={job.is_published}
                        onCheckedChange={() => handleTogglePublished(job)}
                      />
                      <span className="text-sm text-muted-foreground">Published</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={job.is_reviewing}
                        onCheckedChange={() => handleToggleReviewing(job)}
                      />
                      <span className="text-sm text-muted-foreground">Reviewing</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(job)}
                      disabled={duplicateJob.isPending}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(job)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingJobId(job.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Support Tickets Section */}
        <div className="mt-8">
          <SupportTicketsPanel />
        </div>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingJobId} onOpenChange={() => setDeletingJobId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Job</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this job? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
