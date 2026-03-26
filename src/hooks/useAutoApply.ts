import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Job } from "@/types/job";

export function useAutoApply() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();

  const triggerAutoApply = useCallback(async (job: Job) => {
    if (!user || !profile) {
      toast({ title: "Please sign in and complete your profile", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    // Open blank tab synchronously to avoid popup blocker
    const newTab = window.open("about:blank", "_blank");

    try {
      // Step 1: Generate tailored resume
      const tailorResp = await supabase.functions.invoke("tailor-resume", {
        body: {
          job_title: job.title,
          job_description: job.description,
          job_skills: job.skills,
          resume_intelligence: profile.resume_intelligence,
          base_resume: {
            header: {
              full_name: profile.full_name || "",
              contact_details: [profile.email, profile.phone, profile.linkedin_url, profile.location].filter(Boolean),
            },
            summary: (profile.resume_intelligence as any)?.strengthSummary || "",
            sections: (profile.work_experience as any[]) || [],
            skills_section: profile.skills || [],
          },
        },
      });

      // Step 2: Generate cover letter
      const coverResp = await supabase.functions.invoke("generate-cover-letter", {
        body: {
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.description,
          jobSkills: job.skills,
        },
      });

      // Step 3: Build profile data for autofill
      const profileData = {
        full_name: profile.full_name || "",
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.contact_email || profile.email || "",
        phone: profile.phone || "",
        location: profile.location || "",
        city: profile.city || "",
        state: profile.state || "",
        zip: profile.zip || "",
        linkedin_url: profile.linkedin_url || "",
        github_url: profile.github_url || "",
        portfolio_url: profile.portfolio_url || "",
        current_title: profile.current_title || "",
        current_company: profile.current_company || "",
        work_authorization: profile.work_authorization || "",
        visa_status: profile.visa_status || "",
        gender: profile.gender || "",
        race_ethnicity: profile.race_ethnicity || "",
        veteran_status: profile.veteran_status || "",
        disability_status: profile.disability_status || "",
      };

      // Step 4: Queue the auto-apply data
      const { error } = await supabase.functions.invoke("api-auto-apply", {
        body: {
          job_id: job.id,
          external_url: job.external_apply_link,
          tailored_resume: tailorResp.data || null,
          cover_letter: coverResp.data?.content || null,
          profile_data: profileData,
        },
      });

      if (error) throw error;

      // Step 5: Redirect the already-opened tab to the external apply page
      if (newTab && !newTab.closed) {
        newTab.location.href = job.external_apply_link;
      } else {
        window.open(job.external_apply_link, "_blank");
      }

      toast({
        title: "Auto Apply triggered ✨",
        description: `Resume & cover letter prepared for ${job.company}. Extension will autofill.`,
      });
    } catch (err: any) {
      console.error("Auto apply error:", err);
      // Close the blank tab on failure
      if (newTab && !newTab.closed) {
        newTab.close();
      }
      toast({
        title: "Auto Apply failed",
        description: err.message || "Could not prepare application data",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [user, profile, toast]);

  return { triggerAutoApply, isProcessing };
}
