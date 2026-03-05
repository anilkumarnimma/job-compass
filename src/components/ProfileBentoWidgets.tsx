import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useJobContext } from "@/context/JobContext";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, Bookmark, Target, TrendingUp, Sparkles, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function ProfileWelcomeBanner() {
  const { user } = useAuth();
  const { profile, isLoading, updateProfile } = useProfile();
  const { applications, savedJobs } = useJobContext();
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const profileCompletion = useMemo(() => {
    if (!profile) return 0;
    const fields = [
      profile.first_name, profile.last_name, profile.contact_email, profile.phone,
      profile.city, profile.linkedin_url, profile.current_title,
      profile.skills?.length ? "yes" : null,
      profile.resume_url,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  if (isLoading || !user) return null;

  const name = profile?.first_name || profile?.full_name || "there";
  const emojiAvatar = (profile as any)?.emoji_avatar as string | null;
  const avatarUrl = (profile as any)?.avatar_url as string | null;
  const initials = getInitials(profile?.full_name || profile?.first_name || user?.email || "");

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = "";

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file", description: "Please upload a JPG, PNG, or WebP image.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("resumes").getPublicUrl(filePath);
      updateProfile({ avatar_url: publicUrl } as any);
      toast({ title: "Photo updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="col-span-full"
    >
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-accent/10 via-card to-card p-6 shadow-[0_4px_24px_hsl(var(--accent)/0.08)]">
        {/* Subtle glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-accent/8 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start gap-5 relative z-10">
          {/* Large Avatar / Photo Card */}
          <div className="relative group flex-shrink-0">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-border/50 bg-secondary shadow-lg">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-secondary">
                  <span className="text-4xl sm:text-5xl">
                    {emojiAvatar || initials}
                  </span>
                </div>
              )}
            </div>
            {/* Camera overlay */}
            <input
              type="file"
              ref={photoInputRef}
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-1.5 right-1.5 w-8 h-8 rounded-full bg-foreground/80 text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer"
            >
              <Camera className="h-4 w-4" />
            </button>
            {/* Name overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent rounded-b-2xl px-3 py-2">
              <p className="text-white font-display font-bold text-sm truncate">{profile?.full_name || name}</p>
              {profile?.current_title && (
                <p className="text-white/70 text-[10px] truncate">{profile.current_title}</p>
              )}
            </div>
          </div>

          {/* Right side: Welcome + Stats */}
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-1">
              Welcome back, {name}!
            </h2>
            <p className="text-sm text-muted-foreground mb-4">Here's your job search overview</p>

            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Briefcase, value: applications?.length || 0, label: "Applied", color: "text-accent" },
                { icon: Bookmark, value: savedJobs?.length || 0, label: "Saved", color: "text-amber-500" },
                { icon: Target, value: `${profileCompletion}%`, label: "Profile", color: "text-success" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/30">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="font-display font-bold text-lg text-foreground">{stat.value}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Profile completion ring */}
        <div className="absolute top-6 right-6 z-10">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
            <circle
              cx="20" cy="20" r="16" fill="none"
              stroke="hsl(var(--accent))"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${profileCompletion} ${100 - profileCompletion}`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-accent rotate-90">
            {profileCompletion}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] || "?").toUpperCase();
}

export function SkillsCloudWidget() {
  const { profile } = useProfile();
  const skills = profile?.skills || [];

  if (skills.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-3xl border border-border/40 bg-card p-5 shadow-card"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-accent" />
        <h3 className="font-display font-semibold text-sm text-foreground">Top Skills</h3>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {skills.slice(0, 12).map((skill, i) => (
          <motion.span
            key={skill}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
          >
            {skill}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

export function QuickStatsWidget() {
  const { applications } = useJobContext();
  
  const stages = useMemo(() => {
    const total = applications?.length || 0;
    return [
      { label: "Applied", count: total, color: "bg-accent" },
      { label: "In Review", count: Math.floor(total * 0.3), color: "bg-amber-500" },
      { label: "Interview", count: Math.floor(total * 0.1), color: "bg-success" },
    ];
  }, [applications]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-3xl border border-border/40 bg-card p-5 shadow-card"
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-accent" />
        <h3 className="font-display font-semibold text-sm text-foreground">Application Pipeline</h3>
      </div>
      <div className="space-y-3">
        {stages.map((stage) => (
          <div key={stage.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${stage.color}`} />
              <span className="text-xs text-muted-foreground">{stage.label}</span>
            </div>
            <span className="text-xs font-semibold text-foreground">{stage.count}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
