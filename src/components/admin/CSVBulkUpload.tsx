import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

const REQUIRED_FIELDS = ["title", "company", "location", "description", "skills", "external_apply_link"];

function parseCSV(text: string): ParseResult {
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    return { valid: [], errors: [{ row: 0, message: "CSV must have a header row and at least one data row" }] };
  }

  // Parse header
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  
  // Check required fields
  const missingFields = REQUIRED_FIELDS.filter((f) => !header.includes(f));
  if (missingFields.length > 0) {
    return { valid: [], errors: [{ row: 0, message: `Missing required columns: ${missingFields.join(", ")}` }] };
  }

  const valid: CSVJob[] = [];
  const errors: { row: number; message: string }[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handles quoted values with commas)
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

    // Map values to fields
    const row: Record<string, string> = {};
    header.forEach((field, index) => {
      row[field] = values[index]?.replace(/^["']|["']$/g, "") || "";
    });

    // Validate required fields
    const rowMissing = REQUIRED_FIELDS.filter((f) => !row[f]);
    if (rowMissing.length > 0) {
      errors.push({ row: i + 1, message: `Missing: ${rowMissing.join(", ")}` });
      continue;
    }

    // Validate external_apply_link starts with https://
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (jobs: CSVJob[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const total = jobs.length;
      let uploaded = 0;

      // Upload in batches of 10
      const batchSize = 10;
      for (let i = 0; i < jobs.length; i += batchSize) {
        const batch = jobs.slice(i, i + batchSize).map((job) => ({
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
        setUploadProgress(Math.round((uploaded / total) * 100));
      }

      return total;
    },
    onSuccess: (count) => {
      toast.success(`Successfully uploaded ${count} jobs!`);
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      reset();
      onComplete?.();
    },
    onError: (error) => {
      toast.error("Upload failed: " + error.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

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
            <p className="text-sm text-muted-foreground">Upload multiple jobs via CSV</p>
          </div>
        </div>
        {parseResult && (
          <Button variant="ghost" size="icon" onClick={reset}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

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
