import { cn } from "@/lib/utils";

interface JobPulseLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}

export function JobPulseLogo({ size = "md", className, showText = true }: JobPulseLogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-0.5", className)}>
      {/* Logo Icon - Abstract "J" shape */}
      <div className={cn(sizeClasses[size], "relative")}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Gradient background circle */}
          <defs>
            <linearGradient id="jobpulseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(221, 83%, 53%)" />
              <stop offset="100%" stopColor="hsl(262, 83%, 58%)" />
            </linearGradient>
          </defs>
          
          {/* Main circle */}
          <circle cx="20" cy="20" r="18" fill="url(#jobpulseGradient)" />
          
          {/* Abstract "J" path */}
          <path
            d="M14 14C14 14 16 12 20 12C24 12 26 14 26 16C26 18 24 20 20 20C16 20 14 22 14 24C14 26 16 28 20 28C24 28 26 26 26 26"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
      
      {showText && (
        <span className={cn("font-bold text-foreground", textSizes[size])}>
          Sociax.tech
        </span>
      )}
    </div>
  );
}