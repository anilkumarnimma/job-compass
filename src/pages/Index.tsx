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
  AlertCircle,
  Sparkles
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
      <section className="relative py-24 md:py-32 overflow-hidden noise-bg">
        <div className="container max-w-6xl mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-8 stagger-fade-in border border-accent/20"
            >
              <Sparkles className="h-4 w-4" />
              Your job search, simplified
            </div>
            
            <h1 
              className="font-display text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground leading-[1.1] mb-6 stagger-fade-in"
              style={{ animationDelay: "100ms" }}
            >
              Land the Career
              <span className="block text-accent mt-1">You Deserve</span>
            </h1>
            
            <p 
              className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed stagger-fade-in"
              style={{ animationDelay: "200ms" }}
            >
              Search curated job listings, apply with one click, and automatically track 
              all your applications in one clean dashboard.
            </p>
              
            <div 
              className="flex flex-col sm:flex-row items-center justify-center gap-4 stagger-fade-in"
              style={{ animationDelay: "300ms" }}
            >
              <Link to="/dashboard">
                <Button size="lg" className="w-full sm:w-auto rounded-full px-8 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm hover:shadow-glow transition-all duration-300 group">
                  Browse Jobs
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-full px-8 border-border hover:bg-secondary">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative gradient orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/3 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Hiring Signals Section */}
      <section className="py-16 border-y border-border/30">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
              Real-time hiring signals
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              See what's happening in the job market right now with Sociax.tech
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {hiringSignals.map((signal, index) => (
              <div 
                key={signal.title}
                className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border/50 card-glow stagger-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <signal.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground text-sm mb-1">{signal.title}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">{signal.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need to land your next role
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Stop juggling spreadsheets. Sociax.tech keeps everything organized.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="p-7 rounded-2xl bg-card border border-border/50 card-glow stagger-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5">
                  <feature.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-display font-bold text-foreground text-xl mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 border-y border-border/30">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-5">
                Streamline your job search
              </h2>
              <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                Sociax.tech makes it easy to find, apply, and track opportunities 
                so you can focus on what matters: landing interviews.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, i) => (
                  <li 
                    key={benefit} 
                    className="flex items-center gap-3 text-foreground stagger-fade-in"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    <span className="text-lg">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 w-full max-w-md">
              <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-premium card-glow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-foreground">Senior Developer</p>
                    <p className="text-sm text-muted-foreground">TechCorp Inc.</p>
                  </div>
                </div>
                <div className="flex gap-2 mb-5">
                  <span className="px-3 py-1 rounded-full bg-success-bg text-success-text text-xs font-medium">
                    ● Actively Reviewing
                  </span>
                  <span className="px-3 py-1 rounded-full bg-secondary text-foreground text-xs font-medium">
                    Remote
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 group">
                    Apply Now
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full">Save</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden noise-bg">
        <div className="container max-w-6xl mx-auto px-4 text-center relative z-10">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-5">
            Ready to start your job search?
          </h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto text-lg">
            Join thousands of job seekers who use Sociax.tech to find and land their dream jobs.
          </p>
          <Link to="/dashboard">
            <Button 
              size="lg" 
              className="rounded-full px-10 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm hover:shadow-glow transition-all duration-300 group"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      </section>
    </Layout>
  );
}
