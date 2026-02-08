import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/usePermissions";
import { Briefcase, Menu, X, LogOut, Shield, User, Crown } from "lucide-react";
import { useState } from "react";

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: userRole } = useUserRole();
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
  const getNavLinks = () => {
    if (isFounder) {
      // Founder sees everything
      return [
        { path: "/dashboard", label: "Jobs" },
        { path: "/applied", label: "Applied" },
        { path: "/saved", label: "Saved" },
      ];
    }
    if (isEmployer) {
      // Employer only sees Employer Dashboard link (no job seeker tabs)
      return [];
    }
    // Regular user sees job seeker tabs
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
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center shadow-soft">
              <Briefcase className="h-4.5 w-4.5 text-accent-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight">Sociax</span>
          </Link>

          {/* Desktop Navigation - Center (only show if there are nav links) */}
          {navLinks.length > 0 && (
            <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              <div className="flex items-center bg-secondary/70 rounded-full p-1">
                {navLinks.map((link) => (
                  <Link key={link.path} to={link.path}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-full px-5 h-9 font-medium transition-all duration-200 ${
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
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {/* Profile - show for users and founders */}
                {(isFounder || (!isFounder && !isEmployer)) && (
                  <Link to="/profile">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="rounded-xl h-9 px-4 text-muted-foreground hover:text-foreground"
                    >
                      <User className="h-4 w-4 mr-1.5" />
                      Profile
                    </Button>
                  </Link>
                )}

                {/* Employer Dashboard - only for employers */}
                {isEmployer && !isFounder && (
                  <Link to="/employer">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl h-9 px-4 border-border hover:bg-secondary"
                    >
                      <Shield className="h-4 w-4 mr-1.5" />
                      Employer Dashboard
                    </Button>
                  </Link>
                )}

                {/* Founder controls - only for founders */}
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

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="rounded-xl h-9 px-4 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4 mr-1.5" />
                  Sign out
                </Button>
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
                    {/* Profile - show for users and founders */}
                    {(isFounder || (!isFounder && !isEmployer)) && (
                      <Link to="/profile" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full rounded-xl">
                          <User className="h-4 w-4 mr-1" />
                          Profile
                        </Button>
                      </Link>
                    )}

                    {/* Employer Dashboard - only for employers */}
                    {isEmployer && !isFounder && (
                      <Link to="/employer" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full rounded-xl">
                          <Shield className="h-4 w-4 mr-1" />
                          Employer Dashboard
                        </Button>
                      </Link>
                    )}

                    {/* Founder controls - only for founders */}
                    {isFounder && (
                      <>
                        <Link to="/founder/employers" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full rounded-xl">
                            <Crown className="h-4 w-4 mr-1" />
                            Founder
                          </Button>
                        </Link>
                        <Link to="/admin" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full rounded-xl">
                            <Shield className="h-4 w-4 mr-1" />
                            Admin
                          </Button>
                        </Link>
                      </>
                    )}

                    <Button 
                      variant="ghost" 
                      className="w-full rounded-xl" 
                      onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/auth" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full rounded-xl">Log in</Button>
                    </Link>
                    <Link to="/auth?signup=true" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full rounded-xl bg-accent hover:bg-accent/90">Sign up</Button>
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
