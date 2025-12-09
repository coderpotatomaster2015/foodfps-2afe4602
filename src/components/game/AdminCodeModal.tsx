import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { toast } from "sonner";

interface AdminCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ADMIN_CODE = "2698";

export const AdminCodeModal = ({ open, onOpenChange, onSuccess }: AdminCodeModalProps) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === ADMIN_CODE) {
      setError(false);
      setCode("");
      onSuccess();
      onOpenChange(false);
      toast.success("Admin panel unlocked");
    } else {
      setError(true);
      toast.error("Invalid code");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Admin Access
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter admin code..."
              className={error ? "border-destructive" : ""}
              autoFocus
            />
            {error && (
              <p className="text-xs text-destructive">Invalid code. Try again.</p>
            )}
          </div>
          <Button type="submit" className="w-full">
            Unlock Panel
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};