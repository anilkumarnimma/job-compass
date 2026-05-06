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
    // Popup blocked — give the user a manual escape hatch
    toast({
      title: "Popup blocked",
      description:
        "Your browser blocked the new tab. Click here to open the application.",
      action: (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
        >
          Open
        </a>
      ) as any,
    });
  }
}
