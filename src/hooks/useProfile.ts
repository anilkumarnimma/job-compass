import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ResumeIntelligence } from "@/hooks/useResumeIntelligence";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface WorkExperience {
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface Education {
  school: string;
  degree: string;
  major: string;
  graduation_year: string;
}

export interface ProfileData {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  work_authorization: string | null;
  country: string | null;
  visa_status: string | null;
  experience_years: number | null;
  current_company: string | null;
  current_title: string | null;
  skills: string[] | null;
  work_experience: WorkExperience[] | null;
  education: Education[] | null;
  certifications: { name: string; issuer: string; date_obtained: string; expiration_date: string }[] | null;
  resume_url: string | null;
  resume_filename: string | null;
  is_premium: boolean;
  avatar_url: string | null;
  emoji_avatar: string | null;
  gender: string | null;
  race_ethnicity: string | null;
  hispanic_latino: string | null;
  veteran_status: string | null;
  disability_status: string | null;
  military_service: string | null;
  resume_intelligence: ResumeIntelligence | null;
}

export function useProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw error;
      return data as unknown as ProfileData;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    refetchOnWindowFocus: true,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<ProfileData>) => {
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("profiles")
        .update(updates as any)
        .eq("user_id", user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadResume = async (file: File, options?: { silent?: boolean }) => {
    if (!user) throw new Error("Not authenticated");
    const silent = options?.silent ?? false;
    
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, DOC, or DOCX file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const filePath = `${user.id}/${file.name}`;
      
      if (profile?.resume_url) {
        const oldPath = profile.resume_url.split("/").slice(-2).join("/");
        await supabase.storage.from("resumes").remove([oldPath]);
      }
      
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Clear old resume intelligence immediately so stale recommendations don't persist
      await updateProfileMutation.mutateAsync({
        resume_url: filePath,
        resume_filename: file.name,
        resume_intelligence: null,
      });

      // Aggressively invalidate all dependent caches
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["recommended-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job-matches"] });
      queryClient.invalidateQueries({ queryKey: ["job-search"] });
      
      if (!silent) {
        toast({
          title: "Resume uploaded",
          description: "Your resume has been saved.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadResume = async () => {
    if (!profile?.resume_url || !user) return;
    
    try {
      const { data, error } = await supabase.storage
        .from("resumes")
        .download(profile.resume_url);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = profile.resume_filename || "resume.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteResume = async () => {
    if (!profile?.resume_url || !user) return;
    
    try {
      const { error } = await supabase.storage
        .from("resumes")
        .remove([profile.resume_url]);
      
      if (error) throw error;
      
      await updateProfileMutation.mutateAsync({
        resume_url: null,
        resume_filename: null,
      });
      
      toast({
        title: "Resume deleted",
        description: "Your resume has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    profile,
    isLoading,
    updateProfile: updateProfileMutation.mutate,
    updateProfileAsync: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
    uploadResume,
    downloadResume,
    deleteResume,
    isUploading,
  };
}
