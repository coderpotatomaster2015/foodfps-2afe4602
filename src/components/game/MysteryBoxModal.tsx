import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Sparkles, Coins, Gem, Star, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MysteryBoxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BoxReward {
  type: "coins" | "gems" | "gold" | "weapon" | "power";
  name: string;
  amount: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  color: string;
}

const POSSIBLE_REWARDS: BoxReward[] = [
  { type: "coins", name: "50 Coins", amount: 50, rarity: "common", color: "#FFD700" },
  { type: "coins", name: "150 Coins", amount: 150, rarity: "uncommon", color: "#FFD700" },
  { type: "coins", name: "500 Coins", amount: 500, rarity: "rare", color: "#FFD700" },
  { type: "coins", name: "2000 Coins", amount: 2000, rarity: "epic", color: "#FFD700" },
  { type: "coins", name: "10000 Coins", amount: 10000, rarity: "legendary", color: "#FFD700" },
  { type: "gems", name: "25 Gems", amount: 25, rarity: "common", color: "#A855F7" },
  { type: "gems", name: "100 Gems", amount: 100, rarity: "uncommon", color: "#A855F7" },
  { type: "gems", name: "300 Gems", amount: 300, rarity: "rare", color: "#A855F7" },
  { type: "gems", name: "1000 Gems", amount: 1000, rarity: "epic", color: "#A855F7" },
  { type: "gems", name: "5000 Gems", amount: 5000, rarity: "legendary", color: "#A855F7" },
  { type: "gold", name: "10 Gold", amount: 10, rarity: "common", color: "#F59E0B" },
  { type: "gold", name: "50 Gold", amount: 50, rarity: "uncommon", color: "#F59E0B" },
  { type: "gold", name: "200 Gold", amount: 200, rarity: "rare", color: "#F59E0B" },
  { type: "gold", name: "500 Gold", amount: 500, rarity: "epic", color: "#F59E0B" },
  { type: "gold", name: "2500 Gold", amount: 2500, rarity: "legendary", color: "#F59E0B" },
];

const RARITY_WEIGHTS: Record<string, number> = {
  common: 40,
  uncommon: 30,
  rare: 18,
  epic: 9,
  legendary: 3,
};

const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF",
  uncommon: "#22C55E",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F59E0B",
};

const RARITY_GLOW: Record<string, string> = {
  common: "0 0 20px rgba(156,163,175,0.5)",
  uncommon: "0 0 30px rgba(34,197,94,0.6)",
  rare: "0 0 40px rgba(59,130,246,0.7)",
  epic: "0 0 50px rgba(168,85,247,0.8)",
  legendary: "0 0 60px rgba(245,158,11,0.9), 0 0 120px rgba(245,158,11,0.4)",
};

function pickReward(): BoxReward {
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  let chosenRarity = "common";
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    roll -= weight;
    if (roll <= 0) { chosenRarity = rarity; break; }
  }
  const pool = POSSIBLE_REWARDS.filter(r => r.rarity === chosenRarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

export const MysteryBoxModal = ({ open, onOpenChange }: MysteryBoxModalProps) => {
  const [phase, setPhase] = useState<"idle" | "opening" | "reveal">("idle");
  const [reward, setReward] = useState<BoxReward | null>(null);
  const [currencies, setCurrencies] = useState({ coins: 0, gems: 0, gold: 0 });
  const [purchasing, setPurchasing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>();

  useEffect(() => {
    if (open) {
      setPhase("idle");
      setReward(null);
      loadCurrencies();
    }
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [open]);

  const loadCurrencies = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("player_currencies").select("*").eq("user_id", user.id).maybeSingle();
    if (data) setCurrencies({ coins: data.coins, gems: data.gems, gold: data.gold });
  };

  const canAfford = currencies.coins >= 1000 && currencies.gems >= 1000 && currencies.gold >= 1000;

  const openBox = async () => {
    if (!canAfford || purchasing) return;
    setPurchasing(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPurchasing(false); return; }

    // Deduct cost
    const newCurr = {
      coins: currencies.coins - 1000,
      gems: currencies.gems - 1000,
      gold: currencies.gold - 1000,
    };
    const { error } = await supabase.from("player_currencies").update(newCurr).eq("user_id", user.id);
    if (error) { toast.error("Purchase failed"); setPurchasing(false); return; }
    setCurrencies(newCurr);

    const won = pickReward();
    setReward(won);
    setPhase("opening");

    // Run opening animation
    runOpeningAnimation(won);
  };

  const runOpeningAnimation = (won: BoxReward) => {
    const canvas = canvasRef.current;
    if (!canvas) { finishReveal(won); return; }
    const ctx = canvas.getContext("2d");
    if (!ctx) { finishReveal(won); return; }

    canvas.width = 400;
    canvas.height = 400;
    const W = 400, H = 400;
    const cx = W / 2, cy = H / 2;
    const startTime = performance.now();
    const duration = 2500; // 2.5 seconds

    interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }
    const particles: Particle[] = [];

    const loop = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      ctx.clearRect(0, 0, W, H);

      // Dark background
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      // Phase 1: Box spinning and shaking (0 - 0.6)
      if (progress < 0.6) {
        const shake = Math.sin(progress * 60) * (progress * 15);
        const scale = 1 + Math.sin(progress * 20) * 0.05;
        const rotation = progress * Math.PI * 4;

        // Particle emission during shake
        if (Math.random() < progress * 2) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 50 + Math.random() * 100;
          particles.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1, maxLife: 1,
            color: RARITY_COLORS[won.rarity],
            size: 2 + Math.random() * 4,
          });
        }

        ctx.save();
        ctx.translate(cx + shake, cy);
        ctx.rotate(rotation);
        ctx.scale(scale, scale);

        // Box body
        const boxSize = 60;
        const grad = ctx.createLinearGradient(-boxSize, -boxSize, boxSize, boxSize);
        grad.addColorStop(0, "#2a1f4e");
        grad.addColorStop(0.5, "#4a2f8e");
        grad.addColorStop(1, "#2a1f4e");
        ctx.fillStyle = grad;
        ctx.fillRect(-boxSize, -boxSize, boxSize * 2, boxSize * 2);

        // Box border glow
        ctx.strokeStyle = RARITY_COLORS[won.rarity];
        ctx.lineWidth = 3;
        ctx.shadowColor = RARITY_COLORS[won.rarity];
        ctx.shadowBlur = 15 + progress * 30;
        ctx.strokeRect(-boxSize, -boxSize, boxSize * 2, boxSize * 2);

        // Question mark
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("?", 0, 0);

        ctx.restore();
      }
      // Phase 2: Explosion burst (0.6 - 0.75)
      else if (progress < 0.75) {
        const burstProgress = (progress - 0.6) / 0.15;

        // Create burst particles
        if (burstProgress < 0.1) {
          for (let i = 0; i < 80; i++) {
            const angle = (i / 80) * Math.PI * 2;
            const speed = 150 + Math.random() * 300;
            particles.push({
              x: cx, y: cy,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1.5, maxLife: 1.5,
              color: RARITY_COLORS[won.rarity],
              size: 3 + Math.random() * 6,
            });
          }
        }

        // Flash
        const flashAlpha = Math.max(0, 1 - burstProgress * 3);
        ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
        ctx.fillRect(0, 0, W, H);

        // Ring expansion
        ctx.save();
        ctx.strokeStyle = RARITY_COLORS[won.rarity];
        ctx.lineWidth = Math.max(1, 8 - burstProgress * 8);
        ctx.globalAlpha = 1 - burstProgress;
        ctx.beginPath();
        ctx.arc(cx, cy, burstProgress * 200, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      // Phase 3: Reward reveal (0.75 - 1.0)
      else {
        const revealProgress = (progress - 0.75) / 0.25;
        const scale = 0.5 + revealProgress * 0.5;
        const alpha = revealProgress;

        // Ambient glow
        ctx.save();
        const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150);
        glowGrad.addColorStop(0, RARITY_COLORS[won.rarity] + "40");
        glowGrad.addColorStop(1, "transparent");
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        // Rotating rays
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(progress * 2);
        ctx.globalAlpha = alpha * 0.3;
        for (let i = 0; i < 12; i++) {
          const rayAngle = (i / 12) * Math.PI * 2;
          ctx.fillStyle = RARITY_COLORS[won.rarity];
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(rayAngle - 0.08) * 200, Math.sin(rayAngle - 0.08) * 200);
          ctx.lineTo(Math.cos(rayAngle + 0.08) * 200, Math.sin(rayAngle + 0.08) * 200);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // Reward icon/text
        ctx.save();
        ctx.translate(cx, cy - 20);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        ctx.shadowColor = RARITY_COLORS[won.rarity];
        ctx.shadowBlur = 30;
        ctx.fillStyle = RARITY_COLORS[won.rarity];
        ctx.font = "bold 56px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const icon = won.type === "coins" ? "🪙" : won.type === "gems" ? "💎" : "⭐";
        ctx.fillText(icon, 0, 0);
        ctx.restore();

        // Reward name
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#fff";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(won.name, cx, cy + 50);
        ctx.fillStyle = RARITY_COLORS[won.rarity];
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(won.rarity.toUpperCase(), cx, cy + 80);
        ctx.restore();
      }

      // Update & draw particles
      const dt = 1 / 60;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(loop);
      } else {
        finishReveal(won);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  const finishReveal = async (won: BoxReward) => {
    setPhase("reveal");
    setPurchasing(false);

    // Grant reward
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const addCoins = won.type === "coins" ? won.amount : 0;
    const addGems = won.type === "gems" ? won.amount : 0;
    const addGold = won.type === "gold" ? won.amount : 0;

    await supabase.rpc("add_player_currency", {
      _user_id: user.id,
      _coins: addCoins,
      _gems: addGems,
      _gold: addGold,
    });

    setCurrencies(prev => ({
      coins: prev.coins + addCoins,
      gems: prev.gems + addGems,
      gold: prev.gold + addGold,
    }));

    toast.success(`You won: ${won.name}!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Mystery Box
          </DialogTitle>
          <DialogDescription>
            Open a mystery box for a chance at amazing rewards!
          </DialogDescription>
        </DialogHeader>

        {/* Currency display */}
        <div className="flex gap-4 justify-center py-2 border-b border-border">
          <div className="flex items-center gap-1 text-sm">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="font-bold">{currencies.coins}</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Gem className="w-4 h-4 text-purple-400" />
            <span className="font-bold">{currencies.gems}</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="font-bold">{currencies.gold}</span>
          </div>
        </div>

        {/* Animation canvas */}
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="rounded-lg"
            style={{ width: "100%", maxWidth: 400, aspectRatio: "1/1" }}
          />
        </div>

        {/* Reward display after reveal */}
        {phase === "reveal" && reward && (
          <Card className="p-4 text-center" style={{ boxShadow: RARITY_GLOW[reward.rarity] }}>
            <Badge style={{ backgroundColor: RARITY_COLORS[reward.rarity], color: "#fff" }} className="mb-2">
              {reward.rarity.toUpperCase()}
            </Badge>
            <h3 className="text-xl font-bold">{reward.name}</h3>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {phase === "idle" && (
            <>
              <div className="text-center text-sm text-muted-foreground mb-1">
                Cost: <span className="text-yellow-400 font-bold">1,000</span> Coins +{" "}
                <span className="text-purple-400 font-bold">1,000</span> Gems +{" "}
                <span className="text-amber-400 font-bold">1,000</span> Gold
              </div>
              <Button
                onClick={openBox}
                disabled={!canAfford || purchasing}
                className="w-full gap-2"
                size="lg"
              >
                <Sparkles className="w-5 h-5" />
                {!canAfford ? "Not Enough Currency" : "Open Mystery Box"}
              </Button>
            </>
          )}
          {phase === "opening" && (
            <div className="text-center text-sm text-muted-foreground animate-pulse">
              Opening...
            </div>
          )}
          {phase === "reveal" && (
            <Button onClick={() => setPhase("idle")} variant="outline" className="w-full">
              Open Another
            </Button>
          )}
        </div>

        {/* Drop rates */}
        <div className="text-xs text-muted-foreground space-y-0.5 pt-2 border-t border-border">
          <p className="font-medium mb-1">Drop Rates:</p>
          {Object.entries(RARITY_WEIGHTS).map(([rarity, weight]) => (
            <div key={rarity} className="flex justify-between">
              <span style={{ color: RARITY_COLORS[rarity] }} className="capitalize">{rarity}</span>
              <span>{((weight / Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0)) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
