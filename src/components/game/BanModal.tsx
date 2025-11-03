import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Ban } from "lucide-react";

interface BanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PlayerProfile {
  user_id: string;
  username: string;
}

export const BanModal = ({ open, onOpenChange }: BanModalProps) => {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [banningUserId, setBanningUserId] = useState<string | null>(null);
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");

  useState(() => {
    if (open) {
      loadPlayers();
    }
  });

  const loadPlayers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username")
        .order("username");

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error("Error loading players:", error);
      toast.error("Failed to load players");
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (userId: string) => {
    setBanningUserId(userId);
  };

  const confirmBan = async () => {
    if (!banningUserId || !hours || parseInt(hours) < 1) {
      toast.error("Please enter valid hours");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(hours));

      const { error } = await supabase.from("bans").insert({
        user_id: banningUserId,
        banned_by: user.id,
        reason: reason || "No reason provided",
        hours: parseInt(hours),
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      toast.success("Player banned successfully");
      setBanningUserId(null);
      setHours("");
      setReason("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error banning player:", error);
      toast.error(error.message || "Failed to ban player");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-destructive" />
            Ban Player
          </DialogTitle>
        </DialogHeader>

        {!banningUserId ? (
          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {players.map((player) => (
                  <div
                    key={player.user_id}
                    className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-secondary/80"
                  >
                    <span className="font-medium">{player.username}</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleBan(player.user_id)}
                    >
                      Ban
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Hours</label>
              <Input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Enter hours (e.g., 24)"
                min="1"
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Reason (optional)
              </label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason..."
                className="bg-input border-border"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={confirmBan}
              >
                Confirm Ban
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setBanningUserId(null);
                  setHours("");
                  setReason("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
