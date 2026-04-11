import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Job } from "@/types/job";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { Copy, Check, ExternalLink, Linkedin, Sparkles, RefreshCw } from "lucide-react";

interface LinkedInConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
}

export function LinkedInConnectDialog({ open, onOpenChange, job }: LinkedInConnectDialogProps) {
  const { profile } = useProfile();
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const linkedInSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(job.company)}&origin=GLOBAL_SEARCH_HEADER`;

  const generateMessage = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-linkedin-message", {
        body: {
          job_title: job.title,
          company: job.company,
          user_name: profile?.full_name || profile?.first_name || undefined,
          user_title: profile?.current_title || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMessage(data.message);
      setHasGenerated(true);
    } catch (err: any) {
      console.error("Failed to generate message:", err);
      toast.error(err.message || "Failed to generate message");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Message copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setMessage("");
      setHasGenerated(false);
      setCopied(false);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-[#0A66C2]" />
            Connect at {job.company}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Step 1: Generate Message */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Generate a personalized connection request message for people at <strong>{job.company}</strong> regarding the <strong>{job.title}</strong> role.
            </p>

            {!hasGenerated ? (
              <Button
                onClick={generateMessage}
                disabled={isGenerating}
                className="w-full bg-[#0A66C2] hover:bg-[#004182] text-white"
              >
                {isGenerating ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Generate Connection Message</>
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[100px] text-sm resize-none"
                  placeholder="Your connection message..."
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{message.length}/300 characters</span>
                  {message.length > 300 && (
                    <span className="text-destructive font-medium">Over LinkedIn's limit!</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="flex-1"
                  >
                    {copied ? (
                      <><Check className="h-4 w-4 mr-1.5 text-green-500" />Copied!</>
                    ) : (
                      <><Copy className="h-4 w-4 mr-1.5" />Copy Message</>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generateMessage}
                    disabled={isGenerating}
                    className="shrink-0"
                  >
                    <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Find People */}
          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-sm font-medium">Find people at {job.company}</p>
            <p className="text-xs text-muted-foreground">
              Search LinkedIn for employees at this company, then send your connection request with the message above.
            </p>
            <Button
              variant="outline"
              className="w-full border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#0A66C2]/10"
              onClick={() => window.open(linkedInSearchUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Search on LinkedIn
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
