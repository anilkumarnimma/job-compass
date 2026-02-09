import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/usePermissions";
import { Briefcase, Mail, Lock, Globe, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signIn, signUp, isLoading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  const isSignup = searchParams.get("signup") === "true";
  const [mode, setMode] = useState<"login" | "signup">(isSignup ? "signup" : "login");
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");

  // Role-based redirect after login
  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) return;

    const redirectPath = (() => {
      if (userRole === "founder") return "/founder/employers";
      if (userRole === "employer") return "/employer";
      return "/dashboard";
    })();
    
    navigate(redirectPath, { replace: true });
  }, [user, authLoading, roleLoading, userRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await signUp(email, password, country);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Account created! Please check your email to verify your account.");
          setMode("login");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Welcome back!");
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
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-background relative">
        {/* Centered Auth Card */}
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shadow-soft">
              <Briefcase className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground tracking-tight">JobPulse</span>
          </div>

          {/* Card */}
          <div className="bg-card border border-border/60 rounded-2xl p-8 shadow-soft">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-xl font-semibold text-foreground mb-1">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {mode === "login" 
                  ? "Sign in to continue to JobPulse" 
                  : "Get started with your job search"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-background border-border/80 focus:border-accent focus:ring-accent"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 bg-background border-border/80 focus:border-accent focus:ring-accent"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="country" className="text-sm font-medium text-foreground">
                    Country
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="country"
                      type="text"
                      placeholder="United States"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="pl-10 h-11 bg-background border-border/80 focus:border-accent focus:ring-accent"
                    />
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                variant="accent" 
                className="w-full h-11 text-sm font-medium mt-2" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {mode === "login" ? "Sign in" : "Create account"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 text-muted-foreground">
                  {mode === "login" ? "New here?" : "Already have an account?"}
                </span>
              </div>
            </div>

            {/* Toggle mode */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 text-sm"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Create account" : "Sign in instead"}
            </Button>
          </div>

          {/* Back to home */}
          <div className="mt-6 text-center">
            <Link 
              to="/" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>

        {/* Founder Note - Sticky Note Style */}
        <div 
          className="absolute bottom-6 left-6 hidden sm:block"
          style={{ transform: 'rotate(-1.5deg)' }}
        >
          <div className="relative max-w-64 px-4 py-3.5 rounded-lg bg-[hsl(var(--note-bg))] border border-[hsl(var(--note-border)/0.4)] shadow-md">
            {/* Subtle corner fold effect */}
            <div 
              className="absolute top-0 right-0 w-4 h-4 rounded-bl"
              style={{
                background: 'linear-gradient(135deg, transparent 50%, hsl(var(--note-border) / 0.2) 50%)',
              }}
            />
            
            <p className="text-sm text-foreground/80 leading-relaxed">
              Built by someone who once refreshed job portals at 2 AM.
            </p>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              — Founder, JobPulse
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}