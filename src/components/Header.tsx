 import { Link, useLocation, useNavigate } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import { useAuth } from "@/context/AuthContext";
 import { Briefcase, Menu, X, LogOut, Shield } from "lucide-react";
 import { useState } from "react";
 
 export function Header() {
   const location = useLocation();
   const navigate = useNavigate();
   const { user, isAdmin, signOut } = useAuth();
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
   
   const isActive = (path: string) => location.pathname === path;
   
   const navLinks = [
     { path: "/dashboard", label: "Jobs" },
     { path: "/applied", label: "Applied" },
     { path: "/saved", label: "Saved" },
   ];
 
   const handleSignOut = async () => {
     await signOut();
     navigate("/");
   };
 
   return (
     <header className="sticky top-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border/60">
       <div className="container max-w-6xl mx-auto px-4">
         <div className="flex items-center justify-between h-16">
           {/* Logo */}
           <Link to="/" className="flex items-center gap-2">
             <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
               <Briefcase className="h-4 w-4 text-accent-foreground" />
             </div>
       <span className="font-semibold text-foreground">Sociax</span>
           </Link>
 
           {/* Desktop Navigation */}
           <nav className="hidden md:flex items-center gap-1">
             {navLinks.map((link) => (
               <Link key={link.path} to={link.path}>
                 <Button
                   variant={isActive(link.path) ? "secondary" : "ghost"}
                   size="sm"
                 >
                   {link.label}
                 </Button>
               </Link>
             ))}
           </nav>
 
           {/* Auth buttons (desktop) */}
           <div className="hidden md:flex items-center gap-2">
             {user ? (
               <>
                 {isAdmin && (
                   <Link to="/admin">
                     <Button variant="outline" size="sm">
                       <Shield className="h-4 w-4 mr-1" />
                       Admin
                     </Button>
                   </Link>
                 )}
                 <Button variant="ghost" size="sm" onClick={handleSignOut}>
                   <LogOut className="h-4 w-4 mr-1" />
                   Sign out
                 </Button>
               </>
             ) : (
               <>
                 <Link to="/auth">
                   <Button variant="ghost" size="sm">Log in</Button>
                 </Link>
                 <Link to="/auth?signup=true">
                   <Button variant="accent" size="sm">Sign up</Button>
                 </Link>
               </>
             )}
           </div>
 
           {/* Mobile menu button */}
           <Button
             variant="ghost"
             size="icon"
             className="md:hidden"
             onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
           >
             {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
           </Button>
         </div>
 
         {/* Mobile menu */}
         {mobileMenuOpen && (
           <div className="md:hidden py-4 border-t border-border/60 animate-slide-up">
             <nav className="flex flex-col gap-1">
               {navLinks.map((link) => (
                 <Link 
                   key={link.path} 
                   to={link.path}
                   onClick={() => setMobileMenuOpen(false)}
                 >
                   <Button
                     variant={isActive(link.path) ? "secondary" : "ghost"}
                     className="w-full justify-start"
                   >
                     {link.label}
                   </Button>
                 </Link>
               ))}
               <div className="flex gap-2 mt-4 pt-4 border-t border-border/60">
                 {user ? (
                   <>
                     {isAdmin && (
                       <Link to="/admin" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                         <Button variant="outline" className="w-full">
                           <Shield className="h-4 w-4 mr-1" />
                           Admin
                         </Button>
                       </Link>
                     )}
                     <Button 
                       variant="ghost" 
                       className="flex-1" 
                       onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                     >
                       <LogOut className="h-4 w-4 mr-1" />
                       Sign out
                     </Button>
                   </>
                 ) : (
                   <>
                     <Link to="/auth" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                       <Button variant="outline" className="w-full">Log in</Button>
                     </Link>
                     <Link to="/auth?signup=true" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                       <Button variant="accent" className="w-full">Sign up</Button>
                     </Link>
                   </>
                 )}
               </div>
             </nav>
           </div>
         )}
       </div>
     </header>
   );
 }