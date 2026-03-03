import { useState, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useProfile, ProfileData } from "@/hooks/useProfile";
import { useUserRole, useAllUserRoles } from "@/hooks/usePermissions";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User, FileText, Upload, Download, Trash2, Loader2, Bug,
  Link2, Briefcase, GraduationCap, Sparkles,
} from "lucide-react";

const WORK_AUTH_OPTIONS = [
  "US Citizen",
  "Permanent Resident (Green Card)",
  "H-1B",
  "OPT / CPT",
  "TN Visa",
  "L-1 Visa",
  "Other Work Visa",
  "Not Authorized",
];

const VISA_STATUS_OPTIONS = [
  "Not Applicable",
  "Have visa",
  "Need sponsorship",
  "Will need sponsorship in future",
];

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading, updateProfile, isUpdating, uploadResume, downloadResume, deleteResume, isUploading } = useProfile();
  const { data: effectiveRole, isLoading: roleLoading } = useUserRole();
  const { data: allRoles } = useAllUserRoles();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    city: "",
    state: "",
    zip: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
    work_authorization: "",
    visa_status: "",
    experience_years: "" as string | number,
    current_company: "",
    current_title: "",
    skills: "",
    education_school: "",
    education_degree: "",
    education_major: "",
    education_graduation_year: "",
  });

  useEffect(() => {
    if (profile) {
      const edu = profile.education || {};
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || "",
        city: profile.city || "",
        state: profile.state || "",
        zip: profile.zip || "",
        linkedin_url: profile.linkedin_url || "",
        github_url: profile.github_url || "",
        portfolio_url: profile.portfolio_url || "",
        work_authorization: profile.work_authorization || "",
        visa_status: profile.visa_status || "",
        experience_years: profile.experience_years ?? "",
        current_company: profile.current_company || "",
        current_title: profile.current_title || "",
        skills: (profile.skills || []).join(", "),
        education_school: edu.school || "",
        education_degree: edu.degree || "",
        education_major: edu.major || "",
        education_graduation_year: edu.graduation_year || "",
      });
    }
  }, [profile]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-3xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleSave = () => {
    const skillsArray = formData.skills
      ? formData.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    updateProfile({
      first_name: formData.first_name || null,
      last_name: formData.last_name || null,
      full_name: [formData.first_name, formData.last_name].filter(Boolean).join(" ") || null,
      phone: formData.phone || null,
      city: formData.city || null,
      state: formData.state || null,
      zip: formData.zip || null,
      location: [formData.city, formData.state].filter(Boolean).join(", ") || null,
      linkedin_url: formData.linkedin_url || null,
      github_url: formData.github_url || null,
      portfolio_url: formData.portfolio_url || null,
      work_authorization: formData.work_authorization || null,
      visa_status: formData.visa_status || null,
      experience_years: formData.experience_years ? Number(formData.experience_years) : null,
      current_company: formData.current_company || null,
      current_title: formData.current_title || null,
      skills: skillsArray,
      education: {
        school: formData.education_school,
        degree: formData.education_degree,
        major: formData.education_major,
        graduation_year: formData.education_graduation_year,
      },
    } as any);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadResume(file);
  };

  const set = (key: string, value: string) => setFormData((prev) => ({ ...prev, [key]: value }));

  const SaveButton = () => (
    <div className="flex justify-end pt-4">
      <Button onClick={handleSave} disabled={isUpdating}>
        {isUpdating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Changes"
        )}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">My Profile</h1>

        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </div>
              <CardDescription>Name, contact, and address details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
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
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={profile?.email || user.email || ""} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" placeholder="+1 (555) 123-4567" value={formData.phone} onChange={(e) => set("phone", e.target.value)} />
                    </div>
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
                  <SaveButton />
                </>
              )}
            </CardContent>
          </Card>

          {/* Links */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Links</CardTitle>
              </div>
              <CardDescription>LinkedIn, GitHub, and portfolio URLs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
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
                  <SaveButton />
                </>
              )}
            </CardContent>
          </Card>

          {/* Work Experience & Authorization */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Work</CardTitle>
              </div>
              <CardDescription>Current role, experience, and work authorization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="current_title">Current Title</Label>
                      <Input id="current_title" placeholder="Software Engineer" value={formData.current_title} onChange={(e) => set("current_title", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="current_company">Current Company</Label>
                      <Input id="current_company" placeholder="Acme Inc." value={formData.current_company} onChange={(e) => set("current_company", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="experience_years">Years of Experience</Label>
                      <Input id="experience_years" type="number" min={0} placeholder="5" value={formData.experience_years} onChange={(e) => set("experience_years", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Work Authorization</Label>
                      <Select value={formData.work_authorization} onValueChange={(v) => set("work_authorization", v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {WORK_AUTH_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Visa Sponsorship</Label>
                      <Select value={formData.visa_status} onValueChange={(v) => set("visa_status", v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {VISA_STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <SaveButton />
                </>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Skills</CardTitle>
              </div>
              <CardDescription>Comma-separated list of your key skills</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
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
                  <SaveButton />
                </>
              )}
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Education</CardTitle>
              </div>
              <CardDescription>Your most recent or highest degree</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edu_school">School / University</Label>
                      <Input id="edu_school" placeholder="MIT" value={formData.education_school} onChange={(e) => set("education_school", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edu_degree">Degree</Label>
                      <Input id="edu_degree" placeholder="Bachelor's" value={formData.education_degree} onChange={(e) => set("education_degree", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edu_major">Major / Field of Study</Label>
                      <Input id="edu_major" placeholder="Computer Science" value={formData.education_major} onChange={(e) => set("education_major", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edu_year">Graduation Year</Label>
                      <Input id="edu_year" placeholder="2023" value={formData.education_graduation_year} onChange={(e) => set("education_graduation_year", e.target.value)} />
                    </div>
                  </div>
                  <SaveButton />
                </>
              )}
            </CardContent>
          </Card>

          {/* Resume Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Resume</CardTitle>
              </div>
              <CardDescription>Upload your resume in PDF format</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <div className="space-y-4">
                  <input type="file" ref={fileInputRef} accept="application/pdf" onChange={handleFileChange} className="hidden" />
                  {profile?.resume_filename ? (
                    <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">{profile.resume_filename}</p>
                          <p className="text-sm text-muted-foreground">PDF Document</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={downloadResume}>
                          <Download className="h-4 w-4 mr-1" /> Download
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-1" /> Replace</>}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={deleteResume} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-3" />
                          <p className="text-muted-foreground">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                          <p className="font-medium text-foreground">Click to upload resume</p>
                          <p className="text-sm text-muted-foreground mt-1">PDF files only</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

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
              {roleLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Effective Role:</span>
                    <Badge variant={effectiveRole === "founder" ? "default" : effectiveRole === "employer" ? "secondary" : "outline"}>
                      {effectiveRole || "user"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">All Assigned Roles:</span>
                    {allRoles && allRoles.length > 0 ? (
                      allRoles.map((r, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{r.role}</Badge>
                      ))
                    ) : (
                      <Badge variant="outline">user (default)</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">User ID: {user?.id}</div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
