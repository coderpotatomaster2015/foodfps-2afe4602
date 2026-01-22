import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RedeemCodeInput } from "./RedeemCodeInput";

interface RedeemCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RedeemCodeModal = ({ open, onOpenChange }: RedeemCodeModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🎟️ Redeem Code
          </DialogTitle>
        </DialogHeader>
        <RedeemCodeInput />
      </DialogContent>
    </Dialog>
  );
};
