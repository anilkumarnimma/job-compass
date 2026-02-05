 import { useState } from "react";
 import { useSearchParams, Link } from "react-router-dom";
 import { Layout } from "@/components/Layout";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Card } from "@/components/ui/card";
 import { Briefcase, Mail, Lock, Phone, Globe } from "lucide-react";
 
 export default function Auth() {
   const [searchParams] = useSearchParams();
   const isSignup = searchParams.get("signup") === "true";
   const [mode, setMode] = useState<"login" | "signup">(isSignup ? "signup" : "login");
   
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [phone, setPhone] = useState("");
   const [country, setCountry] = useState("");
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     // This will be connected to Supabase auth when Cloud is enabled
     console.log("Auth submit:", { email, password, phone, country, mode });
   };
 
   return (
     <Layout showFooter={false}>
       <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
         <Card className="w-full max-w-md p-8 border-border/60 shadow-elevated animate-scale-in">
           {/* Logo */}
           <div className="flex items-center justify-center gap-2 mb-8">
             <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
               <Briefcase className="h-5 w-5 text-accent-foreground" />
             </div>
             <span className="font-semibold text-xl text-foreground">JobTracker</span>
           </div>
 
           {/* Header */}
           <div className="text-center mb-8">
             <h1 className="text-2xl font-bold text-foreground mb-2">
               {mode === "login" ? "Welcome back" : "Create your account"}
             </h1>
             <p className="text-muted-foreground text-sm">
               {mode === "login" 
                 ? "Sign in to continue to your dashboard" 
                 : "Start tracking your job applications"}
             </p>
           </div>
 
           {/* Form */}
           <form onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-2">
               <Label htmlFor="email">Email</Label>
               <div className="relative">
                 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input
                   id="email"
                   type="email"
                   placeholder="you@example.com"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="pl-10"
                   required
                 />
               </div>
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="password">Password</Label>
               <div className="relative">
                 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input
                   id="password"
                   type="password"
                   placeholder="••••••••"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="pl-10"
                   required
                   minLength={6}
                 />
               </div>
             </div>
 
             {mode === "signup" && (
               <>
                 <div className="space-y-2">
                   <Label htmlFor="country">Country</Label>
                   <div className="relative">
                     <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     <Input
                       id="country"
                       type="text"
                       placeholder="United States"
                       value={country}
                       onChange={(e) => setCountry(e.target.value)}
                       className="pl-10"
                     />
                   </div>
                 </div>
 
                 <div className="space-y-2">
                   <Label htmlFor="phone">Phone (for OTP verification)</Label>
                   <div className="relative">
                     <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     <Input
                       id="phone"
                       type="tel"
                       placeholder="+1 (555) 000-0000"
                       value={phone}
                       onChange={(e) => setPhone(e.target.value)}
                       className="pl-10"
                     />
                   </div>
                 </div>
               </>
             )}
 
             <Button type="submit" variant="accent" className="w-full" size="lg">
               {mode === "login" ? "Sign In" : "Create Account"}
             </Button>
           </form>
 
           {/* Toggle mode */}
           <div className="mt-6 text-center text-sm">
             <span className="text-muted-foreground">
               {mode === "login" ? "Don't have an account? " : "Already have an account? "}
             </span>
             <button
               type="button"
               onClick={() => setMode(mode === "login" ? "signup" : "login")}
               className="text-accent font-medium hover:underline"
             >
               {mode === "login" ? "Sign up" : "Sign in"}
             </button>
           </div>
 
           {/* Back to home */}
           <div className="mt-4 text-center">
             <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
               ← Back to home
             </Link>
           </div>
         </Card>
       </div>
     </Layout>
   );
 }