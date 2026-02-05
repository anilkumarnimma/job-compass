 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { Job } from "@/types/job";
 import { toast } from "sonner";
 
interface JobFormData {
  title: string;
  company: string;
  company_logo?: string | null;
  location: string;
  description: string;
  skills: string[];
  external_apply_link: string;
  is_published: boolean;
  is_reviewing: boolean;
  salary_range?: string | null;
  employment_type: string;
  experience_years?: string | null;
}
 
function parseJob(row: any): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    company_logo: row.company_logo,
    location: row.location,
    description: row.description,
    skills: row.skills || [],
    external_apply_link: row.external_apply_link,
    is_published: row.is_published,
    is_reviewing: row.is_reviewing,
    salary_range: row.salary_range,
    employment_type: row.employment_type || 'Full Time',
    experience_years: row.experience_years,
    posted_date: new Date(row.posted_date),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}
 
 export function useAdminJobs() {
   return useQuery({
     queryKey: ["admin-jobs"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("jobs")
         .select("*")
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       return (data || []).map(parseJob);
     },
   });
 }
 
 export function useCreateJob() {
   const queryClient = useQueryClient();
 
   return useMutation({
    mutationFn: async (data: JobFormData) => {
      const { error } = await supabase.from("jobs").insert({
        title: data.title,
        company: data.company,
        company_logo: data.company_logo || null,
        location: data.location,
        description: data.description,
        skills: data.skills,
        external_apply_link: data.external_apply_link,
        is_published: data.is_published,
        is_reviewing: data.is_reviewing,
        salary_range: data.salary_range || null,
        employment_type: data.employment_type,
        experience_years: data.experience_years || null,
      });

      if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
       queryClient.invalidateQueries({ queryKey: ["jobs"] });
       toast.success("Job created successfully!");
     },
     onError: (error) => {
       toast.error("Failed to create job: " + error.message);
     },
   });
 }
 
 export function useUpdateJob() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ id, data }: { id: string; data: Partial<JobFormData> }) => {
       const { error } = await supabase
         .from("jobs")
         .update(data)
         .eq("id", id);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
       queryClient.invalidateQueries({ queryKey: ["jobs"] });
       toast.success("Job updated successfully!");
     },
     onError: (error) => {
       toast.error("Failed to update job: " + error.message);
     },
   });
 }
 
 export function useDeleteJob() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase
         .from("jobs")
         .delete()
         .eq("id", id);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
       queryClient.invalidateQueries({ queryKey: ["jobs"] });
       toast.success("Job deleted successfully!");
     },
     onError: (error) => {
       toast.error("Failed to delete job: " + error.message);
     },
   });
 }
 
 export function useUploadLogo() {
   return useMutation({
     mutationFn: async (file: File) => {
       const fileExt = file.name.split(".").pop();
       const fileName = `${crypto.randomUUID()}.${fileExt}`;
 
       const { error: uploadError } = await supabase.storage
         .from("company-logos")
         .upload(fileName, file);
 
       if (uploadError) throw uploadError;
 
       const { data } = supabase.storage
         .from("company-logos")
         .getPublicUrl(fileName);
 
       return data.publicUrl;
     },
     onError: (error) => {
       toast.error("Failed to upload logo: " + error.message);
     },
   });
 }