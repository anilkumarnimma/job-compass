import { Briefcase } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/30 bg-card/50 py-10 mt-auto backdrop-blur-sm">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-accent/10 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-accent" />
            </div>
            <span className="font-display font-semibold text-sm text-foreground">Sociax.tech</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Sociax.tech. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
