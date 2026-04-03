import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

const REMINDER_SENT_KEY = "sociax_resume_reminder_sent";
const RECO_SENT_KEY = "sociax_reco_email_sent";

/**
 * Triggers resume-based emails after login:
 * - No resume → sends reminder email (once)
 * - Has resume + intelligence → sends personalized recommendations (once)
 */
export function useFirstLoginEmails() {
  const { user } = useAuth();
  const { profile, isLoading } = useProfile();
  const sentRef = useRef(false);

  useEffect(() => {
    if (!user || isLoading || !profile || sentRef.current) return;
    sentRef.current = true;

    const userId = user.id;
    const hasResume = !!profile.resume_url;
    const hasIntelligence = !!profile.resume_intelligence;

    if (!hasResume) {
      // Check if we already sent a reminder for this user
      const alreadySent = localStorage.getItem(`${REMINDER_SENT_KEY}_${userId}`);
      if (!alreadySent) {
        // Send resume reminder (fire-and-forget)
        supabase.functions.invoke("send-resume-reminder", {
          body: { user_id: userId },
        }).then(() => {
          localStorage.setItem(`${REMINDER_SENT_KEY}_${userId}`, "true");
        }).catch(() => {
          // Silently ignore - non-critical
        });
      }
    } else if (hasResume && (hasIntelligence || (profile.skills && profile.skills.length > 0))) {
      // Check if we already sent recommendations for this user
      const alreadySent = localStorage.getItem(`${RECO_SENT_KEY}_${userId}`);
      if (!alreadySent) {
        supabase.functions.invoke("send-job-recommendations", {
          body: { user_id: userId },
        }).then(() => {
          localStorage.setItem(`${RECO_SENT_KEY}_${userId}`, "true");
        }).catch(() => {
          // Silently ignore
        });
      }
    }
  }, [user, profile, isLoading]);
}
