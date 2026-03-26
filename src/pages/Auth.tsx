import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { CountrySelectDialog } from "@/components/CountrySelectDialog";
import { countries } from "@/data/countries";
import { Mail, Lock, Loader2, Eye, EyeOff, Search, Check, ChevronDown, Briefcase, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signIn, signUp, isLoading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useUserRole();

  const modeParam = searchParams.get("mode");
  const isSignupParam = searchParams.get("signup") === "true";
  const [mode, setMode] = useState<"login" | "signup">(
    modeParam === "signup" || isSignupParam ? "signup" : "login"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [country, setCountry] = useState("United States");
  const [countrySearch, setCountrySearch] = useState("");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);

  // Country prompt for Google OAuth users
  const [showCountryPrompt, setShowCountryPrompt] = useState(false);
  const [savingCountry, setSavingCountry] = useState(false);

  // Email verification state
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const filteredCountries = useMemo(
    () => countries.filter((c) => c.toLowerCase().includes(countrySearch.toLowerCase())),
    [countrySearch]
  );

  // Track whether we've already decided to show the country prompt
  const [countryChecked, setCountryChecked] = useState(false);

  // Role-based redirect after login (only if country is set)
  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) return;
    // Don't re-check if we're already showing the prompt or saving
    if (showCountryPrompt || savingCountry || countryChecked) return;

    const checkCountry = async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("country")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[AUTH] Failed to check country:", error);
        return;
      }

      if (!profile?.country) {
        setCountryChecked(true);
        setShowCountryPrompt(true);
        return;
      }

      setCountryChecked(true);
      const redirectPath = (() => {
        if (userRole === "founder") return "/founder/employers";
        if (userRole === "employer") return "/employer";
        return "/dashboard";
      })();
      navigate(redirectPath, { replace: true });
    };

    checkCountry();
  }, [user, authLoading, roleLoading, userRole, navigate, showCountryPrompt, savingCountry, countryChecked]);

  const handleCountrySelected = async (selectedCountry: string) => {
    if (!user) return;
    setSavingCountry(true);

    const { error } = await supabase
      .from("profiles")
      .update({ country: selectedCountry })
      .eq("user_id", user.id);

    if (error) {
      console.error("[AUTH] Failed to save country:", error);
      toast.error("Failed to save country. Please try again.");
      setSavingCountry(false);
      return;
    }

    setSavingCountry(false);
    setShowCountryPrompt(false);

    const redirectPath = (() => {
      if (userRole === "founder") return "/founder/employers";
      if (userRole === "employer") return "/employer";
      return "/dashboard";
    })();
    navigate(redirectPath, { replace: true });
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error("Google sign-in failed. Please try again.");
        console.error("[AUTH] Google OAuth error:", error);
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (!verificationEmail || resending || resendCooldown > 0) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: verificationEmail });
      if (error) {
        console.error("[AUTH] Resend failed:", error);
        toast.error("Could not resend. Please wait a moment and try again.");
      } else {
        toast.success("Verification email re-sent! Check your inbox and spam/junk folder.");
        setResendCooldown(60);
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match.");
          setIsLoading(false);
          return;
        }
        console.log("[AUTH] Attempting signup for:", email);
        const { error } = await signUp(email, password, country);
        if (error) {
          console.error("[AUTH] Signup error:", error.message);
          toast.error(error.message);
        } else {
          console.log("[AUTH] Signup succeeded, verification email triggered for:", email);
          setVerificationEmail(email);
          setShowVerificationBanner(true);
          setResendCooldown(60);
          setMode("login");
        }
      } else {
        console.log("[AUTH] Attempting login for:", email);
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message === "Email not confirmed") {
            console.warn("[AUTH] Email not confirmed for:", email);
            // Resend confirmation email automatically
            await supabase.auth.resend({ type: "signup", email });
            setVerificationEmail(email);
            setShowVerificationBanner(true);
            setResendCooldown(60);
            toast.error("Please confirm your email. We've just re-sent you a confirmation link.");
          } else {
            toast.error(error.message);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="h-[calc(100vh-64px)] overflow-hidden relative flex flex-col items-center justify-center px-4 py-4 md:py-0 bg-background">
        <div className="w-full max-w-sm flex flex-col items-center">
          {/* Heading */}
          <div className="text-center mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-tight">
              Apply anywhere. Track everything. Get hired faster.
            </h1>
          </div>

          {/* Email verification banner */}
          {showVerificationBanner && (
            <div className="w-full bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 mb-3">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Please confirm your email
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    We've sent a verification link to <span className="font-medium text-foreground">{verificationEmail}</span>. 
                    If you don't see it, check your spam/junk folder.
                  </p>
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors disabled:opacity-50"
                    onClick={handleResendVerification}
                    disabled={resending || resendCooldown > 0}
                  >
                    <RefreshCw className={`h-3 w-3 ${resending ? "animate-spin" : ""}`} />
                    {resending
                      ? "Sending…"
                      : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend verification email"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Card */}
          <div className="w-full bg-card border border-border/60 rounded-2xl px-5 py-5 shadow-soft">
            {/* Google Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 text-sm font-medium gap-3"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 text-muted-foreground uppercase tracking-wider">or</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {/* Email */}
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-9 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 h-9 text-sm"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (signup only) */}
              {mode === "signup" && (
                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9 pr-9 h-9 text-sm"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Country dropdown */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">Country <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <button
                    type="button"
                    className="w-full h-9 flex items-center justify-between rounded-md border border-input bg-background px-3 text-sm text-left hover:bg-secondary/50 transition-colors"
                    onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                  >
                    <span className={country ? "text-foreground" : "text-muted-foreground"}>
                      {country || "Select country"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>

                  {countryDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg">
                      <div className="p-2 border-b border-border">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Search..."
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            className="pl-8 h-8 text-sm"
                            autoFocus
                          />
                        </div>
                      </div>
                      <ScrollArea className="h-40">
                        <div className="p-1">
                          {filteredCountries.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                                country === c
                                  ? "bg-accent/10 text-accent font-medium"
                                  : "hover:bg-secondary text-foreground"
                              }`}
                              onClick={() => {
                                setCountry(c);
                                setCountryDropdownOpen(false);
                                setCountrySearch("");
                              }}
                            >
                              <span className="flex items-center justify-between">
                                {c}
                                {country === c && <Check className="h-3.5 w-3.5 text-accent" />}
                              </span>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="accent"
                className="w-full h-9 text-sm font-medium mt-0.5"
                disabled={isLoading || !country}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === "login" ? (
                  "Sign in"
                ) : (
                  "Create account"
                )}
              </Button>
            </form>

            {/* Forgot password (login only) */}
            {mode === "login" && (
              <div className="mt-2 text-center">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-accent transition-colors"
                  onClick={() => toast.info("Password reset coming soon!")}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Toggle mode */}
            <div className="mt-3 text-center text-xs text-muted-foreground">
              {mode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-accent font-medium hover:underline"
                    onClick={() => setMode("signup")}
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-accent font-medium hover:underline"
                    onClick={() => setMode("login")}
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Back to home */}
          <div className="mt-3 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Back to home
            </Link>
          </div>

          {/* Founder quote – mobile: below form, compact */}
          <div className="mt-3 block md:hidden">
            <div className="bg-card border border-border/40 rounded-lg px-3 py-2.5 shadow-sm">
              <p className="text-xs italic text-muted-foreground leading-snug">
                "Built by someone who refreshed job portals at 2 AM."
              </p>
              <p className="mt-1 text-[10px] font-medium text-foreground/70">— Founder, Sociax</p>
            </div>
          </div>
        </div>

        {/* Founder quote – desktop: bottom-left */}
        <div className="hidden md:block absolute bottom-4 left-4">
          <div className="bg-card border border-border/40 rounded-xl px-4 py-3 shadow-sm max-w-xs">
            <p className="text-xs italic text-muted-foreground leading-relaxed">
              "Built by someone who refreshed job portals at 2 AM."
            </p>
            <p className="mt-1.5 text-[11px] font-medium text-foreground/70">— Founder, Sociax</p>
          </div>
        </div>
      </div>

      {/* Country prompt for Google OAuth users without country */}
      <CountrySelectDialog
        open={showCountryPrompt}
        onSelect={handleCountrySelected}
        isLoading={savingCountry}
      />
    </Layout>
  );
}
