import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { 
  Briefcase, 
  Search, 
  BookmarkCheck, 
  Zap, 
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  PieChart,
  AlertCircle
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Smart Search",
    description: "Find the perfect job with powerful search across titles, skills, and companies.",
  },
  {
    icon: BookmarkCheck,
    title: "Track Applications",
    description: "Automatically track every job you apply to with timestamps and easy access.",
  },
  {
    icon: Zap,
    title: "Stay Updated",
    description: "See which companies are actively reviewing applications right now.",
  },
];

const benefits = [
  "One-click apply to external job posts",
  "Save jobs for later",
  "Organized application history",
  "Mobile-friendly design",
];

const hiringSignals = [
  {
    icon: TrendingUp,
    title: "Top Hirings Today",
    description: "Shows most in-demand roles right now",
  },
  {
    icon: PieChart,
    title: "Hiring Graph",
    description: "Visual snapshot of where opportunities are growing",
  },
  {
    icon: AlertCircle,
    title: "Market Alert",
    description: "Quick updates when hiring spikes",
  },
];

export default function Index() {
  return (
    <Layout showFooter={true}>
      {/* Hero Section */}
      <section className="py-20 md:py-28">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
              <Briefcase className="h-4 w-4" />
              Your job search, simplified
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Find Your Next
              <span className="block text-accent">Dream Job</span>
            </h1>
            
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Search curated job listings, apply with one click, and automatically track 
                all your applications in one clean dashboard.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
                <Link to="/dashboard">
                  <Button variant="accent" size="lg" className="w-full sm:w-auto">
                    Browse Jobs
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Create Account
                  </Button>
                </Link>
              </div>

              {/* Founder Quote Card - Premium white card */}
              <div className="flex justify-center mt-8">
                <div className="w-full max-w-sm px-5 py-4 rounded-2xl bg-white border border-border/40 shadow-sm">
                  {/* Blue accent line */}
                  <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-accent ml-5" />
                  
                  <p className="text-sm text-foreground/85 italic leading-relaxed pl-3">
                    "Built by someone who once refreshed job portals at 2 AM."
                  </p>
                  <p className="text-xs text-muted-foreground mt-3 font-medium not-italic pl-3">
                    — Founder, JobPulse
                  </p>
                </div>
              </div>
          </div>
        </div>
      </section>

      {/* Hiring Signals Section */}
      <section className="py-12 bg-muted/30 border-y border-border/40">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
              How JobPulse helps you see real hiring signals
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {hiringSignals.map((signal, index) => (
              <div 
                key={signal.title}
                className="flex items-start gap-3 p-4 rounded-xl bg-background border border-border/60 animate-slide-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <signal.icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-0.5">{signal.title}</h3>
                  <p className="text-muted-foreground text-xs leading-snug">{signal.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-card border-y border-border/60">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Everything you need to land your next role
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
            Stop juggling spreadsheets. JobPulse keeps everything organized.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="p-6 rounded-xl bg-background border border-border/60 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Streamline your job search
              </h2>
              <p className="text-muted-foreground mb-6">
             JobPulse makes it easy to find, apply, and track opportunities 
               so you can focus on what matters: landing interviews.
              </p>
              <ul className="space-y-3">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3 text-foreground">
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 w-full max-w-md">
              <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-elevated">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Senior Developer</p>
                    <p className="text-sm text-muted-foreground">TechCorp Inc.</p>
                  </div>
                </div>
                <div className="flex gap-2 mb-4">
                  <span className="px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                    Actively Reviewing
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="accent" size="sm" className="flex-1">Apply Now</Button>
                  <Button variant="outline" size="sm">Save</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            Ready to start your job search?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Join thousands of job seekers who use JobPulse to find and land their dream jobs.
          </p>
          <Link to="/dashboard">
            <Button 
              size="lg" 
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
