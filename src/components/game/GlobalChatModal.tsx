import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GlobalChat } from "./GlobalChat";

interface GlobalChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
}

export const GlobalChatModal = ({ open, onOpenChange, userId, username }: GlobalChatModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Global Chat</DialogTitle>
        </DialogHeader>
        <GlobalChat userId={userId} username={username} />
      </DialogContent>
    </Dialog>
  );
};
