import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Gem, Star, Loader2, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface MysteryBoxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BoxReward {
  type: "coins" | "gems" | "gold";
  name: string;
  amount: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

// ── Drop tiers ──
interface DropTier {
  id: string;
  name: string;
  subtitle: string;
  costCoins: number;
  costGems: number;
  costGold: number;
  weights: Record<string, number>;
  boxColor: string;
  accentColor: string;
  glowColor: string;
}

const DROP_TIERS: DropTier[] = [
  {
    id: "basic",
    name: "Basic Drop",
    subtitle: "Starter rewards",
    costCoins: 500, costGems: 500, costGold: 500,
    weights: { common: 50, uncommon: 30, rare: 14, epic: 5, legendary: 1 },
    boxColor: "#2a3a5c", accentColor: "#60a5fa", glowColor: "#3b82f6",
  },
  {
    id: "rare",
    name: "Rare Drop",
    subtitle: "Better odds",
    costCoins: 1500, costGems: 1500, costGold: 1500,
    weights: { common: 30, uncommon: 30, rare: 24, epic: 12, legendary: 4 },
    boxColor: "#1e3a5f", accentColor: "#38bdf8", glowColor: "#0ea5e9",
  },
  {
    id: "epic",
    name: "Epic Drop",
    subtitle: "High value",
    costCoins: 3000, costGems: 3000, costGold: 3000,
    weights: { common: 15, uncommon: 25, rare: 30, epic: 20, legendary: 10 },
    boxColor: "#3b1f6e", accentColor: "#c084fc", glowColor: "#a855f7",
  },
  {
    id: "legendary",
    name: "Legendary Drop",
    subtitle: "Premium loot",
    costCoins: 5000, costGems: 5000, costGold: 5000,
    weights: { common: 5, uncommon: 15, rare: 30, epic: 28, legendary: 22 },
    boxColor: "#5c3a0e", accentColor: "#fbbf24", glowColor: "#f59e0b",
  },
  {
    id: "chaos",
    name: "Chaos Drop",
    subtitle: "Maximum chaos",
    costCoins: 10000, costGems: 10000, costGold: 10000,
    weights: { common: 0, uncommon: 5, rare: 20, epic: 35, legendary: 40 },
    boxColor: "#4c0519", accentColor: "#fb7185", glowColor: "#f43f5e",
  },
];

const REWARDS_BY_RARITY: BoxReward[] = [
  { type: "coins", name: "50 Coins", amount: 50, rarity: "common" },
  { type: "gems", name: "25 Gems", amount: 25, rarity: "common" },
  { type: "gold", name: "10 Gold", amount: 10, rarity: "common" },
  { type: "coins", name: "200 Coins", amount: 200, rarity: "uncommon" },
  { type: "gems", name: "100 Gems", amount: 100, rarity: "uncommon" },
  { type: "gold", name: "50 Gold", amount: 50, rarity: "uncommon" },
  { type: "coins", name: "600 Coins", amount: 600, rarity: "rare" },
  { type: "gems", name: "350 Gems", amount: 350, rarity: "rare" },
  { type: "gold", name: "200 Gold", amount: 200, rarity: "rare" },
  { type: "coins", name: "2500 Coins", amount: 2500, rarity: "epic" },
  { type: "gems", name: "1200 Gems", amount: 1200, rarity: "epic" },
  { type: "gold", name: "600 Gold", amount: 600, rarity: "epic" },
  { type: "coins", name: "12000 Coins", amount: 12000, rarity: "legendary" },
  { type: "gems", name: "6000 Gems", amount: 6000, rarity: "legendary" },
  { type: "gold", name: "3000 Gold", amount: 3000, rarity: "legendary" },
];

const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF", uncommon: "#22C55E", rare: "#3B82F6", epic: "#A855F7", legendary: "#F59E0B",
};

function pickReward(weights: Record<string, number>): BoxReward {
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  let chosenRarity = "common";
  for (const [rarity, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) { chosenRarity = rarity; break; }
  }
  const pool = REWARDS_BY_RARITY.filter(r => r.rarity === chosenRarity);
  if (pool.length === 0) return REWARDS_BY_RARITY[0];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── 3D Particles ──
function Particles({ active, color, burst }: { active: boolean; color: string; burst: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 80;
  const pRef = useRef<{ pos: THREE.Vector3; vel: THREE.Vector3; life: number; max: number }[]>([]);
  const dummy = useRef(new THREE.Object3D());
  const col = useRef(new THREE.Color(color));

  useEffect(() => { col.current.set(color); }, [color]);

  useEffect(() => {
    if (burst && meshRef.current) {
      pRef.current = Array.from({ length: count }, () => {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const speed = 3 + Math.random() * 5;
        return {
          pos: new THREE.Vector3(0, 0, 0),
          vel: new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * speed,
            Math.sin(phi) * Math.sin(theta) * speed + 2,
            Math.cos(phi) * speed
          ),
          life: 1 + Math.random() * 1.5,
          max: 1 + Math.random() * 1.5,
        };
      });
    }
  }, [burst]);

  useFrame((_, dt) => {
    if (!meshRef.current || !active) return;
    for (let i = 0; i < count; i++) {
      const p = pRef.current[i];
      if (!p || p.life <= 0) {
        dummy.current.scale.set(0, 0, 0);
      } else {
        p.pos.add(p.vel.clone().multiplyScalar(dt));
        p.vel.y -= dt * 3;
        p.vel.multiplyScalar(0.97);
        p.life -= dt;
        const s = Math.max(0, (p.life / p.max) * 0.15);
        dummy.current.position.copy(p.pos);
        dummy.current.scale.set(s, s, s);
      }
      dummy.current.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.current.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial color={col.current} emissive={col.current} emissiveIntensity={3} toneMapped={false} />
    </instancedMesh>
  );
}

// ── 3D Capsule / Drop ──
function DropCapsule3D({ phase, tier, rarityColor }: { phase: "idle" | "opening" | "reveal"; tier: DropTier; rarityColor: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const topRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const tRef = useRef(0);
  const [burst, setBurst] = useState(false);

  useEffect(() => { tRef.current = 0; setBurst(false); }, [phase]);

  useFrame((_, dt) => {
    tRef.current += dt;
    const t = tRef.current;
    if (!groupRef.current || !topRef.current) return;

    if (phase === "idle") {
      groupRef.current.rotation.y = t * 0.6;
      groupRef.current.position.y = Math.sin(t * 2) * 0.1;
      topRef.current.position.y = 0.55;
      topRef.current.rotation.x = 0;
      if (ringRef.current) {
        ringRef.current.rotation.z = t * 1.5;
        ringRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
      }
    } else if (phase === "opening") {
      const shake = Math.sin(t * 40) * 0.08 * Math.min(t, 1);
      groupRef.current.position.x = shake;
      groupRef.current.rotation.y = t * 4;
      groupRef.current.rotation.z = Math.sin(t * 25) * 0.05 * Math.min(t, 1);

      if (t > 0.8) {
        const open = Math.min((t - 0.8) * 1.8, 1);
        topRef.current.position.y = 0.55 + open * 1.2;
        topRef.current.rotation.x = -open * 0.5;
        (topRef.current.material as THREE.MeshStandardMaterial).opacity = 1 - open * 0.7;
        if (!burst && open > 0.4) setBurst(true);
      }

      if (glowRef.current) {
        const gs = Math.min(t * 1.2, 2.5);
        glowRef.current.scale.set(gs, gs, gs);
        (glowRef.current.material as THREE.MeshStandardMaterial).opacity = Math.min(t * 0.4, 0.7);
      }
      if (ringRef.current) {
        ringRef.current.rotation.z = t * 8;
        const rs = 1 + Math.min(t * 0.5, 1.5);
        ringRef.current.scale.setScalar(rs);
      }
    } else if (phase === "reveal") {
      groupRef.current.rotation.y = t * 0.4;
      groupRef.current.position.x = 0;
      groupRef.current.position.y = 0;
      groupRef.current.rotation.z = 0;
      topRef.current.position.y = 1.8;
      topRef.current.rotation.x = -0.5;
      (topRef.current.material as THREE.MeshStandardMaterial).opacity = 0.3;

      if (glowRef.current) {
        const pulse = 2 + Math.sin(t * 3) * 0.4;
        glowRef.current.scale.set(pulse, pulse, pulse);
        (glowRef.current.material as THREE.MeshStandardMaterial).opacity = 0.5 + Math.sin(t * 4) * 0.15;
      }
      if (ringRef.current) {
        ringRef.current.rotation.z = t * 2;
      }
    }
  });

  const accent = new THREE.Color(tier.accentColor);

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[3, 5, 2]} intensity={0.8} />
      <pointLight position={[0, 2, 0]} intensity={1.2} color={tier.glowColor} />
      <pointLight position={[-2, -1, 2]} intensity={0.4} color={tier.accentColor} />

      <group ref={groupRef}>
        {/* Bottom capsule half */}
        <mesh position={[0, 0, 0]}>
          <capsuleGeometry args={[0.5, 0.4, 8, 16]} />
          <meshStandardMaterial color={tier.boxColor} metalness={0.8} roughness={0.15} />
        </mesh>

        {/* Accent ring */}
        <mesh ref={ringRef} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.55, 0.04, 8, 32]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} toneMapped={false} />
        </mesh>

        {/* Side accents */}
        {[0, 1, 2, 3].map(i => (
          <mesh key={i} position={[Math.cos(i * Math.PI / 2) * 0.52, 0, Math.sin(i * Math.PI / 2) * 0.52]} rotation={[0, -i * Math.PI / 2, 0]}>
            <boxGeometry args={[0.08, 0.6, 0.08]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
        ))}

        {/* Top capsule half (lid) */}
        <mesh ref={topRef} position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.52, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={tier.boxColor} metalness={0.8} roughness={0.15} transparent />
        </mesh>

        {/* Inner glow orb */}
        <mesh ref={glowRef} position={[0, 0.2, 0]}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial
            color={rarityColor}
            emissive={rarityColor}
            emissiveIntensity={4}
            transparent
            opacity={0}
            toneMapped={false}
          />
        </mesh>

        {/* Star decal */}
        <mesh position={[0, 0.1, 0.52]}>
          <circleGeometry args={[0.15, 6]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <Particles active={phase === "opening" || phase === "reveal"} color={rarityColor} burst={burst} />
    </>
  );
}

// ── Main component ──
export const MysteryBoxModal = ({ open, onOpenChange }: MysteryBoxModalProps) => {
  const [selectedTier, setSelectedTier] = useState(0);
  const [phase, setPhase] = useState<"idle" | "opening" | "reveal">("idle");
  const [reward, setReward] = useState<BoxReward | null>(null);
  const [currencies, setCurrencies] = useState<{ coins: number; gems: number; gold: number } | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [loading, setLoading] = useState(true);

  const tier = DROP_TIERS[selectedTier];

  useEffect(() => {
    if (open) {
      setPhase("idle");
      setReward(null);
      setLoading(true);
      loadCurrencies();
    }
  }, [open]);

  const loadCurrencies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from("player_currencies").select("coins, gems, gold").eq("user_id", user.id).maybeSingle();
      if (data) {
        setCurrencies({ coins: data.coins, gems: data.gems, gold: data.gold });
      } else {
        await supabase.from("player_currencies").insert({ user_id: user.id, coins: 0, gems: 0, gold: 0 });
        setCurrencies({ coins: 0, gems: 0, gold: 0 });
      }
    } catch {
      setCurrencies({ coins: 0, gems: 0, gold: 0 });
    } finally {
      setLoading(false);
    }
  };

  const canAfford = currencies
    ? currencies.coins >= tier.costCoins && currencies.gems >= tier.costGems && currencies.gold >= tier.costGold
    : false;

  const openDrop = useCallback(async () => {
    if (!canAfford || purchasing || !currencies) return;
    setPurchasing(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPurchasing(false); return; }

    const { data: fresh } = await supabase.from("player_currencies").select("coins, gems, gold").eq("user_id", user.id).maybeSingle();
    if (!fresh || fresh.coins < tier.costCoins || fresh.gems < tier.costGems || fresh.gold < tier.costGold) {
      toast.error("Not enough currency!");
      if (fresh) setCurrencies({ coins: fresh.coins, gems: fresh.gems, gold: fresh.gold });
      setPurchasing(false);
      return;
    }

    const newCurr = {
      coins: fresh.coins - tier.costCoins,
      gems: fresh.gems - tier.costGems,
      gold: fresh.gold - tier.costGold,
    };
    const { error } = await supabase.from("player_currencies").update(newCurr).eq("user_id", user.id);
    if (error) { toast.error("Purchase failed"); setPurchasing(false); return; }
    setCurrencies(newCurr);

    const won = pickReward(tier.weights);
    setReward(won);
    setPhase("opening");

    setTimeout(() => {
      finishReveal(won);
    }, 2500);
  }, [canAfford, purchasing, currencies, tier]);

  const finishReveal = async (won: BoxReward) => {
    setPhase("reveal");
    setPurchasing(false);

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

    setCurrencies(prev => prev ? ({
      coins: prev.coins + addCoins,
      gems: prev.gems + addGems,
      gold: prev.gold + addGold,
    }) : null);

    toast.success(`You won: ${won.name}!`);
  };

  const rarityColor = reward ? RARITY_COLORS[reward.rarity] : tier.glowColor;
  const totalWeight = Object.values(tier.weights).reduce((a, b) => a + b, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0" style={{ background: "linear-gradient(180deg, #0d0d1a 0%, #1a0a2e 100%)" }}>
        {/* Header bar */}
        <div className="px-5 pt-5 pb-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg" style={{ color: tier.accentColor }}>
              <Zap className="w-5 h-5" />
              Mystery Drops
            </DialogTitle>
            <DialogDescription className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              Choose a drop tier — higher cost, better legendary odds!
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Currency bar */}
        <div className="flex gap-4 justify-center py-2 mx-5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "rgba(255,255,255,0.4)" }} />
          ) : (
            <>
              <div className="flex items-center gap-1 text-sm text-white">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="font-bold">{currencies?.coins?.toLocaleString() ?? 0}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-white">
                <Gem className="w-4 h-4 text-purple-400" />
                <span className="font-bold">{currencies?.gems?.toLocaleString() ?? 0}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-white">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="font-bold">{currencies?.gold?.toLocaleString() ?? 0}</span>
              </div>
            </>
          )}
        </div>

        {/* Tier selector - horizontal scroll */}
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            onClick={() => setSelectedTier(Math.max(0, selectedTier - 1))}
            disabled={selectedTier === 0 || phase !== "idle"}
            className="p-1 rounded-full transition-colors disabled:opacity-30"
            style={{ color: tier.accentColor }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 flex gap-1.5 justify-center overflow-x-auto">
            {DROP_TIERS.map((t, i) => (
              <button
                key={t.id}
                onClick={() => { if (phase === "idle") setSelectedTier(i); }}
                disabled={phase !== "idle"}
                className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  background: i === selectedTier ? t.accentColor : "rgba(255,255,255,0.06)",
                  color: i === selectedTier ? "#000" : "rgba(255,255,255,0.5)",
                  transform: i === selectedTier ? "scale(1.08)" : "scale(1)",
                  boxShadow: i === selectedTier ? `0 0 16px ${t.glowColor}60` : "none",
                }}
              >
                {t.name.replace(" Drop", "")}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSelectedTier(Math.min(DROP_TIERS.length - 1, selectedTier + 1))}
            disabled={selectedTier === DROP_TIERS.length - 1 || phase !== "idle"}
            className="p-1 rounded-full transition-colors disabled:opacity-30"
            style={{ color: tier.accentColor }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Scene */}
        <div className="mx-5 rounded-xl overflow-hidden relative" style={{ height: 240, background: `radial-gradient(ellipse at center, ${tier.glowColor}15 0%, #0a0a1a 70%)` }}>
          {/* Tier label overlay */}
          <div className="absolute top-2 left-3 z-10">
            <span className="text-xs font-bold tracking-wider uppercase" style={{ color: tier.accentColor }}>{tier.name}</span>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{tier.subtitle}</p>
          </div>
          <Canvas camera={{ position: [0, 0.8, 3], fov: 45 }}>
            <Suspense fallback={null}>
              <DropCapsule3D phase={phase} tier={tier} rarityColor={rarityColor} />
            </Suspense>
          </Canvas>
        </div>

        {/* Reveal card */}
        {phase === "reveal" && reward && (
          <div className="mx-5 p-4 rounded-xl text-center" style={{
            background: `linear-gradient(135deg, ${RARITY_COLORS[reward.rarity]}20 0%, ${RARITY_COLORS[reward.rarity]}08 100%)`,
            border: `2px solid ${RARITY_COLORS[reward.rarity]}`,
            boxShadow: `0 0 30px ${RARITY_COLORS[reward.rarity]}40, inset 0 0 30px ${RARITY_COLORS[reward.rarity]}10`,
          }}>
            <Badge className="mb-1.5 text-xs font-bold uppercase" style={{ backgroundColor: RARITY_COLORS[reward.rarity], color: "#fff" }}>
              {reward.rarity}
            </Badge>
            <h3 className="text-xl font-black text-white">{reward.name}</h3>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 pb-2">
          {phase === "idle" && (
            <>
              <div className="text-center text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                Cost: <span className="text-yellow-400 font-bold">{tier.costCoins.toLocaleString()}</span>{" "}
                <span className="text-purple-400 font-bold">{tier.costGems.toLocaleString()}</span>{" "}
                <span className="text-amber-400 font-bold">{tier.costGold.toLocaleString()}</span>
              </div>
              <button
                onClick={openDrop}
                disabled={loading || !canAfford || purchasing}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                style={{
                  background: canAfford ? `linear-gradient(135deg, ${tier.accentColor}, ${tier.glowColor})` : "rgba(255,255,255,0.08)",
                  color: canAfford ? "#000" : "rgba(255,255,255,0.4)",
                  boxShadow: canAfford ? `0 0 20px ${tier.glowColor}50` : "none",
                }}
              >
                <Zap className="w-4 h-4" />
                {loading ? "Loading..." : !canAfford ? "Not Enough Currency" : `Open ${tier.name}`}
              </button>
            </>
          )}
          {phase === "opening" && (
            <div className="text-center text-sm animate-pulse" style={{ color: tier.accentColor }}>
              Dropping...
            </div>
          )}
          {phase === "reveal" && (
            <button
              onClick={() => { setPhase("idle"); setReward(null); }}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
            >
              Open Another
            </button>
          )}
        </div>

        {/* Drop rates footer */}
        <div className="px-5 pb-4 pt-1">
          <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Drop Rates — {tier.name}</p>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(tier.weights).filter(([, w]) => w > 0).map(([rarity, weight]) => (
                <div key={rarity} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: RARITY_COLORS[rarity] }} />
                  <span className="text-[10px] capitalize font-medium" style={{ color: RARITY_COLORS[rarity] }}>{rarity}</span>
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{((weight / totalWeight) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
