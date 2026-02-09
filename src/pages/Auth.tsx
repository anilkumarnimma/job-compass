import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/usePermissions";
import { Briefcase, Mail, Lock, Globe, Loader2, ArrowRight, Sparkles } from "lucide-react";
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
    // Wait for auth and role to be fully loaded
    if (authLoading || roleLoading) return;
    
    // Only redirect if user is logged in
    if (!user) return;

    // Debug logging (temporary)
    console.log("[Auth] Redirect check - userRole:", userRole, "user:", user?.email);
    
    // Determine redirect path based on role (founder has highest priority)
    const redirectPath = (() => {
      if (userRole === "founder") {
        console.log("[Auth] Redirecting founder to /founder/employers");
        return "/founder/employers";
      }
      if (userRole === "employer") {
        console.log("[Auth] Redirecting employer to /employer");
        return "/employer";
      }
      console.log("[Auth] Redirecting user to /dashboard");
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
          // Navigation handled by useEffect above
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
       <div className="min-h-[calc(100vh-64px)] flex">
         {/* Left side - Branding */}
         <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent/20" />
           <div className="absolute inset-0 opacity-10">
             <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl" />
             <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
           </div>
           
           <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
             <div className="flex items-center gap-3 mb-8">
               <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
                 <Briefcase className="h-6 w-6 text-accent-foreground" />
               </div>
               <span className="font-bold text-2xl text-primary-foreground">Sociax</span>
             </div>
             
             <h1 className="text-4xl lg:text-5xl font-bold text-primary-foreground leading-tight mb-6">
               Your career journey
               <span className="block text-accent">starts here</span>
             </h1>
             
             <p className="text-lg text-primary-foreground/80 max-w-md mb-8">
               Join thousands of professionals who found their dream jobs through Sociax. 
               Track applications, discover opportunities, and land interviews.
             </p>
             
             <div className="flex flex-col gap-4">
               <div className="flex items-center gap-3 text-primary-foreground/90">
                 <div className="h-8 w-8 rounded-lg bg-accent/20 flex items-center justify-center">
                   <Sparkles className="h-4 w-4 text-accent" />
                 </div>
                 <span>One-click applications to top companies</span>
               </div>
               <div className="flex items-center gap-3 text-primary-foreground/90">
                 <div className="h-8 w-8 rounded-lg bg-accent/20 flex items-center justify-center">
                   <Sparkles className="h-4 w-4 text-accent" />
                 </div>
                 <span>Track every application in one place</span>
               </div>
               <div className="flex items-center gap-3 text-primary-foreground/90">
                 <div className="h-8 w-8 rounded-lg bg-accent/20 flex items-center justify-center">
                   <Sparkles className="h-4 w-4 text-accent" />
                 </div>
                 <span>Get notified when companies are hiring</span>
               </div>
             </div>
           </div>
         </div>
         
          {/* Right side - Form */}
          <div className="w-full lg:w-1/2 flex items-center justify-center py-12 px-4 sm:px-8 bg-background relative">
            <div className="w-full max-w-md relative">
             {/* Mobile logo */}
             <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
               <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                 <Briefcase className="h-5 w-5 text-accent-foreground" />
               </div>
               <span className="font-bold text-xl text-foreground">Sociax</span>
             </div>
 
             {/* Header */}
             <div className="text-center lg:text-left mb-8">
               <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                 {mode === "login" ? "Welcome back" : "Create your account"}
               </h2>
               <p className="text-muted-foreground">
                 {mode === "login" 
                   ? "Enter your credentials to access your dashboard" 
                   : "Start your journey to finding the perfect job"}
               </p>
             </div>
 
             {/* Form */}
             <form onSubmit={handleSubmit} className="space-y-5">
               <div className="space-y-2">
                 <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                 <div className="relative">
                   <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input
                     id="email"
                     type="email"
                     placeholder="you@example.com"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="pl-10 h-12 bg-card border-border/60 focus:border-accent focus:ring-accent"
                     required
                   />
                 </div>
               </div>
 
               <div className="space-y-2">
                 <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                 <div className="relative">
                   <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input
                     id="password"
                     type="password"
                     placeholder="••••••••"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="pl-10 h-12 bg-card border-border/60 focus:border-accent focus:ring-accent"
                     required
                     minLength={6}
                   />
                 </div>
               </div>
 
               {mode === "signup" && (
                 <div className="space-y-2">
                   <Label htmlFor="country" className="text-sm font-medium">Country</Label>
                   <div className="relative">
                     <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     <Input
                       id="country"
                       type="text"
                       placeholder="United States"
                       value={country}
                       onChange={(e) => setCountry(e.target.value)}
                       className="pl-10 h-12 bg-card border-border/60 focus:border-accent focus:ring-accent"
                     />
                   </div>
                 </div>
               )}
 
               <Button 
                 type="submit" 
                 variant="accent" 
                 className="w-full h-12 text-base font-medium" 
                 disabled={isLoading}
               >
                 {isLoading ? (
                   <Loader2 className="h-5 w-5 animate-spin" />
                 ) : (
                   <>
                     {mode === "login" ? "Sign In" : "Create Account"}
                     <ArrowRight className="ml-2 h-4 w-4" />
                   </>
                 )}
               </Button>
             </form>
 
             {/* Divider */}
             <div className="relative my-8">
               <div className="absolute inset-0 flex items-center">
                 <div className="w-full border-t border-border/60" />
               </div>
               <div className="relative flex justify-center text-xs uppercase">
                 <span className="bg-background px-3 text-muted-foreground">
                   {mode === "login" ? "New to Sociax?" : "Already have an account?"}
                 </span>
               </div>
             </div>
 
             {/* Toggle mode */}
             <Button
               type="button"
               variant="outline"
               className="w-full h-12"
               onClick={() => setMode(mode === "login" ? "signup" : "login")}
             >
               {mode === "login" ? "Create an account" : "Sign in instead"}
             </Button>
 
             {/* Back to home */}
             <div className="mt-8 text-center">
               <Link 
                 to="/" 
                 className="text-sm text-muted-foreground hover:text-foreground transition-colors"
               >
                 ← Back to home
               </Link>
              </div>

              {/* Founder Note */}
              <div className="absolute bottom-6 left-6 text-xs font-medium text-muted-foreground italic leading-relaxed max-w-80 z-10">
                Built by someone who once refreshed job portals at 2 AM.
                <br />
                — Founder, JobPulse
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }