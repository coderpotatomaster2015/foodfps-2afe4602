import { useState, useEffect, useRef, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Sparkles, Coins, Gem, Star, Loader2 } from "lucide-react";
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
  common: 40, uncommon: 30, rare: 18, epic: 9, legendary: 3,
};

const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF", uncommon: "#22C55E", rare: "#3B82F6", epic: "#A855F7", legendary: "#F59E0B",
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

// 3D Particle system
function Particles({ active, color, burst }: { active: boolean; color: string; burst: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particleCount = 60;
  const particlesRef = useRef<{ pos: THREE.Vector3; vel: THREE.Vector3; life: number; maxLife: number }[]>([]);
  const dummy = useRef(new THREE.Object3D());
  const colorObj = useRef(new THREE.Color(color));

  useEffect(() => {
    colorObj.current.set(color);
  }, [color]);

  useEffect(() => {
    if (burst && meshRef.current) {
      particlesRef.current = Array.from({ length: particleCount }, () => {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const speed = 2 + Math.random() * 4;
        return {
          pos: new THREE.Vector3(0, 0, 0),
          vel: new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * speed,
            Math.sin(phi) * Math.sin(theta) * speed,
            Math.cos(phi) * speed
          ),
          life: 0.8 + Math.random() * 1.2,
          maxLife: 0.8 + Math.random() * 1.2,
        };
      });
    }
  }, [burst]);

  useFrame((_, delta) => {
    if (!meshRef.current || !active) return;
    const particles = particlesRef.current;
    for (let i = 0; i < particleCount; i++) {
      const p = particles[i];
      if (!p || p.life <= 0) {
        dummy.current.scale.set(0, 0, 0);
      } else {
        p.pos.add(p.vel.clone().multiplyScalar(delta));
        p.vel.multiplyScalar(0.96);
        p.life -= delta;
        const scale = Math.max(0, (p.life / p.maxLife) * 0.12);
        dummy.current.position.copy(p.pos);
        dummy.current.scale.set(scale, scale, scale);
      }
      dummy.current.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.current.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial color={colorObj.current} emissive={colorObj.current} emissiveIntensity={2} toneMapped={false} />
    </instancedMesh>
  );
}

// 3D Mystery Box
function MysteryBox3D({ phase, rarityColor }: { phase: "idle" | "opening" | "reveal"; rarityColor: string }) {
  const boxRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    timeRef.current = 0;
    setShowBurst(false);
  }, [phase]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    if (!boxRef.current || !lidRef.current) return;

    if (phase === "idle") {
      // Gentle float and rotate
      boxRef.current.rotation.y = t * 0.5;
      boxRef.current.position.y = Math.sin(t * 1.5) * 0.15;
      lidRef.current.rotation.x = 0;
      lidRef.current.position.y = 0.52;
    } else if (phase === "opening") {
      // Intense shake, then lid opens
      const shakeIntensity = Math.min(t * 2, 1);
      const shake = Math.sin(t * 30) * 0.1 * shakeIntensity;
      boxRef.current.rotation.y = t * 3;
      boxRef.current.position.x = shake;
      boxRef.current.position.z = shake * 0.7;

      // Lid opens after 1 second
      if (t > 1) {
        const lidOpen = Math.min((t - 1) * 2, 1);
        lidRef.current.rotation.x = -lidOpen * Math.PI * 0.7;
        lidRef.current.position.y = 0.52 + lidOpen * 0.3;

        if (!showBurst && lidOpen > 0.3) {
          setShowBurst(true);
        }
      }

      // Scale up glow
      if (glowRef.current) {
        const glowScale = Math.min(t * 0.8, 2);
        glowRef.current.scale.set(glowScale, glowScale, glowScale);
        (glowRef.current.material as THREE.MeshStandardMaterial).opacity = Math.min(t * 0.3, 0.6);
      }
    } else if (phase === "reveal") {
      // Slow majestic rotation
      boxRef.current.rotation.y = t * 0.3;
      boxRef.current.position.y = 0;
      boxRef.current.position.x = 0;
      boxRef.current.position.z = 0;
      lidRef.current.rotation.x = -Math.PI * 0.7;
      lidRef.current.position.y = 0.82;

      if (glowRef.current) {
        const pulse = 1.5 + Math.sin(t * 2) * 0.3;
        glowRef.current.scale.set(pulse, pulse, pulse);
        (glowRef.current.material as THREE.MeshStandardMaterial).opacity = 0.4 + Math.sin(t * 3) * 0.15;
      }
    }
  });

  const boxColor = new THREE.Color(rarityColor);

  return (
    <>
      {/* Ambient + directional lights */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 5, 2]} intensity={1} />
      <pointLight position={[0, 2, 0]} intensity={0.8} color={rarityColor} />

      <group ref={boxRef}>
        {/* Box body */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#1a1040" metalness={0.7} roughness={0.2} />
        </mesh>

        {/* Edges / trim */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(1.01, 1.01, 1.01)]} />
          <lineBasicMaterial color={rarityColor} linewidth={2} />
        </lineSegments>

        {/* Question mark decal (front face) */}
        <mesh position={[0, 0.05, 0.51]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshStandardMaterial color={rarityColor} emissive={rarityColor} emissiveIntensity={1} transparent opacity={0.8} />
        </mesh>

        {/* Lid */}
        <mesh ref={lidRef} position={[0, 0.52, 0]}>
          <boxGeometry args={[1.05, 0.15, 1.05]} />
          <meshStandardMaterial color="#2a1860" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Inner glow */}
        <mesh ref={glowRef} position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshStandardMaterial
            color={rarityColor}
            emissive={rarityColor}
            emissiveIntensity={3}
            transparent
            opacity={0}
            toneMapped={false}
          />
        </mesh>
      </group>

      <Particles active={phase === "opening" || phase === "reveal"} color={rarityColor} burst={showBurst} />
    </>
  );
}

export const MysteryBoxModal = ({ open, onOpenChange }: MysteryBoxModalProps) => {
  const [phase, setPhase] = useState<"idle" | "opening" | "reveal">("idle");
  const [reward, setReward] = useState<BoxReward | null>(null);
  const [currencies, setCurrencies] = useState<{ coins: number; gems: number; gold: number } | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [loading, setLoading] = useState(true);

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
        // Create a row if none exists
        await supabase.from("player_currencies").insert({ user_id: user.id, coins: 0, gems: 0, gold: 0 });
        setCurrencies({ coins: 0, gems: 0, gold: 0 });
      }
    } catch (e) {
      console.error("Failed to load currencies:", e);
      setCurrencies({ coins: 0, gems: 0, gold: 0 });
    } finally {
      setLoading(false);
    }
  };

  const canAfford = currencies ? currencies.coins >= 1000 && currencies.gems >= 1000 && currencies.gold >= 1000 : false;

  const openBox = async () => {
    if (!canAfford || purchasing || !currencies) return;
    setPurchasing(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPurchasing(false); return; }

    // Re-fetch to avoid stale data
    const { data: fresh } = await supabase.from("player_currencies").select("coins, gems, gold").eq("user_id", user.id).maybeSingle();
    if (!fresh || fresh.coins < 1000 || fresh.gems < 1000 || fresh.gold < 1000) {
      toast.error("Not enough currency!");
      if (fresh) setCurrencies({ coins: fresh.coins, gems: fresh.gems, gold: fresh.gold });
      setPurchasing(false);
      return;
    }

    const newCurr = {
      coins: fresh.coins - 1000,
      gems: fresh.gems - 1000,
      gold: fresh.gold - 1000,
    };
    const { error } = await supabase.from("player_currencies").update(newCurr).eq("user_id", user.id);
    if (error) { toast.error("Purchase failed"); setPurchasing(false); return; }
    setCurrencies(newCurr);

    const won = pickReward();
    setReward(won);
    setPhase("opening");

    // After 2.5s, reveal
    setTimeout(() => {
      finishReveal(won);
    }, 2500);
  };

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

  const rarityColor = reward ? RARITY_COLORS[reward.rarity] : "#A855F7";

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
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="flex items-center gap-1 text-sm">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="font-bold">{currencies?.coins ?? 0}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Gem className="w-4 h-4 text-purple-400" />
                <span className="font-bold">{currencies?.gems ?? 0}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="font-bold">{currencies?.gold ?? 0}</span>
              </div>
            </>
          )}
        </div>

        {/* 3D Box */}
        <div className="rounded-lg overflow-hidden" style={{ height: 280, background: "#0a0a1a" }}>
          <Canvas camera={{ position: [0, 1.2, 3], fov: 45 }}>
            <Suspense fallback={null}>
              <MysteryBox3D phase={phase} rarityColor={rarityColor} />
            </Suspense>
          </Canvas>
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
                disabled={loading || !canAfford || purchasing}
                className="w-full gap-2"
                size="lg"
              >
                <Sparkles className="w-5 h-5" />
                {loading ? "Loading..." : !canAfford ? "Not Enough Currency" : "Open Mystery Box"}
              </Button>
            </>
          )}
          {phase === "opening" && (
            <div className="text-center text-sm text-muted-foreground animate-pulse">
              Opening...
            </div>
          )}
          {phase === "reveal" && (
            <Button onClick={() => { setPhase("idle"); setReward(null); }} variant="outline" className="w-full">
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
