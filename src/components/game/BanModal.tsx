import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Ban, Clock, AlertTriangle } from "lucide-react";

interface BanInfo {
  expires_at: string;
  reason: string;
  hours_remaining: number;
}

interface BanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banInfo?: BanInfo | null;
}

interface PlayerProfile {
  user_id: string;
  username: string;
}

export const BanModal = ({ open, onOpenChange, banInfo }: BanModalProps) => {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [banningUserId, setBanningUserId] = useState<string | null>(null);
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");
  const [appealMessage, setAppealMessage] = useState("");
  const [sendingAppeal, setSendingAppeal] = useState(false);

  useEffect(() => {
    if (open && !banInfo) {
      loadPlayers();
    }
  }, [open, banInfo]);

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

  const sendAppeal = async () => {
    if (!appealMessage.trim()) {
      toast.error("Please enter your appeal message");
      return;
    }

    setSendingAppeal(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .single();

      // Find admin to send to
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1);

      if (!admins || admins.length === 0) {
        toast.error("No admin available to receive appeals");
        return;
      }

      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", admins[0].user_id)
        .single();

      await supabase.from("messages").insert({
        from_user_id: user.id,
        from_username: profile?.username || "Unknown",
        to_user_id: admins[0].user_id,
        to_username: adminProfile?.username || "Admin",
        subject: "Ban Appeal Request",
        content: `[BAN APPEAL]\n\nBan expires: ${banInfo?.expires_at ? new Date(banInfo.expires_at).toLocaleString() : "Unknown"}\nReason: ${banInfo?.reason || "No reason given"}\n\nAppeal:\n${appealMessage}`,
        is_appeal: true,
      });

      toast.success("Appeal sent! Please wait for admin review.");
      setAppealMessage("");
    } catch (error: any) {
      console.error("Error sending appeal:", error);
      toast.error("Failed to send appeal");
    } finally {
      setSendingAppeal(false);
    }
  };

  // If showing ban info for banned user
  if (banInfo) {
    const hoursRemaining = Math.ceil(banInfo.hours_remaining);
    const expiresDate = new Date(banInfo.expires_at);
    
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md bg-card border-destructive">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-6 h-6" />
              Account Banned
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <Ban className="w-5 h-5" />
                <span className="font-bold text-lg">You are currently banned</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span><strong>Time remaining:</strong> {hoursRemaining} hour{hoursRemaining !== 1 ? "s" : ""}</span>
                </div>
                <div>
                  <strong>Expires:</strong> {expiresDate.toLocaleString()}
                </div>
                <div>
                  <strong>Reason:</strong> {banInfo.reason || "No reason provided"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Submit Appeal</label>
              <Textarea
                value={appealMessage}
                onChange={(e) => setAppealMessage(e.target.value)}
                placeholder="Explain why your ban should be lifted..."
                rows={4}
                className="bg-input border-border"
              />
            </div>

            <Button 
              onClick={sendAppeal} 
              className="w-full"
              disabled={sendingAppeal || !appealMessage.trim()}
            >
              {sendingAppeal ? "Sending..." : "Send Appeal to Admin"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Admin ban modal
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
