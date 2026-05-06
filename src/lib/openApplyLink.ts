import { toast } from "@/hooks/use-toast";

/**
 * Safely open an external apply link in a new tab.
 * - Trims whitespace and ensures https:// scheme
 * - Falls back to a copy-link toast if the browser blocks the popup
 */
export function openApplyLink(rawUrl: string | null | undefined): void {
  if (!rawUrl) {
    toast({
      title: "Apply link unavailable",
      description: "This job's apply link is missing. Try another listing.",
      variant: "destructive",
    });
    return;
  }

  let url = rawUrl.trim();
  if (!url) return;

  // Ensure protocol — bare hostnames render as black/blank tabs
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url.replace(/^\/+/, "")}`;
  }

  let win: Window | null = null;
  try {
    win = window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    win = null;
  }

  if (!win) {
    // Popup blocked — copy URL to clipboard so the user can paste it
    try {
      navigator.clipboard?.writeText(url);
    } catch {
      // ignore
    }
    toast({
      title: "Popup blocked — link copied",
      description:
        "Your browser blocked the new tab. The application URL has been copied to your clipboard.",
      variant: "destructive",
    });
  }
}
