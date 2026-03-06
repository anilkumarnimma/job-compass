import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";

export interface ResumeTip {
  tip: string;
  keyword: string;
  occurrences?: number;
}

export function useResumeTips() {
  const [tips, setTips] = useState<ResumeTip[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchTips = useCallback(async (params: {
    job_title: string;
    job_description: string;
    job_skills: string[];
    resume_intelligence: ResumeIntelligence;
  }) => {
    setIsLoading(true);
    setTips(null);

    try {
      const { data, error } = await supabase.functions.invoke("resume-tips", {
        body: params,
      });

      if (error) throw error;
      if (data?.tips) {
        setTips(data.tips);
      }
    } catch (err: any) {
      console.error("Resume tips error:", err);
      toast({
        title: "Couldn't generate tips",
        description: err?.message || "Try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const clearTips = useCallback(() => {
    setTips(null);
  }, []);

  return { tips, isLoading, fetchTips, clearTips };
}
