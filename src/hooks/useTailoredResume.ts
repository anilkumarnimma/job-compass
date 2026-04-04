import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { getResumeVersion } from "@/lib/resumeSync";

export interface TailoredResumeHeader {
  full_name: string;
  headline?: string;
  contact_details: string[];
}

export interface TailoredResumeSection {
  title: string;
  items: {
    heading: string;
    subheading?: string;
    date?: string;
    bullets?: string[];
  }[];
}

export interface TailoredResumeData {
  header: TailoredResumeHeader;
  summary: string;
  sections: TailoredResumeSection[];
  skills_section: string[];
  keywords_added: string[];
  optimization_notes: string;
}

interface GenerateParams {
  job_title: string;
  job_description: string;
  job_skills: string[];
  resume_intelligence: any;
  base_resume: {
    header: TailoredResumeHeader;
    summary?: string;
    sections: TailoredResumeSection[];
    skills_section: string[];
    source_signature?: string;
  };
  resume_file_base64?: string;
  resume_filename?: string;
  resume_mime_type?: string;
  resume_version?: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderResumeHtml(data: TailoredResumeData, documentTitle: string) {
  const headerLines = data.header.contact_details
    .filter(Boolean)
    .map((line) => `<span>${escapeHtml(line)}</span>`)
    .join('<span style="margin:0 8px;color:#94a3b8">•</span>');

  const sectionsHtml = data.sections
    .map((section) => {
      const itemsHtml = section.items
        .map((item) => {
          const header = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:2px;">
            <div style="min-width:0;flex:1;">
              <div style="font-weight:700;color:#0f172a;">${escapeHtml(item.heading)}</div>
              ${item.subheading ? `<div style="color:#475569;">${escapeHtml(item.subheading)}</div>` : ""}
            </div>
            ${item.date ? `<div style="color:#64748b;font-size:10pt;white-space:nowrap;">${escapeHtml(item.date)}</div>` : ""}
          </div>`;
          const bullets = (item.bullets || [])
            .map((bullet) => `<li style="margin-bottom:4px;">${escapeHtml(bullet)}</li>`)
            .join("");

          return `${header}${bullets ? `<ul style="margin:6px 0 12px 18px;padding:0;">${bullets}</ul>` : ""}`;
        })
        .join("");

      return `<section style="margin-top:18px;">
        <h2 style="font-size:11pt;text-transform:uppercase;letter-spacing:0.12em;border-bottom:1px solid #cbd5e1;padding-bottom:4px;margin:0 0 10px;color:#0f172a;">${escapeHtml(section.title)}</h2>
        ${itemsHtml}
      </section>`;
    })
    .join("");

  const skillsHtml = data.skills_section.length
    ? `<section style="margin-top:18px;">
        <h2 style="font-size:11pt;text-transform:uppercase;letter-spacing:0.12em;border-bottom:1px solid #cbd5e1;padding-bottom:4px;margin:0 0 10px;color:#0f172a;">Skills</h2>
        <p style="margin:0;color:#1e293b;">${data.skills_section.map(escapeHtml).join(" • ")}</p>
      </section>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(documentTitle)}</title>
  <style>
    @media print { @page { margin: 0.6in 0.7in; } }
    body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #0f172a; max-width: 800px; margin: 0 auto; padding: 30px; }
    * { box-sizing: border-box; }
    ul { list-style-type: disc; }
  </style>
  </head><body>
    <header style="text-align:center;margin-bottom:18px;">
      <h1 style="margin:0;font-size:22pt;letter-spacing:0.02em;color:#020617;">${escapeHtml(data.header.full_name || documentTitle)}</h1>
      ${data.header.headline ? `<p style="margin:6px 0 0;font-size:11pt;font-weight:600;color:#334155;">${escapeHtml(data.header.headline)}</p>` : ""}
      ${headerLines ? `<p style="margin:8px 0 0;font-size:10pt;color:#475569;">${headerLines}</p>` : ""}
    </header>
    ${data.summary ? `<section><p style="margin:0 0 8px;color:#334155;">${escapeHtml(data.summary)}</p></section>` : ""}
    ${skillsHtml}
    ${sectionsHtml}
    <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}</script>
  </body></html>`;
}

export function useTailoredResume() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<TailoredResumeData | null>(null);
  const cache = useRef<Map<string, TailoredResumeData>>(new Map());
  const lastResumeVersion = useRef<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();

  // Auto-invalidate cache when profile resume version changes
  const currentProfileVersion = getResumeVersion(profile);
  if (lastResumeVersion.current && lastResumeVersion.current !== currentProfileVersion) {
    cache.current.clear();
    setResult(null);
  }
  lastResumeVersion.current = currentProfileVersion;

  const generate = useCallback(async (params: GenerateParams) => {
    if (!user) return;

    const currentVersion = params.resume_version || currentProfileVersion;

    const cacheKey = [
      user.id,
      params.job_title,
      (params.job_skills || []).join(","),
      currentVersion,
    ].join("::");

    const cacheKey = [
      user.id,
      params.job_title,
      (params.job_skills || []).join(","),
      currentVersion,
    ].join("::");

    const cached = cache.current.get(cacheKey);
    if (cached) {
      setResult(cached);
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("tailor-resume", {
        body: params,
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const tailored = data as TailoredResumeData;
      cache.current.set(cacheKey, tailored);
      setResult(tailored);
    } catch (err: any) {
      toast({
        title: "Resume tailoring failed",
        description: err.message || "Could not generate tailored resume",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [user, toast]);

  const clearCache = useCallback(() => {
    cache.current.clear();
    lastResumeVersion.current = null;
    setResult(null);
  }, []);

  const clearResult = useCallback(() => setResult(null), []);

  const downloadAsPdf = useCallback((data: TailoredResumeData, jobTitle: string, company: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const html = renderResumeHtml(data, `Resume - ${company} - ${jobTitle}`);
    printWindow.document.write(html);
    printWindow.document.close();
  }, []);

  const downloadAsDoc = useCallback((data: TailoredResumeData, jobTitle: string, company: string) => {
    const html = renderResumeHtml(data, `Resume - ${company} - ${jobTitle}`);

    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Resume_Tailored_${company}_${jobTitle}.doc`.replace(/[^a-zA-Z0-9_.-]/g, "_");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return { generate, isGenerating, result, clearResult, clearCache, downloadAsPdf, downloadAsDoc };
}
