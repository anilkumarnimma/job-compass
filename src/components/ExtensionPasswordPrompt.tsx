import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { KeyRound, Eye, EyeOff, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

const DISMISS_KEY = "sociax_ext_pwd_dismissed";

export function ExtensionPasswordPrompt() {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Detect Google-only users: check multiple metadata fields
  const providers = user?.app_metadata?.providers as string[] | undefined;
  const mainProvider = user?.app_metadata?.provider as string | undefined;
  const hasGoogle = mainProvider === "google" || (providers?.includes("google") ?? false);
  const hasEmail = mainProvider === "email" || (providers?.includes("email") ?? false);
  const isGoogleOnly = hasGoogle && !hasEmail;

  const wasDismissed = !!user && localStorage.getItem(DISMISS_KEY) === user.id;
  const isOpen = !!user && isGoogleOnly && !wasDismissed && !done;

  const handleDismiss = () => {
    if (user) localStorage.setItem(DISMISS_KEY, user.id);
  };

  const handleSetPassword = async () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      if (user) localStorage.setItem(DISMISS_KEY, user.id);
      toast.success("Password set! You can now sign into the Sociax extension.");
    } catch (err: any) {
      toast.error(err.message || "Failed to set password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="h-5 w-5 text-primary" />
            <DialogTitle>Set Extension Password</DialogTitle>
          </div>
          <DialogDescription>
            You signed in with Google. To use the Sociax Chrome extension, please set a password for your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="ext-pwd">Password</Label>
            <div className="relative">
              <Input
                id="ext-pwd"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ext-pwd-confirm">Confirm Password</Label>
            <Input
              id="ext-pwd-confirm"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={handleDismiss}>
              Skip for now
            </Button>
            <Button onClick={handleSetPassword} disabled={saving || !password}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Setting...</> : <><Check className="h-4 w-4 mr-2" /> Set Password</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
