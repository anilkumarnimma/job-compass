import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useUserRole, useAllUserRoles } from "@/hooks/usePermissions";
import { Briefcase, Menu, X, LogOut, Shield, User, Crown, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: userRole } = useUserRole();
  const { data: allRoles } = useAllUserRoles();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;
  
  // Determine role - default to "user" if no role found
  const role = userRole || "user";
  const isFounder = role === "founder";
  const isEmployer = role === "employer";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Role-based nav links
  // User + Founder: Jobs, Applied, Saved, Profile
  // Employer: only Employer Dashboard + Sign out
  const getNavLinks = () => {
    if (isEmployer && !isFounder) {
      // Employers only see Employer Dashboard (no browsing tabs)
      return [];
    }
    // users and founders see standard tabs
    return [
      { path: "/dashboard", label: "Jobs" },
      { path: "/applied", label: "Applied" },
      { path: "/saved", label: "Saved" },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <header className="sticky top-0 z-50 glass-header border-b border-border">
      <div className="container max-w-[1200px] mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center shadow-soft">
              <Briefcase className="h-4.5 w-4.5 text-accent-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight">Sociax</span>
          </Link>

          {/* Desktop Navigation - Center (only if links exist) */}
          {navLinks.length > 0 && (
            <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              <div className="flex items-center bg-secondary/70 rounded-full p-1 gap-0.5">
                {navLinks.map((link) => (
                  <Link key={link.path} to={link.path}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-full px-4 h-8 font-medium transition-all duration-200 ${
                        isActive(link.path) 
                          ? "bg-card text-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                      }`}
                    >
                      {link.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </nav>
          )}

          {/* Auth buttons (desktop) - Right */}
          <div className="hidden md:flex items-center gap-2 shrink-0 flex-nowrap">
            {user ? (
              <>
                {/* Profile dropdown - users & founders (employers only need Admin link) */}
                {(!isEmployer || isFounder) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-xl h-9 px-3 text-muted-foreground hover:text-foreground gap-1.5"
                      >
                        <User className="h-4 w-4" />
                        <span className="hidden lg:inline">Profile</span>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => navigate("/profile")}>
                        <User className="h-4 w-4 mr-2" />
                        My Profile
                      </DropdownMenuItem>
                      
                      {/* Debug: Show current role(s) */}
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2 mb-1">
                          <span>Role:</span>
                          <Badge variant={isFounder ? "default" : isEmployer ? "secondary" : "outline"} className="text-xs">
                            {role}
                          </Badge>
                        </div>
                        {allRoles && allRoles.length > 1 && (
                          <div className="flex flex-wrap gap-1">
                            <span>All:</span>
                            {allRoles.map((r, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {r.role}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Admin button for employers (links to /employer) */}
                {isEmployer && !isFounder && (
                  <>
                    <Link to="/employer">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl h-9 px-4 border-border hover:bg-secondary"
                      >
                        <Shield className="h-4 w-4 mr-1.5" />
                        Admin
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleSignOut}
                      className="rounded-xl h-9 px-3 text-destructive hover:text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* Founder controls - Founder + Admin links */}
                {isFounder && (
                  <>
                    <Link to="/founder/employers">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl h-9 px-4 border-border hover:bg-secondary"
                      >
                        <Crown className="h-4 w-4 mr-1.5" />
                        Founder
                      </Button>
                    </Link>
                    <Link to="/admin">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl h-9 px-4 border-border hover:bg-secondary"
                      >
                        <Shield className="h-4 w-4 mr-1.5" />
                        Admin
                      </Button>
                    </Link>
                  </>
                )}
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="rounded-xl h-9 px-4 text-muted-foreground hover:text-foreground"
                  >
                    Log in
                  </Button>
                </Link>
                <Link to="/auth?signup=true">
                  <Button 
                    size="sm"
                    className="rounded-xl h-9 px-5 bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm"
                  >
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-xl"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-slide-up">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link 
                  key={link.path} 
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive(link.path) ? "secondary" : "ghost"}
                    className="w-full justify-start rounded-xl"
                  >
                    {link.label}
                  </Button>
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
                {user ? (
                  <>
                    {/* Profile link - only for non-employer or founder */}
                    {(!isEmployer || isFounder) && (
                      <Link to="/profile" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full rounded-xl justify-start">
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Button>
                      </Link>
                    )}

                    {/* Debug: Show role on mobile */}
                    <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                      <span>Current role:</span>
                      <Badge variant={isFounder ? "default" : isEmployer ? "secondary" : "outline"} className="text-xs">
                        {role}
                      </Badge>
                    </div>

                    {/* Admin link for employers */}
                    {isEmployer && !isFounder && (
                      <Link to="/employer" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full rounded-xl justify-start">
                          <Shield className="h-4 w-4 mr-2" />
                          Admin
                        </Button>
                      </Link>
                    )}

                    {/* Founder controls */}
                    {isFounder && (
                      <>
                        <Link to="/founder/employers" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full rounded-xl justify-start">
                            <Crown className="h-4 w-4 mr-2" />
                            Founder
                          </Button>
                        </Link>
                        <Link to="/admin" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full rounded-xl justify-start">
                            <Shield className="h-4 w-4 mr-2" />
                            Admin
                          </Button>
                        </Link>
                      </>
                    )}

                    <Button 
                      variant="ghost" 
                      className="w-full rounded-xl justify-start text-destructive hover:text-destructive" 
                      onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Link to="/auth" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full rounded-xl">Log in</Button>
                    </Link>
                    <Link to="/auth?signup=true" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full rounded-xl bg-accent hover:bg-accent/90">Sign up</Button>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
