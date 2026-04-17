import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { scheduleFeedbackPrompt } from "@/hooks/useFeedbackPrompt";

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
    /** Override profile data with current form state (unsaved edits) */
    formProfile?: {
      skills?: string[] | null;
      experience_years?: number | null;
      current_title?: string | null;
      current_company?: string | null;
      work_experience?: any[] | null;
      education?: any[] | null;
      certifications?: any[] | null;
    };
  }): Promise<AtsCheckResult | null> => {
    if (!profile && !params.formProfile) {
      toast({ title: "Profile required", description: "Please complete your profile before running an ATS check.", variant: "destructive" });
      return null;
    }

    // Use form data if provided (unsaved edits), otherwise fall back to saved DB profile
    const profileSource = params.formProfile || profile;

    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("ats-check", {
        body: {
          job_description: params.job_description || "",
          job_title: params.job_title || "",
          job_skills: params.job_skills || [],
          profile: {
            skills: profileSource?.skills,
            experience_years: profileSource?.experience_years,
            current_title: profileSource?.current_title,
            current_company: profileSource?.current_company,
            work_experience: profileSource?.work_experience,
            education: profileSource?.education,
            certifications: profileSource?.certifications,
          },
        },
      });

      if (error) throw new Error(error.message || "ATS check failed");
      if (data?.error) throw new Error(data.error);

      const atsResult = data.result as AtsCheckResult;
      setResult(atsResult);
      // Schedule feedback prompt 5s after result appears
      scheduleFeedbackPrompt("ats", 5000);
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
