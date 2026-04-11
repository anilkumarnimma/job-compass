import { Linkedin } from "lucide-react";

export function LinkedInFeatureAnnouncement() {
  return (
    <div className="flex items-center gap-2 text-xs text-foreground/80">
      <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent text-[10px] font-semibold">NEW</span>
      <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
      <span>
        Generate LinkedIn connection messages — click <span className="font-medium text-accent">"Connect on LinkedIn"</span> on any job
      </span>
    </div>
  );
}
