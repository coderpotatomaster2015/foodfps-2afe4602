import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface UsernameModalProps {
  open: boolean;
  onUsernameSet: (username: string) => void;
}

export const UsernameModal = ({ open, onUsernameSet }: UsernameModalProps) => {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim().length >= 2) {
      onUsernameSet(input.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-primary bg-clip-text text-transparent">
            Welcome to Food FPS
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Choose your username:</label>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter username..."
              maxLength={20}
              className="bg-input border-border"
              autoFocus
            />
          </div>
          <Button 
            type="submit" 
            variant="gaming" 
            className="w-full"
            disabled={input.trim().length < 2}
          >
            Start Playing
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
