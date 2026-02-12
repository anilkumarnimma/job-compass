import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { CheckCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PaymentSuccess() {
  const navigate = useNavigate();

  const handleGoToJobs = () => {
    navigate("/dashboard?premium=true");
  };

  return (
    <Layout>
      <div className="container max-w-md mx-auto px-6 py-24 text-center">
        <CheckCircle className="h-16 w-16 text-primary mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Thank you for upgrading!
        </h1>
        <p className="text-muted-foreground mb-2">
          Your premium subscription is being activated. This may take a few moments.
        </p>
        <p className="text-sm text-muted-foreground mb-8 flex items-center justify-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          If your status hasn't updated, try refreshing the page.
        </p>
        <Button
          className="w-full rounded-xl"
          onClick={handleGoToJobs}
        >
          Go to Job Board
        </Button>
      </div>
    </Layout>
  );
}
