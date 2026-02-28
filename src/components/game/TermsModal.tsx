import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";

interface TermsModalProps {
  open: boolean;
  onAccept: () => void;
  onDeny: () => void;
}

export const TermsModal = ({ open, onAccept, onDeny }: TermsModalProps) => {
  const [agreed, setAgreed] = useState(false);
  const [hasOpenedTerms, setHasOpenedTerms] = useState(false);

  const handleOpenTerms = () => {
    window.open("https://foodfps.lovable.app/FoodFPS_Terms_and_Privacy.pdf", "_blank", "noopener,noreferrer");
    setHasOpenedTerms(true);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg border-border bg-card max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-primary bg-clip-text text-transparent flex items-center justify-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Terms & Privacy Policy
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground text-center">
          Before playing Food FPS, you must read and agree to our Terms of Service and Privacy Policy.
        </p>

        <ScrollArea className="flex-1 max-h-[40vh] border border-border rounded-md p-4 bg-background">
          <div className="space-y-4 text-sm text-foreground leading-relaxed">
            <p>
              Please open and review the full Terms of Service and Privacy Policy PDF before choosing whether to continue.
            </p>
            <Button variant="secondary" className="w-full" onClick={handleOpenTerms}>
              Open Terms & Privacy PDF
            </Button>
            <p className="text-xs text-muted-foreground">
              Link: https://foodfps.lovable.app/FoodFPS_Terms_and_Privacy.pdf
            </p>
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2 mt-2">
          <Checkbox
            id="terms-agree"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
            disabled={!hasOpenedTerms}
          />
          <label htmlFor="terms-agree" className="text-sm text-foreground cursor-pointer">
            I reviewed the PDF and agree to the Terms of Service and Privacy Policy
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button
            variant="destructive"
            onClick={onDeny}
            disabled={!hasOpenedTerms}
          >
            Deny
          </Button>

          <Button
            variant="gaming"
            disabled={!agreed || !hasOpenedTerms}
            onClick={onAccept}
          >
            Accept
          </Button>
        </div>

        {!hasOpenedTerms && (
          <p className="text-xs text-center text-muted-foreground">
            Open the PDF first to enable Accept or Deny.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
