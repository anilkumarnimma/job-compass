 import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
 import { Building2 } from "lucide-react";
 
 interface CompanyLogoProps {
   logoUrl: string | null;
   companyName: string;
   size?: "sm" | "md" | "lg";
 }
 
 export function CompanyLogo({ logoUrl, companyName, size = "md" }: CompanyLogoProps) {
   const sizeClasses = {
     sm: "h-8 w-8 text-xs",
     md: "h-10 w-10 text-sm",
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
     <Avatar className={`${sizeClasses[size]} rounded-lg shrink-0`}>
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
       <AvatarFallback className="rounded-lg bg-secondary text-secondary-foreground font-medium">
         {companyName ? getInitials(companyName) : <Building2 className="h-4 w-4" />}
       </AvatarFallback>
     </Avatar>
   );
 }