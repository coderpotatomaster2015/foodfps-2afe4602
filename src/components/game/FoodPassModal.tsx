import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Utensils, Gift, Coins, Gem, Medal, Zap, Check, Lock, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
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

const RANKED_TIERS = [
  { rank: "Rookie", minTier: 0, rewards: { coins: 50, gems: 5, gold: 0 } },
  { rank: "Iron", minTier: 1, rewards: { coins: 100, gems: 10, gold: 2 } },
  { rank: "Bronze", minTier: 2, rewards: { coins: 150, gems: 15, gold: 5 } },
  { rank: "Silver", minTier: 3, rewards: { coins: 200, gems: 20, gold: 8 } },
  { rank: "Gold", minTier: 4, rewards: { coins: 300, gems: 30, gold: 12 } },
  { rank: "Platinum", minTier: 5, rewards: { coins: 400, gems: 40, gold: 15 } },
  { rank: "Diamond", minTier: 6, rewards: { coins: 500, gems: 50, gold: 20 } },
  { rank: "Master", minTier: 7, rewards: { coins: 600, gems: 60, gold: 25 } },
  { rank: "Grandmaster", minTier: 8, rewards: { coins: 700, gems: 70, gold: 30 } },
  { rank: "Pro", minTier: 9, rewards: { coins: 800, gems: 75, gold: 35 } },
  { rank: "Legend", minTier: 10, rewards: { coins: 900, gems: 80, gold: 40 } },
  { rank: "Mythic", minTier: 11, rewards: { coins: 1000, gems: 90, gold: 45 } },
  { rank: "Immortal", minTier: 12, rewards: { coins: 1100, gems: 95, gold: 50 } },
  { rank: "Titan", minTier: 13, rewards: { coins: 1200, gems: 100, gold: 55 } },
  { rank: "Apex", minTier: 14, rewards: { coins: 1300, gems: 110, gold: 60 } },
  { rank: "Transcendent", minTier: 15, rewards: { coins: 1500, gems: 120, gold: 70 } },
];

const RANK_ORDER = ["Rookie", "Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster", "Pro", "Legend", "Mythic", "Immortal", "Titan", "Apex", "Transcendent"];

export const FoodPassModal = ({ open, onOpenChange }: FoodPassModalProps) => {
  const algorithmicTiers = useMemo(() => {
    const generated = generateFoodPassTiers(600);
    return generated.map((t) => ({
      ...t,
      id: `algo_tier_${t.tier}`,
    }));
  }, []);

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [claimedTiers, setClaimedTiers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [playerRank, setPlayerRank] = useState<string | null>(null);
  const [claimedRankedRewards, setClaimedRankedRewards] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

      // Use algorithm-generated tiers (DB tiers are optional overrides)
      const { data: dbTiers } = await supabase
        .from("food_pass_tiers")
        .select("*")
        .order("tier", { ascending: true })
        .limit(600);

      const dbTierMap = new Map<number, Tier>();
      if (dbTiers) {
        for (const t of dbTiers) {
          dbTierMap.set(t.tier, t);
        }
      }

      const mergedTiers: Tier[] = algorithmicTiers.map((algoTier) => {
        const dbOverride = dbTierMap.get(algoTier.tier);
        return dbOverride || algoTier;
      });

      setTiers(mergedTiers);

      // Load player score and rank
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_score, ranked_rank, ranked_tier")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setCurrentScore(profile.total_score);
        setPlayerRank(profile.ranked_rank);
      }

      // Load claimed tiers
      const { data: progress } = await supabase
        .from("food_pass_progress")
        .select("claimed_tiers, current_tier")
        .eq("user_id", user.id)
        .maybeSingle();

      if (progress) {
        setClaimedTiers(progress.claimed_tiers || []);
      } else {
        await supabase.from("food_pass_progress").insert({
          user_id: user.id,
          current_tier: 0,
          claimed_tiers: [],
        });
        setClaimedTiers([]);
      }

      // Load claimed ranked rewards from localStorage
      const savedRanked = localStorage.getItem(`ranked_rewards_claimed_${user.id}`);
      if (savedRanked) {
        try { setClaimedRankedRewards(JSON.parse(savedRanked)); } catch { setClaimedRankedRewards([]); }
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
        const params: Record<string, unknown> = {
          _user_id: user.id,
          _coins: tier.reward_type === "coins" ? tier.reward_value : 0,
          _gems: tier.reward_type === "gems" ? tier.reward_value : 0,
          _gold: tier.reward_type === "gold" ? tier.reward_value : 0,
        };

        const { error: rpcError } = await supabase.rpc("add_player_currency", params);
        if (rpcError) {
          console.error("RPC error:", rpcError);
          toast.error("Failed to add currency reward");
          return;
        }
      }

      // If power unlock, add to inventory
      if (tier.power_unlock) {
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

      // Update claimed tiers
      const newClaimedTiers = [...claimedTiers, tier.tier];

      const { error: updateError } = await supabase
        .from("food_pass_progress")
        .update({
          current_tier: tier.tier,
          claimed_tiers: newClaimedTiers,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Update error:", updateError);
        // Try upsert as fallback
        await supabase
          .from("food_pass_progress")
          .upsert({
            user_id: user.id,
            current_tier: tier.tier,
            claimed_tiers: newClaimedTiers,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
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

  const claimRankedReward = async (rank: string) => {
    if (!playerRank || claimedRankedRewards.includes(rank)) return;

    const playerRankIndex = RANK_ORDER.indexOf(playerRank);
    const rewardRankIndex = RANK_ORDER.indexOf(rank);
    if (playerRankIndex < rewardRankIndex) return;

    const rankedTier = RANKED_TIERS.find(r => r.rank === rank);
    if (!rankedTier) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc("add_player_currency", {
        _user_id: user.id,
        _coins: rankedTier.rewards.coins,
        _gems: rankedTier.rewards.gems,
        _gold: rankedTier.rewards.gold,
      });

      if (error) {
        toast.error("Failed to claim ranked reward");
        return;
      }

      const newClaimed = [...claimedRankedRewards, rank];
      setClaimedRankedRewards(newClaimed);
      localStorage.setItem(`ranked_rewards_claimed_${user.id}`, JSON.stringify(newClaimed));
      toast.success(`Claimed ${rank} reward! +${rankedTier.rewards.coins}🪙 +${rankedTier.rewards.gems}💎 +${rankedTier.rewards.gold}⭐`);
    } catch {
      toast.error("Failed to claim ranked reward");
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

  const getNextTier = () => tiers.find(t => currentScore < t.score_required);
  const nextTier = getNextTier();
  const progressToNext = nextTier
    ? Math.min(100, (currentScore / nextTier.score_required) * 100)
    : 100;

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="w-6 h-6 text-orange-500" />
            Food Pass
            <Badge variant="secondary" className="ml-2">Season 1</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
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

          <Tabs defaultValue="pass" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pass">Food Pass Tiers</TabsTrigger>
              <TabsTrigger value="ranked" className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                Ranked Rewards
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pass" className="flex-1 overflow-hidden flex flex-col mt-2">
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="relative">
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-card/90 backdrop-blur-sm"
                    onClick={scrollLeft}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-card/90 backdrop-blur-sm"
                    onClick={scrollRight}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>

                  <div
                    ref={scrollContainerRef}
                    className="overflow-x-auto overflow-y-hidden px-10 pb-4 scrollbar-thin"
                    style={{ scrollbarWidth: "thin" }}
                  >
                    <div className="flex gap-3 w-max py-2">
                      {tiers.map((tier) => {
                        const canClaim = currentScore >= tier.score_required && !claimedTiers.includes(tier.tier);
                        const isClaimed = claimedTiers.includes(tier.tier);
                        const isLocked = currentScore < tier.score_required;

                        return (
                          <div
                            key={tier.id}
                            className={`relative rounded-lg border p-3 transition-all w-[140px] shrink-0 ${
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
                              <span className="text-sm font-medium truncate">
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
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="ranked" className="flex-1 overflow-auto mt-2">
              <div className="space-y-2 p-1">
                <p className="text-sm text-muted-foreground mb-3">
                  Earn rewards based on your ranked competitive standing. The higher your rank, the better the rewards!
                  {playerRank ? (
                    <span className="block mt-1 font-medium text-foreground">Your rank: {playerRank}</span>
                  ) : (
                    <span className="block mt-1 font-medium text-muted-foreground">Play Ranked Mode to earn a rank!</span>
                  )}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {RANKED_TIERS.map((rankedTier) => {
                    const playerRankIndex = playerRank ? RANK_ORDER.indexOf(playerRank) : -1;
                    const rewardRankIndex = RANK_ORDER.indexOf(rankedTier.rank);
                    const isUnlocked = playerRankIndex >= rewardRankIndex;
                    const isClaimed = claimedRankedRewards.includes(rankedTier.rank);

                    return (
                      <div
                        key={rankedTier.rank}
                        className={`rounded-lg border p-3 transition-all ${
                          isClaimed
                            ? "bg-green-500/10 border-green-500/50"
                            : isUnlocked
                            ? "bg-primary/10 border-primary"
                            : "bg-muted/50 border-muted opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={isClaimed ? "default" : isUnlocked ? "secondary" : "outline"} className="text-xs">
                            {rankedTier.rank}
                          </Badge>
                          {isClaimed && <Check className="w-4 h-4 text-green-500" />}
                          {!isUnlocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1">
                            <Coins className="w-3 h-3 text-yellow-500" />
                            <span>{rankedTier.rewards.coins} coins</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Gem className="w-3 h-3 text-purple-500" />
                            <span>{rankedTier.rewards.gems} gems</span>
                          </div>
                          {rankedTier.rewards.gold > 0 && (
                            <div className="flex items-center gap-1">
                              <Medal className="w-3 h-3 text-amber-500" />
                              <span>{rankedTier.rewards.gold} gold</span>
                            </div>
                          )}
                        </div>

                        {isUnlocked && !isClaimed && (
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => claimRankedReward(rankedTier.rank)}
                          >
                            Claim
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};