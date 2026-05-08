import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, FileText, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { RESUME_TEMPLATES, ResumeTemplateId, DEFAULT_TEMPLATE_ID } from "@/lib/resumeTemplates";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (templateId: ResumeTemplateId) => void;
}

export function ResumeTemplateSelector({ open, onOpenChange, onConfirm }: Props) {
  const { profile } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const stored = (profile as any)?.preferred_resume_template as ResumeTemplateId | undefined;
  const [selected, setSelected] = useState<ResumeTemplateId>(stored || DEFAULT_TEMPLATE_ID);

  useEffect(() => {
    if (stored) setSelected(stored);
  }, [stored]);

  const hasResume = !!(profile?.resume_url || profile?.resume_filename);

  const handleConfirm = async () => {
    if (user) {
      // fire-and-forget save preference
      supabase
        .from("profiles")
        .update({ preferred_resume_template: selected } as any)
        .eq("user_id", user.id)
        .then(() => {});
    }
    onConfirm(selected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[860px] max-w-[96vw]">
        {!hasResume ? (
          <>
            <DialogHeader>
              <DialogTitle>Upload your resume first</DialogTitle>
              <DialogDescription>
                Your tailored resume is built from your real experience — we need your resume
                to get started.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  navigate("/profile");
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Resume Now
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Choose a resume template</DialogTitle>
              <DialogDescription>
                Pick the style that best fits the role. You can change it next time.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {(Object.values(RESUME_TEMPLATES) as Array<typeof RESUME_TEMPLATES[ResumeTemplateId]>).map((t) => {
                const isSel = selected === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelected(t.id)}
                    className={cn(
                      "relative text-left rounded-lg border-2 bg-card p-3 transition-all hover:shadow-md",
                      isSel
                        ? "border-[hsl(174_72%_42%)] ring-2 ring-[hsl(174_72%_42%)]/20"
                        : "border-border",
                    )}
                  >
                    {isSel && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-[hsl(174_72%_42%)] text-white flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    <Mockup id={t.id} />
                    <div className="mt-3">
                      <div className="font-semibold text-sm">{t.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {t.tagline}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirm}>
                <FileText className="h-4 w-4 mr-2" />
                Continue with {RESUME_TEMPLATES[selected].label}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Tiny CSS mockup of how the resume layout looks. */
function Mockup({ id }: { id: ResumeTemplateId }) {
  if (id === "classic") {
    return (
      <div className="bg-white aspect-[3/4] rounded border p-3 flex flex-col gap-1.5" style={{ fontFamily: "Georgia, serif" }}>
        <div className="h-2.5 w-2/3 mx-auto bg-black rounded-sm" />
        <div className="h-1 w-1/2 mx-auto bg-neutral-400 rounded-sm" />
        <div className="mt-1.5">
          <div className="h-1.5 w-1/3 bg-black rounded-sm" />
          <div className="h-px bg-black mt-0.5" />
          <div className="space-y-1 mt-1">
            <div className="h-1 w-full bg-neutral-300 rounded-sm" />
            <div className="h-1 w-5/6 bg-neutral-300 rounded-sm" />
            <div className="h-1 w-4/5 bg-neutral-300 rounded-sm" />
          </div>
        </div>
        <div className="mt-1.5">
          <div className="h-1.5 w-1/3 bg-black rounded-sm" />
          <div className="h-px bg-black mt-0.5" />
          <div className="space-y-1 mt-1">
            <div className="h-1 w-full bg-neutral-300 rounded-sm" />
            <div className="h-1 w-5/6 bg-neutral-300 rounded-sm" />
          </div>
        </div>
      </div>
    );
  }
  if (id === "modern") {
    return (
      <div className="bg-white aspect-[3/4] rounded border p-3 flex flex-col gap-1.5">
        <div className="h-3 w-2/3 rounded-sm" style={{ background: "hsl(174 72% 42%)" }} />
        <div className="h-1 w-1/2 bg-neutral-400 rounded-sm" />
        <div className="mt-2">
          <div className="flex items-center gap-1">
            <div className="h-2 w-1 rounded-sm" style={{ background: "hsl(174 72% 42%)" }} />
            <div className="h-1.5 w-1/3 bg-neutral-700 rounded-sm" />
          </div>
          <div className="space-y-1 mt-1.5 ml-2">
            <div className="h-1 w-full bg-neutral-300 rounded-sm" />
            <div className="h-1 w-5/6 bg-neutral-300 rounded-sm" />
            <div className="h-1 w-4/5 bg-neutral-300 rounded-sm" />
          </div>
        </div>
        <div className="mt-1.5">
          <div className="flex items-center gap-1">
            <div className="h-2 w-1 rounded-sm" style={{ background: "hsl(174 72% 42%)" }} />
            <div className="h-1.5 w-1/3 bg-neutral-700 rounded-sm" />
          </div>
          <div className="space-y-1 mt-1.5 ml-2">
            <div className="h-1 w-full bg-neutral-300 rounded-sm" />
            <div className="h-1 w-5/6 bg-neutral-300 rounded-sm" />
          </div>
        </div>
      </div>
    );
  }
  // compact
  return (
    <div className="bg-white aspect-[3/4] rounded border p-2 flex flex-col gap-1">
      <div className="h-2 w-1/2 mx-auto bg-neutral-800 rounded-sm" />
      <div className="h-0.5 w-2/5 mx-auto bg-neutral-400 rounded-sm" />
      <div className="mt-1">
        <div className="h-1 w-1/4 bg-neutral-700 rounded-sm" />
        <div className="h-px bg-neutral-300 mt-0.5" />
        <div className="space-y-0.5 mt-0.5">
          <div className="h-0.5 w-full bg-neutral-300 rounded-sm" />
          <div className="h-0.5 w-full bg-neutral-300 rounded-sm" />
          <div className="h-0.5 w-5/6 bg-neutral-300 rounded-sm" />
          <div className="h-0.5 w-full bg-neutral-300 rounded-sm" />
        </div>
      </div>
      <div className="mt-1">
        <div className="h-1 w-1/4 bg-neutral-700 rounded-sm" />
        <div className="h-px bg-neutral-300 mt-0.5" />
        <div className="space-y-0.5 mt-0.5">
          <div className="h-0.5 w-full bg-neutral-300 rounded-sm" />
          <div className="h-0.5 w-5/6 bg-neutral-300 rounded-sm" />
          <div className="h-0.5 w-full bg-neutral-300 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
