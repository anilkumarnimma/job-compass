import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/usePermissions";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: ("founder" | "employer" | "user")[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useUserRole();

  useEffect(() => {
    if (authLoading || roleLoading) return;

    // Not logged in - redirect to auth
    if (!user) {
      navigate("/auth");
      return;
    }

    const currentRole = userRole || "user";

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(currentRole as any)) {
      // Redirect based on their actual role
      switch (currentRole) {
        case "founder":
          navigate("/admin");
          break;
        case "employer":
          navigate("/employer");
          break;
        default:
          navigate("/dashboard");
          break;
      }
    }
  }, [user, userRole, authLoading, roleLoading, allowedRoles, navigate]);

  // Show loading while checking auth/role
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return null;
  }

  const currentRole = userRole || "user";

  // Not authorized for this route
  if (!allowedRoles.includes(currentRole as any)) {
    return null;
  }

  return <>{children}</>;
}
