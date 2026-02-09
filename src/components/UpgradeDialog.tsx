import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";

const STRIPE_LINK = "https://buy.stripe.com/test_eVq28rgVxdQO6Vt0Lp1wY00";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeDialog({ open, onOpenChange }: UpgradeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-6 gap-0">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-bold text-foreground">
            Free limit reached
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            You've used your 1 free application. Upgrade to Premium to apply to unlimited jobs.
          </DialogDescription>
          <p className="text-xs text-muted-foreground/70 pt-1">
            Premium: $5.99/month
          </p>
        </DialogHeader>
        <DialogFooter className="flex-row justify-end gap-2 pt-6">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl px-5"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            size="sm"
            className="rounded-xl px-5 bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm"
            onClick={() => {
              window.open(STRIPE_LINK, "_blank");
              onOpenChange(false);
            }}
          >
            <Crown className="h-4 w-4 mr-1.5" />
            Upgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
