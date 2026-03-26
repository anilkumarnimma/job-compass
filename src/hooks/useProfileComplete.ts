import { useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";

const REQUIRED_FIELDS = ["full_name", "phone", "location", "resume_url"] as const;

export function useProfileComplete() {
  const { user } = useAuth();
  const { profile, isLoading } = useProfile();

  const { isComplete, missingFields } = useMemo(() => {
    if (!user || !profile) return { isComplete: false, missingFields: REQUIRED_FIELDS as unknown as string[] };

    const missing: string[] = [];
    if (!profile.full_name?.trim()) missing.push("Full Name");
    if (!profile.phone?.trim()) missing.push("Phone");
    if (!profile.location?.trim()) missing.push("Location");
    if (!profile.resume_url?.trim()) missing.push("Resume");

    return { isComplete: missing.length === 0, missingFields: missing };
  }, [user, profile]);

  return { isComplete, missingFields, isLoading };
}
