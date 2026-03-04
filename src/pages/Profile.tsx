import { useState, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useProfile, ProfileData, WorkExperience, Education } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useResumeParser, ExtractedResumeData } from "@/hooks/useResumeParser";
import { useUserRole, useAllUserRoles } from "@/hooks/usePermissions";
import { ResumeReviewDialog } from "@/components/ResumeReviewDialog";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  User, FileText, Upload, Download, Trash2, Loader2, Bug,
  Link2, Briefcase, GraduationCap, Sparkles, Plus, Wand2, Award, Pencil, X,
} from "lucide-react";

const WORK_AUTH_OPTIONS = [
  "US Citizen", "Permanent Resident (Green Card)", "H-1B", "OPT / CPT",
  "TN Visa", "L-1 Visa", "Other Work Visa", "Not Authorized",
];
const VISA_STATUS_OPTIONS = ["Not Applicable", "Have visa", "Need sponsorship", "Will need sponsorship in future"];
const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Other", "Prefer not to say"];
const RACE_ETHNICITY_OPTIONS = [
  "American Indian or Alaska Native", "Asian", "Black or African American",
  "Native Hawaiian or Other Pacific Islander", "White", "Two or More Races", "Prefer not to say",
];
const HISPANIC_LATINO_OPTIONS = ["Yes", "No", "Prefer not to say"];
const VETERAN_OPTIONS = [
  "I am not a protected veteran",
  "I identify as one or more of the classifications of a protected veteran",
  "Prefer not to say",
];
const DISABILITY_OPTIONS = [
  "Yes, I have a disability (or previously had a disability)",
  "No, I do not have a disability",
  "Prefer not to say",
];
const MILITARY_OPTIONS = ["Yes", "No", "Prefer not to say"];

const emptyWork: WorkExperience = { title: "", company: "", start_date: "", end_date: "", is_current: false };
const emptyEdu: Education = { school: "", degree: "", major: "", graduation_year: "" };

interface Certification {
  name: string;
  issuer: string;
  date_obtained: string;
  expiration_date: string;
}
const emptyCert: Certification = { name: "", issuer: "", date_obtained: "", expiration_date: "" };

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading, updateProfile, isUpdating, uploadResume, downloadResume, deleteResume, isUploading } = useProfile();
  const { toast } = useToast();
  const { parseResume, isParsing, extractedData, clearExtracted } = useResumeParser();
  const { data: effectiveRole, isLoading: roleLoading } = useUserRole();
  const { data: allRoles } = useAllUserRoles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reuploadRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    first_name: "", last_name: "", contact_email: "", phone: "", address: "", city: "", state: "", zip: "",
    linkedin_url: "", github_url: "", portfolio_url: "",
    work_authorization: "", visa_status: "",
    experience_years: "" as string | number,
    current_company: "", current_title: "", skills: "",
    gender: "", race_ethnicity: "", hispanic_latino: "",
    veteran_status: "", disability_status: "", military_service: "",
  });

  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([{ ...emptyWork }]);
  const [educations, setEducations] = useState<Education[]>([{ ...emptyEdu }]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [isDownloadingResume, setIsDownloadingResume] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{ label: string; field: string; oldValue: string; newValue: string }[]>([]);
  const [pendingExtracted, setPendingExtracted] = useState<ExtractedResumeData | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [editingSections, setEditingSections] = useState<Record<string, boolean>>({});

  const toggleEdit = (section: string) => setEditingSections(prev => ({ ...prev, [section]: !prev[section] }));
  const isEditing = (section: string) => !!editingSections[section];

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || "", last_name: profile.last_name || "",
        contact_email: (profile as any).contact_email || "",
        phone: profile.phone || "", address: (profile as any).address || "",
        city: profile.city || "", state: profile.state || "", zip: profile.zip || "",
        linkedin_url: profile.linkedin_url || "", github_url: profile.github_url || "",
        portfolio_url: profile.portfolio_url || "",
        work_authorization: profile.work_authorization || "", visa_status: profile.visa_status || "",
        experience_years: profile.experience_years ?? "",
        current_company: profile.current_company || "", current_title: profile.current_title || "",
        skills: (profile.skills || []).join(", "),
        gender: (profile as any).gender || "", race_ethnicity: (profile as any).race_ethnicity || "",
        hispanic_latino: (profile as any).hispanic_latino || "",
        veteran_status: (profile as any).veteran_status || "",
        disability_status: (profile as any).disability_status || "",
        military_service: (profile as any).military_service || "",
      });
      const we = profile.work_experience;
      if (Array.isArray(we) && we.length > 0) setWorkExperiences(we);
      else if (profile.current_title || profile.current_company) {
        setWorkExperiences([{ title: profile.current_title || "", company: profile.current_company || "", start_date: "", end_date: "", is_current: true }]);
      } else setWorkExperiences([{ ...emptyWork }]);
      const edu = profile.education;
      if (Array.isArray(edu) && edu.length > 0) setEducations(edu);
      else setEducations([{ ...emptyEdu }]);
      const certs = (profile as any).certifications;
      if (Array.isArray(certs) && certs.length > 0) setCertifications(certs);
    }
  }, [profile]);

  if (authLoading) {
    return (<div className="min-h-screen bg-background"><Header /><main className="container max-w-3xl mx-auto px-4 py-8"><Skeleton className="h-8 w-48 mb-6" /><Skeleton className="h-96 w-full" /></main></div>);
  }
  if (!user) return <Navigate to="/auth" replace />;

  const set = (key: string, value: string) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    const skillsArray = formData.skills ? formData.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const currentWork = workExperiences.find((w) => w.is_current);
    updateProfile({
      first_name: formData.first_name || null, last_name: formData.last_name || null,
      full_name: [formData.first_name, formData.last_name].filter(Boolean).join(" ") || null,
      contact_email: formData.contact_email || null,
      phone: formData.phone || null, address: formData.address || null,
      city: formData.city || null, state: formData.state || null, zip: formData.zip || null,
      location: [formData.city, formData.state].filter(Boolean).join(", ") || null,
      linkedin_url: formData.linkedin_url || null, github_url: formData.github_url || null,
      portfolio_url: formData.portfolio_url || null,
      work_authorization: formData.work_authorization || null, visa_status: formData.visa_status || null,
      experience_years: formData.experience_years ? Number(formData.experience_years) : null,
      current_company: currentWork?.company || formData.current_company || null,
      current_title: currentWork?.title || formData.current_title || null,
      skills: skillsArray,
      work_experience: workExperiences.filter((w) => w.title || w.company),
      education: educations.filter((e) => e.school || e.degree),
      certifications: certifications.filter((c) => c.name),
      gender: formData.gender || null, race_ethnicity: formData.race_ethnicity || null,
      hispanic_latino: formData.hispanic_latino || null, veteran_status: formData.veteran_status || null,
      disability_status: formData.disability_status || null, military_service: formData.military_service || null,
    } as any);
  };

  // First-time upload: upload + autofill
  const handleFirstUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    const extracted = await parseResume(file);
    if (!extracted) return;
    buildReviewChanges(extracted);
  };

  // Re-upload: replace resume + autofill
  const handleReupload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadResume(file);
    setPendingFile(null);
    const extracted = await parseResume(file);
    if (!extracted) return;
    buildReviewChanges(extracted);
  };

  // Autofill again using existing stored resume
  const handleAutofillExisting = async () => {
    if (!profile?.resume_url || !user) return;
    setIsDownloadingResume(true);
    try {
      const { data, error } = await supabase.storage.from("resumes").download(profile.resume_url);
      if (error) throw error;
      const file = new File([data], profile.resume_filename || "resume.pdf", { type: data.type });
      const extracted = await parseResume(file);
      if (!extracted) return;
      buildReviewChanges(extracted);
    } catch (err: any) {
      toast({ title: "Failed to read resume", description: err.message, variant: "destructive" });
    } finally {
      setIsDownloadingResume(false);
    }
  };

  const buildReviewChanges = (extracted: ExtractedResumeData) => {
    const changes: { label: string; field: string; oldValue: string; newValue: string }[] = [];
    const fieldMap: { field: string; label: string; extractedKey: keyof ExtractedResumeData; currentValue: string }[] = [
      { field: "first_name", label: "First Name", extractedKey: "first_name", currentValue: formData.first_name },
      { field: "last_name", label: "Last Name", extractedKey: "last_name", currentValue: formData.last_name },
      { field: "contact_email", label: "Contact Email", extractedKey: "email", currentValue: formData.contact_email },
      { field: "phone", label: "Phone", extractedKey: "phone", currentValue: formData.phone },
      { field: "city", label: "City", extractedKey: "city", currentValue: formData.city },
      { field: "state", label: "State", extractedKey: "state", currentValue: formData.state },
      { field: "zip", label: "ZIP Code", extractedKey: "zip", currentValue: formData.zip },
      { field: "address", label: "Address", extractedKey: "address", currentValue: formData.address },
      { field: "linkedin_url", label: "LinkedIn URL", extractedKey: "linkedin_url", currentValue: formData.linkedin_url },
      { field: "github_url", label: "GitHub URL", extractedKey: "github_url", currentValue: formData.github_url },
      { field: "portfolio_url", label: "Portfolio URL", extractedKey: "portfolio_url", currentValue: formData.portfolio_url },
    ];

    for (const fm of fieldMap) {
      const newVal = extracted[fm.extractedKey] as string | undefined;
      if (newVal && newVal !== fm.currentValue) {
        changes.push({ label: fm.label, field: fm.field, oldValue: fm.currentValue, newValue: newVal });
      }
    }

    if (extracted.skills && extracted.skills.length > 0) {
      const newSkills = extracted.skills.join(", ");
      if (newSkills !== formData.skills) {
        changes.push({ label: "Skills", field: "skills", oldValue: formData.skills, newValue: newSkills });
      }
    }

    if (extracted.experience_years != null) {
      const newVal = String(extracted.experience_years);
      const oldVal = String(formData.experience_years);
      if (newVal !== oldVal) {
        changes.push({ label: "Years of Experience", field: "experience_years", oldValue: oldVal, newValue: newVal });
      }
    }

    if (extracted.work_experience && extracted.work_experience.length > 0) {
      const summary = extracted.work_experience.map(w => `${w.title} @ ${w.company}`).join("; ");
      const oldSummary = workExperiences.filter(w => w.title || w.company).map(w => `${w.title} @ ${w.company}`).join("; ");
      if (summary !== oldSummary) {
        changes.push({ label: "Work Experience", field: "work_experience", oldValue: oldSummary || "(empty)", newValue: summary });
      }
    }

    if (extracted.education && extracted.education.length > 0) {
      const summary = extracted.education.map(e => `${e.degree || ""} ${e.major || ""} @ ${e.school}`).join("; ");
      const oldSummary = educations.filter(e => e.school || e.degree).map(e => `${e.degree} ${e.major} @ ${e.school}`).join("; ");
      if (summary !== oldSummary) {
        changes.push({ label: "Education", field: "education", oldValue: oldSummary || "(empty)", newValue: summary });
      }
    }

    if (extracted.certifications && extracted.certifications.length > 0) {
      const summary = extracted.certifications.map(c => c.name).join(", ");
      changes.push({ label: "Certifications", field: "certifications", oldValue: "", newValue: summary });
    }

    setPendingExtracted(extracted);
    setPendingChanges(changes);
    setShowReview(true);
  };

  const applyExtracted = async () => {
    if (!pendingExtracted) return;
    const e = pendingExtracted;
    const filled = new Set<string>();

    const updates: Record<string, string> = {};
    const simpleFields = ["first_name", "last_name", "phone", "city", "state", "zip", "address", "linkedin_url", "github_url", "portfolio_url"] as const;
    // Map extracted email to contact_email
    if (e.email) {
      setFormData(prev => ({ ...prev, contact_email: e.email as string }));
    }
    for (const f of simpleFields) {
      if (e[f]) { updates[f] = e[f] as string; filled.add(f); }
    }
    if (Object.keys(updates).length > 0) setFormData(prev => ({ ...prev, ...updates }));

    if (e.skills && e.skills.length > 0) {
      setFormData(prev => ({ ...prev, skills: e.skills!.join(", ") }));
      filled.add("skills");
    }
    if (e.experience_years != null) {
      setFormData(prev => ({ ...prev, experience_years: e.experience_years! }));
      filled.add("experience_years");
    }
    if (e.work_experience && e.work_experience.length > 0) {
      setWorkExperiences(e.work_experience.map(w => ({
        title: w.title || "", company: w.company || "",
        start_date: w.start_date || "", end_date: w.end_date || "",
        is_current: w.is_current || false,
      })));
      filled.add("work_experience");
    }
    if (e.education && e.education.length > 0) {
      setEducations(e.education.map(ed => ({
        school: ed.school || "", degree: ed.degree || "",
        major: ed.major || "", graduation_year: ed.graduation_year || "",
      })));
      filled.add("education");
    }
    if (e.certifications && e.certifications.length > 0) {
      setCertifications(e.certifications.map(c => ({
        name: c.name || "", issuer: c.issuer || "",
        date_obtained: c.date_obtained || "", expiration_date: c.expiration_date || "",
      })));
      filled.add("certifications");
    }

    setShowReview(false);

    // Upload the file as resume if we have a pending file (first-time flow)
    if (pendingFile) {
      await uploadResume(pendingFile);
      setPendingFile(null);
    }
  };

  // Helpers
  const updateWork = (i: number, f: keyof WorkExperience, v: string | boolean) => setWorkExperiences(p => p.map((w, idx) => idx === i ? { ...w, [f]: v } : w));
  const addWork = () => setWorkExperiences(p => [...p, { ...emptyWork }]);
  const removeWork = (i: number) => { if (workExperiences.length > 1) setWorkExperiences(p => p.filter((_, idx) => idx !== i)); };
  const updateEdu = (i: number, f: keyof Education, v: string) => setEducations(p => p.map((e, idx) => idx === i ? { ...e, [f]: v } : e));
  const addEdu = () => setEducations(p => [...p, { ...emptyEdu }]);
  const removeEdu = (i: number) => { if (educations.length > 1) setEducations(p => p.filter((_, idx) => idx !== i)); };
  const updateCert = (i: number, f: keyof Certification, v: string) => setCertifications(p => p.map((c, idx) => idx === i ? { ...c, [f]: v } : c));
  const addCert = () => setCertifications(p => [...p, { ...emptyCert }]);
  const removeCert = (i: number) => setCertifications(p => p.filter((_, idx) => idx !== i));


  const SaveButton = () => (
    <div className="flex justify-end pt-4">
      <Button onClick={handleSave} disabled={isUpdating}>
        {isUpdating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">My Profile</h1>

        <div className="space-y-6">
          {/* 1. Resume Upload / Auto-Fill */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Start by Uploading Your Resume</CardTitle>
              </div>
              <CardDescription>Upload your resume to automatically fill your profile details.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-24 w-full" /> : (
                <div className="space-y-4">
                  <input type="file" ref={fileInputRef} accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFirstUpload} className="hidden" />
                  <input type="file" ref={reuploadRef} accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleReupload} className="hidden" />

                  {profile?.resume_filename ? (
                    <>
                      <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">{profile.resume_filename}</p>
                            <p className="text-sm text-muted-foreground">Uploaded resume</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={downloadResume}>
                          <Download className="h-4 w-4 mr-1" /> Download
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleAutofillExisting} disabled={isParsing || isDownloadingResume} className="flex-1">
                          {isParsing || isDownloadingResume ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Parsing Resume...</> : <><Wand2 className="h-4 w-4 mr-2" />Auto-fill from Resume</>}
                        </Button>
                        <Button variant="outline" onClick={() => reuploadRef.current?.click()} disabled={isUploading || isParsing}>
                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-1" />Re-upload</>}
                        </Button>
                        <Button variant="ghost" onClick={deleteResume} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors">
                        {isUploading || isParsing ? (
                          <><Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-3" /><p className="text-muted-foreground">{isParsing ? "Parsing..." : "Uploading..."}</p></>
                        ) : (
                          <><Upload className="h-10 w-10 text-muted-foreground mb-3" /><p className="font-medium text-foreground">Click to upload resume</p><p className="text-sm text-muted-foreground mt-1">PDF or DOCX — will auto-fill your profile</p></>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Personal Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Personal Details</CardTitle>
              </div>
              <CardDescription>Name, contact, and address details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input id="first_name" placeholder="John" value={formData.first_name} onChange={(e) => set("first_name", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input id="last_name" placeholder="Doe" value={formData.last_name} onChange={(e) => set("last_name", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Contact Email</Label>
                      <Input id="contact_email" placeholder="email@example.com" value={formData.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
                      <p className="text-xs text-muted-foreground">Used for job applications and autofill</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" placeholder="+1 (555) 123-4567" value={formData.phone} onChange={(e) => set("phone", e.target.value)} />
                    </div>
                  </div>
                  {formData.contact_email && formData.contact_email !== (profile?.email || user.email || "") && (
                    <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 p-2 rounded">
                      Job applications will use <strong>{formData.contact_email}</strong>. Your account uses <strong>{profile?.email || user.email}</strong>.
                    </p>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input id="address" placeholder="123 Main St, Apt 4B" value={formData.address} onChange={(e) => set("address", e.target.value)} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" placeholder="San Francisco" value={formData.city} onChange={(e) => set("city", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input id="state" placeholder="CA" value={formData.state} onChange={(e) => set("state", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input id="zip" placeholder="94102" value={formData.zip} onChange={(e) => set("zip", e.target.value)} />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 3. Professional Links */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Professional Links</CardTitle>
              </div>
              <CardDescription>LinkedIn, GitHub, and portfolio URLs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn URL</Label>
                    <Input id="linkedin" placeholder="https://linkedin.com/in/username" value={formData.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="github">GitHub URL</Label>
                      <Input id="github" placeholder="https://github.com/username" value={formData.github_url} onChange={(e) => set("github_url", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portfolio">Portfolio URL</Label>
                      <Input id="portfolio" placeholder="https://mysite.com" value={formData.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 4. Work Experience */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Work Experience</CardTitle>
                  </div>
                  <CardDescription className="mt-1.5">Add your work history with dates</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addWork} type="button"><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                <>
                  {workExperiences.map((work, idx) => (
                    <div key={idx} className="space-y-4 p-4 rounded-lg border border-border bg-secondary/20 relative">
                      {workExperiences.length > 1 && (
                        <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-destructive hover:text-destructive h-8 w-8 p-0" onClick={() => removeWork(idx)} type="button">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2"><Label>Job Title</Label><Input placeholder="Software Engineer" value={work.title} onChange={(e) => updateWork(idx, "title", e.target.value)} /></div>
                        <div className="space-y-2"><Label>Company</Label><Input placeholder="Acme Inc." value={work.company} onChange={(e) => updateWork(idx, "company", e.target.value)} /></div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2"><Label>Start Date</Label><Input type="month" value={work.start_date} onChange={(e) => updateWork(idx, "start_date", e.target.value)} /></div>
                        <div className="space-y-2"><Label>End Date</Label><Input type="month" value={work.end_date} onChange={(e) => updateWork(idx, "end_date", e.target.value)} disabled={work.is_current} placeholder={work.is_current ? "Present" : ""} /></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id={`current-${idx}`} checked={work.is_current} onCheckedChange={(checked) => updateWork(idx, "is_current", !!checked)} />
                        <Label htmlFor={`current-${idx}`} className="text-sm cursor-pointer">I currently work here</Label>
                      </div>
                    </div>
                  ))}
                  <div className="grid gap-4 sm:grid-cols-3 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="experience_years">Years of Experience</Label>
                      <Input id="experience_years" type="number" min={0} placeholder="5" value={formData.experience_years} onChange={(e) => set("experience_years", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Work Authorization</Label>
                      <Select value={formData.work_authorization} onValueChange={(v) => set("work_authorization", v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{WORK_AUTH_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Visa Sponsorship</Label>
                      <Select value={formData.visa_status} onValueChange={(v) => set("visa_status", v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{VISA_STATUS_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 5. Education */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Education</CardTitle>
                  </div>
                  <CardDescription className="mt-1.5">Add your education history</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addEdu} type="button"><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                <>
                  {educations.map((edu, idx) => (
                    <div key={idx} className="space-y-4 p-4 rounded-lg border border-border bg-secondary/20 relative">
                      {educations.length > 1 && (
                        <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-destructive hover:text-destructive h-8 w-8 p-0" onClick={() => removeEdu(idx)} type="button"><Trash2 className="h-4 w-4" /></Button>
                      )}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2"><Label>School / University</Label><Input placeholder="MIT" value={edu.school} onChange={(e) => updateEdu(idx, "school", e.target.value)} /></div>
                        <div className="space-y-2"><Label>Degree</Label><Input placeholder="Bachelor's" value={edu.degree} onChange={(e) => updateEdu(idx, "degree", e.target.value)} /></div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2"><Label>Major / Field of Study</Label><Input placeholder="Computer Science" value={edu.major} onChange={(e) => updateEdu(idx, "major", e.target.value)} /></div>
                        <div className="space-y-2"><Label>Graduation Year</Label><Input placeholder="2023" value={edu.graduation_year} onChange={(e) => updateEdu(idx, "graduation_year", e.target.value)} /></div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* 6. Skills */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Skills</CardTitle>
              </div>
              <CardDescription>Comma-separated list of your key skills</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? <Skeleton className="h-10 w-full" /> : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="skills">Skills</Label>
                    <Input id="skills" placeholder="React, TypeScript, Node.js, AWS" value={formData.skills} onChange={(e) => set("skills", e.target.value)} />
                  </div>
                  {formData.skills && (
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.split(",").map((s) => s.trim()).filter(Boolean).map((skill, i) => (
                        <Badge key={i} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* 7. Certifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Certifications</CardTitle>
                  </div>
                  <CardDescription className="mt-1.5">Professional certifications (optional)</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addCert} type="button"><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {certifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No certifications added. Click "Add" to add one.</p>
              ) : (
                certifications.map((cert, idx) => (
                  <div key={idx} className="space-y-4 p-4 rounded-lg border border-border bg-secondary/20 relative">
                    <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-destructive hover:text-destructive h-8 w-8 p-0" onClick={() => removeCert(idx)} type="button"><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2"><Label>Certification Name</Label><Input placeholder="AWS Solutions Architect" value={cert.name} onChange={(e) => updateCert(idx, "name", e.target.value)} /></div>
                      <div className="space-y-2"><Label>Issuer</Label><Input placeholder="Amazon Web Services" value={cert.issuer} onChange={(e) => updateCert(idx, "issuer", e.target.value)} /></div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2"><Label>Date Obtained</Label><Input type="month" value={cert.date_obtained} onChange={(e) => updateCert(idx, "date_obtained", e.target.value)} /></div>
                      <div className="space-y-2"><Label>Expiration Date (optional)</Label><Input type="month" value={cert.expiration_date} onChange={(e) => updateCert(idx, "expiration_date", e.target.value)} /></div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 8. EEO / Demographics */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Equal Opportunity (Optional)</CardTitle>
              </div>
              <CardDescription>Voluntary self-identification — used for autofill on job applications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={formData.gender} onValueChange={(v) => set("gender", v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{GENDER_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Race / Ethnicity</Label>
                      <Select value={formData.race_ethnicity} onValueChange={(v) => set("race_ethnicity", v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{RACE_ETHNICITY_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Hispanic or Latino</Label>
                      <Select value={formData.hispanic_latino} onValueChange={(v) => set("hispanic_latino", v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{HISPANIC_LATINO_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Veteran Status</Label>
                      <Select value={formData.veteran_status} onValueChange={(v) => set("veteran_status", v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{VETERAN_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Disability Status</Label>
                      <Select value={formData.disability_status} onValueChange={(v) => set("disability_status", v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{DISABILITY_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Have you served in the military?</Label>
                      <Select value={formData.military_service} onValueChange={(v) => set("military_service", v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{MILITARY_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          {/* Account / Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Account / Security</CardTitle>
              </div>
              <CardDescription>Login and billing email (read-only)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account_email">Account Email</Label>
                <Input id="account_email" value={profile?.email || user.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Used for login, authentication, and billing. Cannot be changed here.</p>
              </div>
            </CardContent>
          </Card>

          {/* Final Save */}
          <SaveButton />

          {/* Debug Role Section */}
          <Card className="border-dashed border-accent/50 bg-accent/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-accent" />
                <CardTitle className="text-lg text-accent-foreground">Debug: Role Information</CardTitle>
              </div>
              <CardDescription>Temporary debug section - shows your current role(s)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {roleLoading ? <Skeleton className="h-8 w-32" /> : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Effective Role:</span>
                    <Badge variant={effectiveRole === "founder" ? "default" : effectiveRole === "employer" ? "secondary" : "outline"}>{effectiveRole || "user"}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">All Assigned Roles:</span>
                    {allRoles && allRoles.length > 0 ? allRoles.map((r, i) => <Badge key={i} variant="outline" className="text-xs">{r.role}</Badge>) : <Badge variant="outline">user (default)</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">User ID: {user?.id}</div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <ResumeReviewDialog open={showReview} onOpenChange={setShowReview} changes={pendingChanges} onApply={applyExtracted} />
    </div>
  );
}
