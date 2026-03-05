import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";

export interface AtsCheckResult {
  overall_score: number;
  keyword_match_score: number;
  experience_match_score: number;
  skills_match_score: number;
  education_match_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  strengths: string[];
  improvements: string[];
  verdict: "strong_match" | "good_match" | "moderate_match" | "weak_match";
  summary: string;
}

export function useAtsCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<AtsCheckResult | null>(null);
  const { profile } = useProfile();
  const { toast } = useToast();

  const runCheck = async (params: {
    job_description?: string;
    job_title?: string;
    job_skills?: string[];
  }): Promise<AtsCheckResult | null> => {
    if (!profile) {
      toast({ title: "Profile required", description: "Please complete your profile before running an ATS check.", variant: "destructive" });
      return null;
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("ats-check", {
        body: {
          job_description: params.job_description || "",
          job_title: params.job_title || "",
          job_skills: params.job_skills || [],
          profile: {
            skills: profile.skills,
            experience_years: profile.experience_years,
            current_title: profile.current_title,
            current_company: profile.current_company,
            work_experience: profile.work_experience,
            education: profile.education,
            certifications: profile.certifications,
          },
        },
      });

      if (error) throw new Error(error.message || "ATS check failed");
      if (data?.error) throw new Error(data.error);

      const atsResult = data.result as AtsCheckResult;
      setResult(atsResult);
      return atsResult;
    } catch (err: any) {
      toast({
        title: "ATS Check failed",
        description: err.message || "Could not complete the analysis",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsChecking(false);
    }
  };

  const clearResult = () => setResult(null);

  return { runCheck, isChecking, result, clearResult };
}
