import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Ban } from "lucide-react";

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
            <p className="text-xs text-muted-foreground">
              If you believe this is a mistake, please contact support.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
