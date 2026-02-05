import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanyLogoProps {
  logoUrl: string | null;
  companyName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CompanyLogo({ logoUrl, companyName, size = "md", className }: CompanyLogoProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-14 w-14 text-base",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <Avatar className={cn(sizeClasses[size], "rounded-xl shrink-0", className)}>
      {logoUrl ? (
        <AvatarImage
          src={logoUrl}
          alt={`${companyName} logo`}
          className="object-cover"
          onError={(e) => {
            // Hide broken image, fallback will show
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : null}
      <AvatarFallback className="rounded-xl bg-secondary text-secondary-foreground font-medium">
        {companyName ? getInitials(companyName) : <Building2 className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  );
}
