import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";

export interface InterviewPrepData {
  keySkills: string[];
  resumeMatch: {
    strengths: string[];
    gaps: string[];
    matchSummary: string;
  };
  technicalQuestions: {
    question: string;
    suggestedAnswer: string;
    difficulty: "easy" | "medium" | "hard";
  }[];
  behavioralQuestions: {
    question: string;
    suggestedAnswer: string;
    tip: string;
  }[];
  tailoredAnswers: {
    question: string;
    answer: string;
  }[];
  studyTopics: string[];
  interviewTips: string[];
}

export function useInterviewPrep() {
  const [prep, setPrep] = useState<InterviewPrepData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generatePrep = useCallback(async (params: {
    job_title: string;
    job_description: string;
    job_skills: string[];
    resume_intelligence?: ResumeIntelligence | null;
  }) => {
    setIsLoading(true);
    setPrep(null);

    try {
      const { data, error } = await supabase.functions.invoke("interview-prep", {
        body: params,
      });

      if (error) throw error;
      if (data?.prep) {
        setPrep(data.prep);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error("Interview prep error:", err);
      toast({
        title: "Couldn't generate interview prep",
        description: err?.message || "Try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const clearPrep = useCallback(() => {
    setPrep(null);
  }, []);

  return { prep, isLoading, generatePrep, clearPrep };
}
