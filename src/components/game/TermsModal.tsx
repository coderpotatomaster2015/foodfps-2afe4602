import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";

interface TermsModalProps {
  open: boolean;
  onAccept: () => void;
}

export const TermsModal = ({ open, onAccept }: TermsModalProps) => {
  const [agreed, setAgreed] = useState(false);

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
            <h3 className="font-bold text-primary">Terms of Service</h3>
            <p>By playing Food FPS, you agree to the following terms:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must be at least 13 years old to use this service.</li>
              <li>You are responsible for your account and all activity under it.</li>
              <li>You agree not to cheat, exploit bugs, or use unauthorized tools.</li>
              <li>You agree not to harass, bully, or abuse other players.</li>
              <li>Admins and owners reserve the right to ban or restrict accounts at any time.</li>
              <li>Your username must not contain offensive, inappropriate, or impersonating content.</li>
              <li>We may modify or discontinue the game at any time without notice.</li>
            </ul>

            <h3 className="font-bold text-primary mt-4">Privacy Policy</h3>
            <p>We collect and store the following data:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account information (username, email, scores, progress).</li>
              <li>Game activity (matches played, chat messages, social posts).</li>
              <li>Technical data (login timestamps, session info).</li>
            </ul>
            <p>Your data is used solely to operate and improve Food FPS. We do not sell your personal information to third parties.</p>
            <p>You may request account deletion by contacting an admin.</p>

            <p className="text-xs text-muted-foreground mt-4">
              Full document available:{" "}
              <a
                href="/FoodFPS_Terms_and_Privacy.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Download PDF
              </a>
            </p>
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2 mt-2">
          <Checkbox
            id="terms-agree"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
          />
          <label htmlFor="terms-agree" className="text-sm text-foreground cursor-pointer">
            I have read and agree to the Terms of Service and Privacy Policy
          </label>
        </div>

        <Button
          variant="gaming"
          className="w-full mt-2"
          disabled={!agreed}
          onClick={onAccept}
        >
          Accept & Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
};
