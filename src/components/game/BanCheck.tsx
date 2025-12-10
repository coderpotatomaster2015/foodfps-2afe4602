import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ban, Mail } from "lucide-react";
import { toast } from "sonner";

interface BanCheckProps {
  children: React.ReactNode;
}

export const BanCheck = ({ children }: BanCheckProps) => {
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState<{
    reason: string | null;
    hoursRemaining: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [appealSent, setAppealSent] = useState(false);
  const [sendingAppeal, setSendingAppeal] = useState(false);

  useEffect(() => {
    checkBanStatus();
  }, []);

  const checkBanStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("get_ban_info", {
        _user_id: user.id,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setIsBanned(true);
        setBanInfo({
          reason: data[0].reason,
          hoursRemaining: Math.ceil(data[0].hours_remaining),
        });
      }
    } catch (error) {
      console.error("Error checking ban status:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendAppeal = async () => {
    setSendingAppeal(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .single();

      // Find admin to send appeal to
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1)
        .single();

      if (!adminRole) {
        toast.error("No admin available to receive appeals");
        return;
      }

      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", adminRole.user_id)
        .single();

      const username = profile?.username || "Unknown User";
      
      const { error } = await supabase.from("messages").insert({
        from_user_id: user.id,
        from_username: username,
        to_user_id: adminRole.user_id,
        to_username: adminProfile?.username || "Admin",
        subject: "Ban Appeal Request",
        content: `${username} is requesting a ban appeal.\n\nBan Reason: ${banInfo?.reason || "Not specified"}\nTime Remaining: ~${banInfo?.hoursRemaining} hours\n\nPlease review this ban and consider an early appeal.`,
        is_appeal: true,
      });

      if (error) throw error;

      setAppealSent(true);
      toast.success("Appeal request sent to admin");
    } catch (error: any) {
      console.error("Error sending appeal:", error);
      toast.error(error.message || "Failed to send appeal");
    } finally {
      setSendingAppeal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isBanned && banInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md p-8 bg-card border-destructive">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
              <Ban className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-destructive">
              Account Banned
            </h1>
            <div className="space-y-2">
              {banInfo.reason && (
                <p className="text-muted-foreground">
                  Reason: {banInfo.reason}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Time remaining: ~{banInfo.hoursRemaining} hours
              </p>
            </div>
            
            {appealSent ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mt-4">
                <p className="text-green-500 text-sm">
                  ✓ Your appeal has been sent to the admin. Please wait for their response.
                </p>
              </div>
            ) : (
              <Button 
                onClick={sendAppeal} 
                disabled={sendingAppeal}
                variant="outline"
                className="w-full mt-4"
              >
                <Mail className="w-4 h-4 mr-2" />
                {sendingAppeal ? "Sending Appeal..." : "Request Ban Appeal"}
              </Button>
            )}
            
            <p className="text-xs text-muted-foreground mt-4">
              Your appeal will be reviewed by an admin who can grant early release.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
