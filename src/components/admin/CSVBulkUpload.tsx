import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRemoveDuplicates } from "@/hooks/useRemoveDuplicates";

interface CSVJob {
  title: string;
  company: string;
  location: string;
  description: string;
  skills: string;
  external_apply_link: string;
  employment_type?: string;
  experience_years?: string;
  salary_range?: string;
  company_logo?: string;
  posted_date?: string;
}

interface ParseResult {
  valid: CSVJob[];
  errors: { row: number; message: string }[];
}

interface UploadSummary {
  totalRows: number;
  inserted: number;
  skippedDuplicates: number;
  oldDuplicatesRemoved: number;
}

const REQUIRED_FIELDS = ["title", "company", "location", "description", "skills", "external_apply_link"];

function sanitizeCSVValue(value: string): string {
  const trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return "'" + trimmed;
  }
  return trimmed;
}

function deduplicateCSVJobs(jobs: CSVJob[]): { unique: CSVJob[]; csvDuplicates: number } {
  const seen = new Map<string, boolean>();
  const unique: CSVJob[] = [];
  let csvDuplicates = 0;

  for (const job of jobs) {
    const linkKey = job.external_apply_link.toLowerCase().trim();
    const comboKey = `${job.title.toLowerCase().trim()}|${job.company.toLowerCase().trim()}|${job.location.toLowerCase().trim()}`;

    if (seen.has(linkKey) || seen.has(comboKey)) {
      csvDuplicates++;
      continue;
    }

    seen.set(linkKey, true);
    seen.set(comboKey, true);
    unique.push(job);
  }

  return { unique, csvDuplicates };
}

function parseCSV(text: string): ParseResult {
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    return { valid: [], errors: [{ row: 0, message: "CSV must have a header row and at least one data row" }] };
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  
  const missingFields = REQUIRED_FIELDS.filter((f) => !header.includes(f));
  if (missingFields.length > 0) {
    return { valid: [], errors: [{ row: 0, message: `Missing required columns: ${missingFields.join(", ")}` }] };
  }

  const valid: CSVJob[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    header.forEach((field, index) => {
      row[field] = sanitizeCSVValue(values[index]?.replace(/^["']|["']$/g, "") || "");
    });

    const rowMissing = REQUIRED_FIELDS.filter((f) => !row[f]);
    if (rowMissing.length > 0) {
      errors.push({ row: i + 1, message: `Missing: ${rowMissing.join(", ")}` });
      continue;
    }

    if (!row.external_apply_link.startsWith("https://")) {
      errors.push({ row: i + 1, message: "external_apply_link must start with https://" });
      continue;
    }

    valid.push({
      title: row.title,
      company: row.company,
      location: row.location,
      description: row.description,
      skills: row.skills,
      external_apply_link: row.external_apply_link,
      employment_type: row.employment_type || "Full Time",
      experience_years: row.experience_years || undefined,
      salary_range: row.salary_range || undefined,
      company_logo: row.company_logo || undefined,
      posted_date: row.posted_date || undefined,
    });
  }

  return { valid, errors };
}

interface CSVBulkUploadProps {
  onComplete?: () => void;
}

export function CSVBulkUpload({ onComplete }: CSVBulkUploadProps) {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const removeDuplicates = useRemoveDuplicates();

  const uploadMutation = useMutation({
    mutationFn: async (jobs: CSVJob[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const totalCSVRows = jobs.length;

      // Step 1: Deduplicate within CSV
      const { unique, csvDuplicates } = deduplicateCSVJobs(jobs);

      // Step 2: Fetch existing jobs for DB-level dedup
      const existingLinks = new Set<string>();
      const existingCombos = new Set<string>();

      // Fetch in pages of 1000
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data } = await supabase
          .from("jobs")
          .select("external_apply_link, title, company, location")
          .range(from, from + pageSize - 1);
        
        if (!data || data.length === 0) break;
        
        for (const j of data) {
          if (j.external_apply_link) {
            existingLinks.add(j.external_apply_link.toLowerCase().trim());
          }
          existingCombos.add(`${j.title.toLowerCase().trim()}|${j.company.toLowerCase().trim()}|${j.location.toLowerCase().trim()}`);
        }
        
        if (data.length < pageSize) break;
        from += pageSize;
      }

      // Filter out jobs that already exist in DB
      const newJobs = unique.filter((job) => {
        const linkKey = job.external_apply_link.toLowerCase().trim();
        if (existingLinks.has(linkKey)) return false;
        
        const comboKey = `${job.title.toLowerCase().trim()}|${job.company.toLowerCase().trim()}|${job.location.toLowerCase().trim()}`;
        if (existingCombos.has(comboKey)) return false;
        
        return true;
      });

      const dbSkipped = unique.length - newJobs.length;

      // Step 3: Insert new jobs in batches
      let uploaded = 0;
      const batchSize = 10;
      for (let i = 0; i < newJobs.length; i += batchSize) {
        const batch = newJobs.slice(i, i + batchSize).map((job) => ({
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          skills: job.skills.split(",").map((s) => s.trim()).filter(Boolean),
          external_apply_link: job.external_apply_link,
          employment_type: job.employment_type || "Full Time",
          experience_years: job.experience_years || null,
          salary_range: job.salary_range || null,
          company_logo: job.company_logo || null,
          posted_date: job.posted_date || new Date().toISOString(),
          is_published: true,
          is_reviewing: false,
          created_by_user_id: user.id,
        }));

        const { error } = await supabase.from("jobs").insert(batch);
        if (error) throw error;

        uploaded += batch.length;
        setUploadProgress(Math.round((uploaded / Math.max(newJobs.length, 1)) * 100));
      }

      // Step 4: Clean old duplicates from DB
      let oldDuplicatesRemoved = 0;
      try {
        const { data: result } = await supabase.rpc("remove_duplicate_jobs");
        if (result && typeof result === "object" && "removed" in (result as Record<string, unknown>)) {
          oldDuplicatesRemoved = (result as { removed: number }).removed;
        }
      } catch {
        // Non-critical, don't fail upload
      }

      return {
        totalRows: totalCSVRows,
        inserted: newJobs.length,
        skippedDuplicates: csvDuplicates + dbSkipped,
        oldDuplicatesRemoved,
      } satisfies UploadSummary;
    },
    onSuccess: (summary) => {
      setUploadSummary(summary);
      toast.success(
        `${summary.inserted} jobs uploaded successfully. ${summary.skippedDuplicates} duplicates skipped.${summary.oldDuplicatesRemoved > 0 ? ` ${summary.oldDuplicatesRemoved} old duplicates removed.` : ""}`
      );
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (error) => {
      toast.error("Upload failed: " + error.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploadSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const result = parseCSV(text);
      setParseResult(result);
    };
    reader.readAsText(file);
  };

  const reset = () => {
    setParseResult(null);
    setFileName(null);
    setUploadProgress(0);
    setUploadSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = () => {
    if (parseResult?.valid.length) {
      uploadMutation.mutate(parseResult.valid);
    }
  };

  return (
    <Card className="p-6 border-border/60">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Bulk Upload Jobs</h3>
            <p className="text-sm text-muted-foreground">Upload multiple jobs via CSV (duplicates auto-skipped)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => removeDuplicates.mutate()}
            disabled={removeDuplicates.isPending}
          >
            {removeDuplicates.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Remove Existing Duplicates
          </Button>
          {parseResult && (
            <Button variant="ghost" size="icon" onClick={reset}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Upload Summary */}
      {uploadSummary && (
        <div className="mb-4 p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
          <h4 className="text-sm font-semibold text-foreground mb-2">Upload Summary</h4>
          <p className="text-sm text-foreground">Total rows in CSV: <strong>{uploadSummary.totalRows}</strong></p>
          <p className="text-sm text-foreground">New jobs inserted: <strong className="text-primary">{uploadSummary.inserted}</strong></p>
          <p className="text-sm text-foreground">Duplicate jobs skipped: <strong className="text-muted-foreground">{uploadSummary.skippedDuplicates}</strong></p>
          <p className="text-sm text-foreground">Old duplicates removed: <strong className="text-destructive">{uploadSummary.oldDuplicatesRemoved}</strong></p>
        </div>
      )}

      {!parseResult ? (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop a CSV file, or click to browse
          </p>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Choose File
          </Button>
          
          <div className="mt-6 text-left">
            <p className="text-xs font-medium text-foreground mb-2">Required columns:</p>
            <div className="flex flex-wrap gap-1.5">
              {REQUIRED_FIELDS.map((field) => (
                <Badge key={field} variant="secondary" className="text-xs">
                  {field}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Optional: employment_type, experience_years, salary_range, company_logo, posted_date
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{fileName}</span>
          </div>

          {/* Summary */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success-text" />
              <span className="text-sm text-foreground">
                {parseResult.valid.length} valid jobs
              </span>
            </div>
            {parseResult.errors.length > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-foreground">
                  {parseResult.errors.length} errors
                </span>
              </div>
            )}
          </div>

          {/* Errors */}
          {parseResult.errors.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 p-3 bg-destructive/10 rounded-lg">
              {parseResult.errors.slice(0, 10).map((error, i) => (
                <p key={i} className="text-xs text-destructive">
                  Row {error.row}: {error.message}
                </p>
              ))}
              {parseResult.errors.length > 10 && (
                <p className="text-xs text-destructive font-medium">
                  ... and {parseResult.errors.length - 10} more errors
                </p>
              )}
            </div>
          )}

          {/* Progress */}
          {uploadMutation.isPending && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset} disabled={uploadMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleUpload}
              disabled={parseResult.valid.length === 0 || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Upload {parseResult.valid.length} Jobs</>
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
