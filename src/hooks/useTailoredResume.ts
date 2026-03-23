import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

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
}

export function useTailoredResume() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<TailoredResumeData | null>(null);
  const cache = useRef<Map<string, TailoredResumeData>>(new Map());
  const { toast } = useToast();
  const { user } = useAuth();

  const generate = useCallback(async (params: GenerateParams) => {
    if (!user) return;

    const cacheKey = `${params.job_title}::${(params.job_skills || []).slice(0, 3).join(",")}::${params.resume_intelligence?.primaryRole || "none"}`;

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

  const clearResult = useCallback(() => setResult(null), []);

  const downloadAsPdf = useCallback((data: TailoredResumeData, jobTitle: string, company: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const sectionsHtml = data.sections.map(s => {
      const itemsHtml = s.items.map(item => {
        const header = `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;">
          <div><strong>${item.heading}</strong>${item.subheading ? ` — <span style="color:#555">${item.subheading}</span>` : ""}</div>
          ${item.date ? `<span style="color:#777;font-size:10pt;white-space:nowrap">${item.date}</span>` : ""}
        </div>`;
        const bullets = (item.bullets || []).map(b => `<li style="margin-bottom:3px">${b}</li>`).join("");
        return `${header}${bullets ? `<ul style="margin:4px 0 10px 18px;padding:0">${bullets}</ul>` : ""}`;
      }).join("");
      return `<h2 style="font-size:12pt;text-transform:uppercase;letter-spacing:1px;border-bottom:1.5px solid #333;padding-bottom:3px;margin:16px 0 8px;color:#222">${s.title}</h2>${itemsHtml}`;
    }).join("");

    const skillsHtml = data.skills_section.length > 0
      ? `<h2 style="font-size:12pt;text-transform:uppercase;letter-spacing:1px;border-bottom:1.5px solid #333;padding-bottom:3px;margin:16px 0 8px;color:#222">Skills</h2><p style="margin:0">${data.skills_section.join(" • ")}</p>`
      : "";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Resume - ${company}</title>
<style>@media print{@page{margin:0.7in 0.8in;}}body{font-family:Calibri,'Segoe UI',Arial,sans-serif;font-size:10.5pt;line-height:1.45;color:#1a1a1a;max-width:700px;margin:0 auto;padding:30px;}h2{font-family:Calibri,Arial,sans-serif;}ul{list-style-type:disc;}</style>
</head><body>
<p style="font-size:10pt;color:#555;margin-bottom:14px">${data.summary}</p>
${sectionsHtml}
${skillsHtml}
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}</script>
</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  }, []);

  const downloadAsDoc = useCallback((data: TailoredResumeData, jobTitle: string, company: string) => {
    const sectionsHtml = data.sections.map(s => {
      const itemsHtml = s.items.map(item => {
        const bullets = (item.bullets || []).map(b => `<li>${b}</li>`).join("");
        return `<p><strong>${item.heading}</strong>${item.subheading ? ` — ${item.subheading}` : ""}${item.date ? ` | ${item.date}` : ""}</p>${bullets ? `<ul>${bullets}</ul>` : ""}`;
      }).join("");
      return `<h2>${s.title}</h2>${itemsHtml}`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;color:#222;}h2{font-size:12pt;border-bottom:1px solid #999;}</style></head><body>
<p><em>${data.summary}</em></p>${sectionsHtml}
<h2>Skills</h2><p>${data.skills_section.join(" • ")}</p>
</body></html>`;

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

  return { generate, isGenerating, result, clearResult, downloadAsPdf, downloadAsDoc };
}
