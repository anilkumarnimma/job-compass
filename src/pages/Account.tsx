import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Crown, CreditCard, Sparkles, Check, Loader2,
  Shield, Zap, FileText, BarChart3, Brain, Star, XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STRIPE_LINK = "https://buy.stripe.com/eVqaEX9treQ0eOL4dX3AY00";

const FREE_FEATURES = [
  "Browse all job listings",
  "1 free job application",
  "Basic job search & filters",
  "Save jobs for later",
];

const PREMIUM_FEATURES = [
  "Unlimited job applications",
  "AI-powered resume analysis",
  "ATS compatibility checker",
  "AI cover letter generator",
  "Smart resume tips",
  "Priority access to new jobs",
  "Auto-tracking of applied jobs",
  "Landing probability scores",
];

function StatusBadge({ isSubscribed, isPremium }: { isSubscribed: boolean; isPremium: boolean }) {
  if (isSubscribed && isPremium) {
    return <Badge className="bg-accent text-accent-foreground">Active</Badge>;
  }
  if (isPremium) {
    return <Badge variant="secondary">Premium</Badge>;
  }
  return <Badge variant="outline">Free</Badge>;
}

export default function Account() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { toast } = useToast();
  const [cancelLoading, setCancelLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["user_subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-3xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const isPremium = profile?.is_premium ?? false;
  const isSubscribed = subscription?.is_subscribed ?? false;
  const renewalDate = subscription?.next_renewal_date;
  const isLoading = profileLoading || subLoading;

  const handleUpgrade = () => {
    const link = `${STRIPE_LINK}?prefilled_email=${encodeURIComponent(user.email || "")}`;
    window.open(link, "_blank");
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err: any) {
      toast({
        title: "Unable to open billing portal",
        description: err.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl mx-auto px-4 py-8 pb-24">
        {/* Page title */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Account & Billing</h1>
            <p className="text-sm text-muted-foreground">Manage your subscription and billing details</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* ── Current Plan ── */}
          <Card className="border-border/50 shadow-soft overflow-hidden">
            {isPremium && (
              <div className="h-1 bg-gradient-to-r from-accent via-accent/70 to-accent/40" />
            )}
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-accent" />
                  <CardTitle className="text-lg">Current Plan</CardTitle>
                </div>
                {isLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <StatusBadge isSubscribed={isSubscribed} isPremium={isPremium} />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-64" />
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-display font-bold text-foreground">
                      {isPremium ? "$5.99" : "$0"}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {isPremium ? "/ month" : "Free forever"}
                    </span>
                  </div>

                  {renewalDate && isSubscribed && (
                    <p className="text-sm text-muted-foreground">
                      Next billing date:{" "}
                      <span className="font-medium text-foreground">
                        {new Date(renewalDate).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </p>
                  )}

                  {!isPremium && (
                    <Button
                      onClick={handleUpgrade}
                      className="w-full sm:w-auto rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm hover:shadow-glow transition-all"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Upgrade to Premium — $5.99/mo
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Plan Comparison ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Free tier */}
            <Card className={`border-border/50 shadow-soft ${!isPremium ? "ring-2 ring-accent/20" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Free</CardTitle>
                  {!isPremium && (
                    <Badge variant="outline" className="text-xs">Current</Badge>
                  )}
                </div>
                <CardDescription className="text-xs">Get started with the basics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-display font-bold text-foreground mb-4">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <ul className="space-y-2">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Premium tier */}
            <Card className={`border-border/50 shadow-soft relative ${isPremium ? "ring-2 ring-accent/30" : ""}`}>
              {isPremium && (
                <div className="absolute -top-2.5 left-4">
                  <Badge className="bg-accent text-accent-foreground text-xs shadow-sm">
                    <Star className="h-3 w-3 mr-1" /> Your Plan
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2 pt-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Premium</CardTitle>
                  {isPremium && (
                    <Badge variant="outline" className="text-xs">Current</Badge>
                  )}
                </div>
                <CardDescription className="text-xs">Everything you need to land your dream job</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-display font-bold text-foreground mb-4">$5.99<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <ul className="space-y-2">
                  {PREMIUM_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isPremium && (
                  <Button
                    onClick={handleUpgrade}
                    className="w-full mt-4 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground"
                    size="sm"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Upgrade
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Subscription Management ── */}
          {isPremium && (
            <Card className="border-border/50 shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-accent" />
                  <CardTitle className="text-lg">Manage Subscription</CardTitle>
                </div>
                <CardDescription>
                  Update your payment method, download invoices, or cancel your subscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Use the billing portal to manage all aspects of your subscription, including:
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5 text-accent" />
                    Update payment method
                  </li>
                  <li className="flex items-center gap-2">
                    <Receipt className="h-3.5 w-3.5 text-accent" />
                    View invoices & receipts
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-accent" />
                    Change or cancel plan
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-accent" />
                    Reactivate subscription
                  </li>
                </ul>
                <Button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  variant="outline"
                  className="rounded-xl mt-2"
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Open Billing Portal
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Premium Features Locked (for free users) ── */}
          {!isPremium && (
            <Card className="border-border/50 shadow-soft bg-muted/30">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent" />
                  <CardTitle className="text-lg">Unlock Premium Features</CardTitle>
                </div>
                <CardDescription>
                  Upgrade to access powerful AI tools that help you stand out
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: Brain, label: "AI Resume Analysis", desc: "Get smart career insights" },
                    { icon: FileText, label: "AI Cover Letters", desc: "Generate tailored cover letters" },
                    { icon: BarChart3, label: "ATS Checker", desc: "Optimize for applicant tracking" },
                    { icon: Star, label: "Landing Probability", desc: "See your match scores" },
                  ].map(({ icon: Icon, label, desc }) => (
                    <div
                      key={label}
                      className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border/30"
                    >
                      <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleUpgrade}
                  className="w-full mt-4 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm hover:shadow-glow transition-all"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade to Premium — $5.99/mo
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
