import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gift, Gem, Coins, Star, Shield, Swords, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DailyRewardsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Reward {
  type: string;
  value: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const DAILY_REWARDS: Reward[] = [
  { type: "coins", value: "100", label: "100 Coins", icon: <Coins className="w-6 h-6" />, color: "text-yellow-500" },
  { type: "gems", value: "10", label: "10 Gems", icon: <Gem className="w-6 h-6" />, color: "text-purple-500" },
  { type: "godmode", value: "5", label: "5 Min Godmode", icon: <Shield className="w-6 h-6" />, color: "text-blue-500" },
  { type: "coins", value: "250", label: "250 Coins", icon: <Coins className="w-6 h-6" />, color: "text-yellow-500" },
  { type: "all_guns", value: "5", label: "5 Min All Guns", icon: <Swords className="w-6 h-6" />, color: "text-red-500" },
  { type: "gems", value: "25", label: "25 Gems", icon: <Gem className="w-6 h-6" />, color: "text-purple-500" },
  { type: "gold", value: "5", label: "5 Gold", icon: <Star className="w-6 h-6" />, color: "text-amber-500" },
];

export const DailyRewards = ({ open, onOpenChange }: DailyRewardsProps) => {
  const [currentDay, setCurrentDay] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [lastClaimed, setLastClaimed] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (open) {
      loadRewardStatus();
    }
  }, [open]);

  const loadRewardStatus = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get last claimed reward
      const { data: rewards } = await supabase
        .from("daily_rewards")
        .select("*")
        .eq("user_id", user.id)
        .order("claimed_at", { ascending: false })
        .limit(7);

      if (!rewards || rewards.length === 0) {
        setCurrentDay(0);
        setCanClaim(true);
        setLastClaimed(null);
      } else {
        const lastReward = rewards[0];
        const lastDate = new Date(lastReward.claimed_at);
        const now = new Date();
        
        // Check if it's a new day
        const lastDateStr = lastDate.toDateString();
        const todayStr = now.toDateString();
        
        if (lastDateStr === todayStr) {
          // Already claimed today
          setCanClaim(false);
          setCurrentDay(rewards.length % 7);
        } else {
          // Check if streak continues (claimed yesterday)
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toDateString();
          
          if (lastDateStr === yesterdayStr) {
            // Streak continues
            setCurrentDay(rewards.length % 7);
            setCanClaim(true);
          } else {
            // Streak broken, reset
            setCurrentDay(0);
            setCanClaim(true);
          }
        }
        setLastClaimed(lastDate);
      }
    } catch (error) {
      console.error("Error loading rewards:", error);
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async () => {
    setClaiming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const reward = DAILY_REWARDS[currentDay];

      // Record the claim
      await supabase.from("daily_rewards").insert({
        user_id: user.id,
        reward_type: reward.type,
        reward_value: reward.value,
      });

      // Apply the reward
      if (reward.type === "coins" || reward.type === "gems" || reward.type === "gold") {
        const { data: current } = await supabase
          .from("player_currencies")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (current) {
          const updateData: any = {};
          if (reward.type === "coins") updateData.coins = current.coins + parseInt(reward.value);
          if (reward.type === "gems") updateData.gems = current.gems + parseInt(reward.value);
          if (reward.type === "gold") updateData.gold = current.gold + parseInt(reward.value);

          await supabase
            .from("player_currencies")
            .update(updateData)
            .eq("user_id", user.id);
        } else {
          const insertData: any = { user_id: user.id, coins: 0, gems: 0, gold: 0 };
          if (reward.type === "coins") insertData.coins = parseInt(reward.value);
          if (reward.type === "gems") insertData.gems = parseInt(reward.value);
          if (reward.type === "gold") insertData.gold = parseInt(reward.value);

          await supabase.from("player_currencies").insert(insertData);
        }
        
        toast.success(`Claimed ${reward.label}!`);
      } else if (reward.type === "godmode" || reward.type === "all_guns") {
        // Create a temporary admin abuse event for just this user
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(reward.value));

        await supabase.from("admin_abuse_events").insert({
          event_type: reward.type === "godmode" ? "godmode" : "all_weapons",
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
        });

        toast.success(`${reward.label} activated! Enjoy!`);
      }

      setCanClaim(false);
      setCurrentDay((currentDay + 1) % 7);
    } catch (error) {
      console.error("Error claiming reward:", error);
      toast.error("Failed to claim reward");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Daily Rewards
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-2">
              {DAILY_REWARDS.map((reward, index) => (
                <Card
                  key={index}
                  className={`p-2 flex flex-col items-center justify-center text-center aspect-square ${
                    index === currentDay && canClaim
                      ? "border-primary bg-primary/10 ring-2 ring-primary"
                      : index < currentDay || (index === currentDay && !canClaim)
                      ? "bg-secondary/50 opacity-60"
                      : "bg-secondary/30"
                  }`}
                >
                  <span className="text-xs text-muted-foreground mb-1">Day {index + 1}</span>
                  <div className={reward.color}>{reward.icon}</div>
                  <span className="text-[10px] mt-1 font-medium">{reward.label.split(" ")[0]}</span>
                  {(index < currentDay || (index === currentDay && !canClaim)) && (
                    <Trophy className="w-3 h-3 text-green-500 mt-1" />
                  )}
                </Card>
              ))}
            </div>

            {canClaim ? (
              <Button
                className="w-full"
                onClick={claimReward}
                disabled={claiming}
              >
                {claiming ? "Claiming..." : `Claim Day ${currentDay + 1} Reward: ${DAILY_REWARDS[currentDay].label}`}
              </Button>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Come back tomorrow for your next reward!</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Current streak: Day {currentDay + 1}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
