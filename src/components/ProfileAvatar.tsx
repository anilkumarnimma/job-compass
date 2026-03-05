import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";

interface ProfileAvatarProps {
  size?: "sm" | "md";
  showPicker?: boolean;
}

export function ProfileAvatar({ size = "sm" }: ProfileAvatarProps) {
  const { user } = useAuth();
  const { profile } = useProfile();

  const avatarUrl = (profile as any)?.avatar_url as string | null;
  const initials = getInitials(profile?.full_name || profile?.first_name || user?.email || "");
  const sizeClass = size === "md" ? "h-10 w-10" : "h-7 w-7";
  const textSize = size === "md" ? "text-sm" : "text-[10px]";

  return (
    <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
      <Avatar className={`${sizeClass} border border-border shadow-soft cursor-pointer`}>
        {avatarUrl && (
          <AvatarImage src={avatarUrl} alt="Profile" className="object-cover" />
        )}
        <AvatarFallback className={`${textSize} bg-secondary text-foreground font-medium`}>
          {initials}
        </AvatarFallback>
      </Avatar>
    </motion.div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] || "?").toUpperCase();
}
