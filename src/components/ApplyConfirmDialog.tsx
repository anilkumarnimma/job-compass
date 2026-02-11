import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X } from "lucide-react";

interface ApplyConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ApplyConfirmDialog({ open, onConfirm, onCancel }: ApplyConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg">
            Did you complete the application?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            We opened the external application page in a new tab. Let us know if
            you finished applying so we can track it for you.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 sm:gap-3">
          <Button variant="outline" onClick={onCancel} className="gap-2">
            <X className="h-4 w-4" />
            Not Yet
          </Button>
          <Button onClick={onConfirm} className="gap-2 bg-foreground text-background hover:bg-foreground/90">
            <CheckCircle2 className="h-4 w-4" />
            Yes, I Applied
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
