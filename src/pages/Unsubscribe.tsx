import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const uid = searchParams.get("uid"); // legacy fallback

  useEffect(() => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    if (token) {
      window.location.href = `https://${projectId}.supabase.co/functions/v1/unsubscribe-email?token=${encodeURIComponent(token)}`;
    } else if (uid) {
      // Legacy links without HMAC are no longer accepted server-side
      window.location.href = `https://${projectId}.supabase.co/functions/v1/unsubscribe-email?token=invalid`;
    }
  }, [token, uid]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Processing your unsubscribe request...</p>
      </div>
    </div>
  );
}
