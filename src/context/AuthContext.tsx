 import { createContext, useContext, useEffect, useState, ReactNode } from "react";
 import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const checkSubscriptionStatus = async () => {
  try {
    await supabase.functions.invoke("check-subscription");
  } catch (err) {
    console.error("[AUTH] Subscription check failed:", err);
  }
};
 
 interface AuthContextType {
   user: User | null;
   session: Session | null;
   isAdmin: boolean;
   isLoading: boolean;
   signUp: (email: string, password: string, country?: string) => Promise<{ error: Error | null }>;
   signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
   signOut: () => Promise<void>;
 }
 
 const AuthContext = createContext<AuthContextType | undefined>(undefined);
 
 export function AuthProvider({ children }: { children: ReactNode }) {
   const [user, setUser] = useState<User | null>(null);
   const [session, setSession] = useState<Session | null>(null);
   const [isAdmin, setIsAdmin] = useState(false);
   const [isLoading, setIsLoading] = useState(true);
 
  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "founder"])
      .maybeSingle();
    
    setIsAdmin(data?.role === "admin" || data?.role === "founder");
    setIsLoading(false);
  };
 
   useEffect(() => {
     // Set up auth state listener FIRST (synchronous only)
     const { data: { subscription } } = supabase.auth.onAuthStateChange(
       (event, session) => {
         // Only synchronous state updates here
         setSession(session);
         setUser(session?.user ?? null);
         
         // Defer Supabase calls with setTimeout to prevent deadlock
          if (session?.user) {
            setTimeout(() => {
              checkAdminRole(session.user.id);
              checkSubscriptionStatus();
            }, 0);
         } else {
           setIsAdmin(false);
           setIsLoading(false);
         }
       }
     );
 
     // THEN check for existing session
     supabase.auth.getSession().then(({ data: { session } }) => {
       setSession(session);
       setUser(session?.user ?? null);
        if (session?.user) {
          checkAdminRole(session.user.id);
          checkSubscriptionStatus();
        } else {
         setIsLoading(false);
       }
     });
 
     return () => subscription.unsubscribe();
   }, []);
 
   const signUp = async (email: string, password: string, country?: string) => {
     const redirectUrl = `${window.location.origin}/`;
     
     const { error } = await supabase.auth.signUp({
       email,
       password,
       options: {
         data: { country },
         emailRedirectTo: redirectUrl,
       },
     });
 
     if (!error && country) {
       // Update profile with country after signup
       const { data: { user } } = await supabase.auth.getUser();
       if (user) {
         await supabase
           .from("profiles")
           .update({ country })
           .eq("user_id", user.id);
       }
     }
 
     return { error: error as Error | null };
   };
 
   const signIn = async (email: string, password: string) => {
     const { error } = await supabase.auth.signInWithPassword({
       email,
       password,
     });
     return { error: error as Error | null };
   };
 
   const signOut = async () => {
     await supabase.auth.signOut();
     setUser(null);
     setSession(null);
     setIsAdmin(false);
   };
 
   return (
     <AuthContext.Provider
       value={{
         user,
         session,
         isAdmin,
         isLoading,
         signUp,
         signIn,
         signOut,
       }}
     >
       {children}
     </AuthContext.Provider>
   );
 }
 
 export function useAuth() {
   const context = useContext(AuthContext);
   if (context === undefined) {
     throw new Error("useAuth must be used within an AuthProvider");
   }
   return context;
 }