 import { Briefcase } from "lucide-react";
 
 export function Footer() {
   return (
     <footer className="border-t border-border/60 bg-card py-8 mt-auto">
       <div className="container max-w-6xl mx-auto px-4">
         <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-2">
             <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center">
               <Briefcase className="h-3.5 w-3.5 text-accent" />
             </div>
             <span className="font-medium text-sm text-muted-foreground">Sociax</span>
           </div>
           <p className="text-sm text-muted-foreground">
           © {new Date().getFullYear()} Sociax. All rights reserved.
           </p>
         </div>
       </div>
     </footer>
   );
 }