import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";

const EMOJI_OPTIONS = [
  "😀", "😎", "🤓", "🧑‍💻", "👩‍💼", "👨‍💼", "🦊", "🐱", "🐶", "🦄",
  "🌟", "🔥", "💎", "🚀", "🎯", "🎨", "🧠", "💡", "⚡", "🌈",
  "🍀", "🎵", "🏆", "🌸", "🦋", "🐝", "🍕", "☕", "🎮", "📚",
];

interface ProfileAvatarProps {
  size?: "sm" | "md";
  showPicker?: boolean;
}

export function ProfileAvatar({ size = "sm", showPicker = false }: ProfileAvatarProps) {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [open, setOpen] = useState(false);

  const emojiAvatar = (profile as any)?.emoji_avatar as string | null;
  const initials = getInitials(profile?.full_name || profile?.first_name || user?.email || "");
  const sizeClass = size === "md" ? "h-10 w-10" : "h-8 w-8";
  const textSize = size === "md" ? "text-base" : "text-sm";

  const handleSelectEmoji = (emoji: string) => {
    updateProfile({ emoji_avatar: emoji } as any);
    setOpen(false);
  };

  const avatarContent = (
    <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
      <Avatar className={`${sizeClass} border border-border shadow-soft cursor-pointer`}>
        <AvatarFallback className={`${textSize} bg-secondary text-foreground font-medium`}>
          {emojiAvatar || initials}
        </AvatarFallback>
      </Avatar>
    </motion.div>
  );

  if (!showPicker) return avatarContent;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{avatarContent}</PopoverTrigger>
      <PopoverContent className="w-72 p-3 rounded-xl border-border/50 shadow-premium" align="end">
        <p className="text-xs font-medium text-muted-foreground mb-2">Pick your avatar emoji</p>
        <div className="grid grid-cols-10 gap-1">
          {EMOJI_OPTIONS.map((emoji) => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSelectEmoji(emoji)}
              className={`h-7 w-7 flex items-center justify-center rounded-lg text-base cursor-pointer transition-colors ${
                emojiAvatar === emoji ? "bg-accent/20 ring-1 ring-accent" : "hover:bg-secondary"
              }`}
            >
              {emoji}
            </motion.button>
          ))}
        </div>
        {emojiAvatar && (
          <button
            onClick={() => { updateProfile({ emoji_avatar: null } as any); setOpen(false); }}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear emoji
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] || "?").toUpperCase();
}
