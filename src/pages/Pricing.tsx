import { Layout } from "@/components/Layout";
import { PricingSection } from "@/components/PricingSection";
import { FAQSection } from "@/components/FAQSection";
import { Helmet } from "react-helmet-async";

export default function Pricing() {
  return (
    <Layout>
      <Helmet>
        <title>Pricing — Sociax</title>
        <meta
          name="description"
          content="Sociax is free to start. Upgrade to Premium for AI-tailored resumes, cover letters, ATS scoring, and interview prep."
        />
        <link rel="canonical" href="https://www.sociax.tech/pricing" />
      </Helmet>

      <div className="min-h-[calc(100vh-64px)] bg-background">
        <div className="pt-10 md:pt-16">
          <div className="text-center max-w-2xl mx-auto px-4">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Pricing
            </h1>
            <p className="mt-3 text-muted-foreground">
              Free forever for browsing and applying. Premium unlocks the AI tools that get you hired faster.
            </p>
          </div>
        </div>
        <PricingSection />
        <FAQSection />
      </div>
    </Layout>
  );
}
