import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Utensils, Gift, Coins, Gem, Medal, Zap, Check, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateFoodPassTiers, type GeneratedTier } from "@/utils/foodPassAlgorithm";

interface FoodPassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Tier {
  id: string;
  tier: number;
  score_required: number;
  reward_type: string;
  reward_value: number;
  power_unlock: string | null;
}

export const FoodPassModal = ({ open, onOpenChange }: FoodPassModalProps) => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [claimedTiers, setClaimedTiers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load tiers
      const { data: tiersData } = await supabase
        .from("food_pass_tiers")
        .select("*")
        .order("tier", { ascending: true })
        .limit(600);

      if (tiersData) setTiers(tiersData);

      // Load player score
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_score")
        .eq("user_id", user.id)
        .single();

      if (profile) setCurrentScore(profile.total_score);

      // Load claimed tiers - upsert if not exists
      const { data: progress } = await supabase
        .from("food_pass_progress")
        .select("claimed_tiers, current_tier")
        .eq("user_id", user.id)
        .maybeSingle();

      if (progress) {
        setClaimedTiers(progress.claimed_tiers || []);
      } else {
        // Create initial progress record
        await supabase.from("food_pass_progress").insert({
          user_id: user.id,
          current_tier: 0,
          claimed_tiers: [],
        });
        setClaimedTiers([]);
      }
    } catch (error) {
      console.error("Error loading food pass data:", error);
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (tier: Tier) => {
    if (currentScore < tier.score_required || claimedTiers.includes(tier.tier)) return;

    setClaiming(tier.tier);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Add reward based on type
      if (tier.reward_type === "coins" || tier.reward_type === "gems" || tier.reward_type === "gold") {
        const params: any = {
          _user_id: user.id,
          _coins: tier.reward_type === "coins" ? tier.reward_value : 0,
          _gems: tier.reward_type === "gems" ? tier.reward_value : 0,
          _gold: tier.reward_type === "gold" ? tier.reward_value : 0,
        };

        await supabase.rpc("add_player_currency", params);
      }

      // If power unlock, add to inventory
      if (tier.power_unlock) {
        // Check if already owned
        const { data: existing } = await supabase
          .from("player_inventory")
          .select("id")
          .eq("user_id", user.id)
          .eq("item_id", tier.power_unlock)
          .maybeSingle();

        if (!existing) {
          await supabase.from("player_inventory").insert({
            user_id: user.id,
            item_type: "power",
            item_id: tier.power_unlock,
            quantity: 1,
            is_equipped: false,
          });
        }
      }

      // Update claimed tiers - use upsert with conflict handling
      const newClaimedTiers = [...claimedTiers, tier.tier];

      const { error: upsertError } = await supabase
        .from("food_pass_progress")
        .upsert(
          {
            user_id: user.id,
            current_tier: tier.tier,
            claimed_tiers: newClaimedTiers,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        // If upsert fails, try update
        await supabase
          .from("food_pass_progress")
          .update({
            current_tier: tier.tier,
            claimed_tiers: newClaimedTiers,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      }

      setClaimedTiers(newClaimedTiers);
      
      const rewardLabel = tier.power_unlock 
        ? `${tier.power_unlock.replace(/_/g, " ")} power`
        : `${tier.reward_value} ${tier.reward_type}`;
      
      toast.success(`Claimed Tier ${tier.tier}: ${rewardLabel}!`);
    } catch (error) {
      console.error("Error claiming reward:", error);
      toast.error("Failed to claim reward");
    } finally {
      setClaiming(null);
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "coins": return <Coins className="w-4 h-4 text-yellow-500" />;
      case "gems": return <Gem className="w-4 h-4 text-purple-500" />;
      case "gold": return <Medal className="w-4 h-4 text-amber-500" />;
      case "power": return <Zap className="w-4 h-4 text-blue-500" />;
      default: return <Gift className="w-4 h-4" />;
    }
  };

  const getNextTier = () => {
    return tiers.find(t => currentScore < t.score_required);
  };

  const nextTier = getNextTier();
  const progressToNext = nextTier
    ? Math.min(100, (currentScore / nextTier.score_required) * 100)
    : 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="w-6 h-6 text-orange-500" />
            Food Pass
            <Badge variant="secondary" className="ml-2">
              Season 1
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Overview */}
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Your Score: {currentScore.toLocaleString()}</span>
              {nextTier && (
                <span className="text-sm text-muted-foreground">
                  Next: Tier {nextTier.tier} ({nextTier.score_required.toLocaleString()})
                </span>
              )}
            </div>
            <Progress value={progressToNext} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              Earn score by playing any game mode to unlock rewards!
            </p>
          </div>

          {/* Tiers Grid */}
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-1">
                {tiers.map((tier) => {
                  const canClaim = currentScore >= tier.score_required && !claimedTiers.includes(tier.tier);
                  const isClaimed = claimedTiers.includes(tier.tier);
                  const isLocked = currentScore < tier.score_required;

                  return (
                    <div
                      key={tier.id}
                      className={`relative rounded-lg border p-3 transition-all ${
                        isClaimed
                          ? "bg-green-500/10 border-green-500/50"
                          : canClaim
                          ? "bg-primary/10 border-primary animate-pulse"
                          : isLocked
                          ? "bg-muted/50 border-muted opacity-60"
                          : "bg-card border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={isClaimed ? "default" : "outline"} className="text-xs">
                          Tier {tier.tier}
                        </Badge>
                        {isClaimed && <Check className="w-4 h-4 text-green-500" />}
                        {isLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        {getRewardIcon(tier.reward_type)}
                        <span className="text-sm font-medium">
                          {tier.power_unlock
                            ? tier.power_unlock.replace(/_/g, " ")
                            : `${tier.reward_value} ${tier.reward_type}`}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mb-2">
                        {tier.score_required.toLocaleString()} score
                      </p>

                      {canClaim && (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => claimReward(tier)}
                          disabled={claiming === tier.tier}
                        >
                          {claiming === tier.tier ? "Claiming..." : "Claim"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
