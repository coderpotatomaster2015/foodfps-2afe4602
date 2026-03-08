import { useState, useEffect, useRef, Suspense, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Coins, Gem, Star, Loader2, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
    id: "basic", name: "Basic Drop", subtitle: "Starter rewards",
    costCoins: 500, costGems: 500, costGold: 500,
    weights: { common: 50, uncommon: 30, rare: 14, epic: 5, legendary: 1 },
    boxColor: "#2a3a5c", accentColor: "#60a5fa", glowColor: "#3b82f6",
  },
  {
    id: "rare", name: "Rare Drop", subtitle: "Better odds",
    costCoins: 1500, costGems: 1500, costGold: 1500,
    weights: { common: 30, uncommon: 30, rare: 24, epic: 12, legendary: 4 },
    boxColor: "#1e3a5f", accentColor: "#38bdf8", glowColor: "#0ea5e9",
  },
  {
    id: "epic", name: "Epic Drop", subtitle: "High value",
    costCoins: 3000, costGems: 3000, costGold: 3000,
    weights: { common: 15, uncommon: 25, rare: 30, epic: 20, legendary: 10 },
    boxColor: "#3b1f6e", accentColor: "#c084fc", glowColor: "#a855f7",
  },
  {
    id: "legendary", name: "Legendary Drop", subtitle: "Premium loot",
    costCoins: 5000, costGems: 5000, costGold: 5000,
    weights: { common: 5, uncommon: 15, rare: 30, epic: 28, legendary: 22 },
    boxColor: "#5c3a0e", accentColor: "#fbbf24", glowColor: "#f59e0b",
  },
  {
    id: "chaos", name: "Chaos Drop", subtitle: "Maximum chaos",
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

const RARITY_BACKGROUNDS: Record<string, string> = {
  common: "",
  uncommon: "/drops/super-rare.png",
  rare: "/drops/rare.png",
  epic: "/drops/epic.jpg",
  legendary: "/drops/mythic.jpg",
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

/* ───── Star-shaped confetti particles ───── */
function StarConfetti({ active, color, burst }: { active: boolean; color: string; burst: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 120;
  const pRef = useRef<{ pos: THREE.Vector3; vel: THREE.Vector3; rot: THREE.Vector3; rotSpd: THREE.Vector3; life: number; max: number; scale: number }[]>([]);
  const dummy = useRef(new THREE.Object3D());
  const col = useRef(new THREE.Color(color));
  const starColors = useRef<THREE.Color[]>([]);

  useEffect(() => { col.current.set(color); }, [color]);

  useEffect(() => {
    if (burst && meshRef.current) {
      const palette = [color, "#FFD700", "#FF6B6B", "#4ECDC4", "#FFE66D", "#FF8A5C", "#A78BFA"];
      starColors.current = Array.from({ length: count }, () => new THREE.Color(palette[Math.floor(Math.random() * palette.length)]));
      pRef.current = Array.from({ length: count }, () => {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const speed = 4 + Math.random() * 8;
        return {
          pos: new THREE.Vector3(0, 0, 0),
          vel: new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * speed,
            Math.abs(Math.sin(phi) * Math.sin(theta)) * speed + 3,
            Math.cos(phi) * speed * 0.5
          ),
          rot: new THREE.Vector3(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
          rotSpd: new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10),
          life: 1.5 + Math.random() * 2,
          max: 1.5 + Math.random() * 2,
          scale: 0.04 + Math.random() * 0.12,
        };
      });
    }
  }, [burst, color]);

  useFrame((_, dt) => {
    if (!meshRef.current || !active) return;
    for (let i = 0; i < count; i++) {
      const p = pRef.current[i];
      if (!p || p.life <= 0) {
        dummy.current.scale.set(0, 0, 0);
      } else {
        p.pos.add(p.vel.clone().multiplyScalar(dt));
        p.vel.y -= dt * 6;
        p.vel.multiplyScalar(0.98);
        p.rot.add(p.rotSpd.clone().multiplyScalar(dt));
        p.life -= dt;
        const fade = Math.max(0, p.life / p.max);
        const s = p.scale * fade;
        dummy.current.position.copy(p.pos);
        dummy.current.rotation.set(p.rot.x, p.rot.y, p.rot.z);
        dummy.current.scale.set(s, s, s * 0.3);
      }
      dummy.current.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.current.matrix);
      if (starColors.current[i]) {
        meshRef.current.setColorAt(i, starColors.current[i]);
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial vertexColors emissive={col.current} emissiveIntensity={2} toneMapped={false} />
    </instancedMesh>
  );
}

/* ───── Light rays that burst outward ───── */
function LightRays({ active, color, intensity }: { active: boolean; color: string; intensity: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const rayCount = 16;
  const tRef = useRef(0);

  useFrame((_, dt) => {
    if (!groupRef.current || !active) return;
    tRef.current += dt;
    groupRef.current.rotation.z = tRef.current * 0.3;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const pulse = 1 + Math.sin(tRef.current * 4 + i * 0.5) * 0.3;
      mesh.scale.y = pulse * intensity;
      mesh.scale.x = 0.3 + Math.sin(tRef.current * 3 + i) * 0.1;
      (mesh.material as THREE.MeshStandardMaterial).opacity = Math.min(intensity * 0.6, 0.8);
    });
  });

  const rayColor = useMemo(() => new THREE.Color(color), [color]);

  return (
    <group ref={groupRef}>
      {Array.from({ length: rayCount }).map((_, i) => {
        const angle = (i / rayCount) * Math.PI * 2;
        return (
          <mesh key={i} position={[0, 0, -0.1]} rotation={[0, 0, angle]}>
            <planeGeometry args={[0.08, 3]} />
            <meshStandardMaterial
              color={rayColor}
              emissive={rayColor}
              emissiveIntensity={3}
              transparent
              opacity={0}
              side={THREE.DoubleSide}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/* ───── Ground impact ring ───── */
function ImpactRing({ active, color }: { active: boolean; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const tRef = useRef(0);

  useFrame((_, dt) => {
    if (!meshRef.current || !active) return;
    tRef.current += dt;
    const expand = Math.min(tRef.current * 3, 3);
    meshRef.current.scale.set(expand, expand, 1);
    (meshRef.current.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - tRef.current * 0.5);
  });

  useEffect(() => { tRef.current = 0; }, [active]);

  const ringColor = useMemo(() => new THREE.Color(color), [color]);

  return (
    <mesh ref={meshRef} position={[0, -1.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.5, 0.7, 32]} />
      <meshStandardMaterial color={ringColor} emissive={ringColor} emissiveIntensity={3} transparent opacity={0} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

/* ───── Camera shake ───── */
function CameraShake({ intensity }: { intensity: number }) {
  const { camera } = useThree();
  const basePos = useRef(new THREE.Vector3(0, 0.5, 3.5));

  useFrame(() => {
    if (intensity > 0) {
      camera.position.x = basePos.current.x + (Math.random() - 0.5) * intensity * 0.15;
      camera.position.y = basePos.current.y + (Math.random() - 0.5) * intensity * 0.1;
    } else {
      camera.position.x = basePos.current.x;
      camera.position.y = basePos.current.y;
    }
  });

  return null;
}

/* ───── Main 3D Drop Scene (Brawl Stars style) ───── */
type DropPhase = "idle" | "falling" | "impact" | "shaking" | "cracking" | "exploding" | "reveal";

function BrawlStarsDrop({ phase, tier, rarityColor, onPhaseAuto }: {
  phase: DropPhase;
  tier: DropTier;
  rarityColor: string;
  onPhaseAuto: (next: DropPhase) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const boxGroupRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const crackGlowRef = useRef<THREE.Mesh>(null);
  const tRef = useRef(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showRays, setShowRays] = useState(false);
  const [showImpact, setShowImpact] = useState(false);
  const [rayIntensity, setRayIntensity] = useState(0);
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const phaseRef = useRef(phase);

  useEffect(() => {
    phaseRef.current = phase;
    tRef.current = 0;
    if (phase === "idle") {
      setShowConfetti(false);
      setShowRays(false);
      setShowImpact(false);
      setRayIntensity(0);
      setShakeIntensity(0);
    }
    if (phase === "falling") {
      setShowConfetti(false);
      setShowRays(false);
      setShowImpact(false);
    }
  }, [phase]);

  const accent = useMemo(() => new THREE.Color(tier.accentColor), [tier.accentColor]);
  const glow = useMemo(() => new THREE.Color(tier.glowColor), [tier.glowColor]);
  const rCol = useMemo(() => new THREE.Color(rarityColor), [rarityColor]);

  useFrame((_, dt) => {
    tRef.current += dt;
    const t = tRef.current;
    if (!groupRef.current || !boxGroupRef.current) return;

    const currentPhase = phaseRef.current;

    if (currentPhase === "idle") {
      // Gentle float + slow spin
      groupRef.current.position.y = Math.sin(t * 1.5) * 0.1;
      groupRef.current.position.x = 0;
      boxGroupRef.current.rotation.y = t * 0.5;
      boxGroupRef.current.rotation.z = Math.sin(t * 2) * 0.03;
      boxGroupRef.current.scale.setScalar(1);
      if (lidRef.current) {
        lidRef.current.position.y = 0.62;
        lidRef.current.rotation.x = 0;
      }
      if (glowRef.current) {
        const gs = 0.5 + Math.sin(t * 2) * 0.05;
        glowRef.current.scale.setScalar(gs);
        (glowRef.current.material as THREE.MeshStandardMaterial).opacity = 0.15 + Math.sin(t * 3) * 0.05;
      }
      if (crackGlowRef.current) {
        (crackGlowRef.current.material as THREE.MeshStandardMaterial).opacity = 0;
      }
      setShakeIntensity(0);
    }

    else if (currentPhase === "falling") {
      // Drop from above with slight spin
      const fallProgress = Math.min(t * 2.5, 1);
      const eased = 1 - Math.pow(1 - fallProgress, 3); // ease-out cubic
      groupRef.current.position.y = 6 - eased * 6;
      boxGroupRef.current.rotation.y = t * 3;
      boxGroupRef.current.rotation.z = Math.sin(t * 8) * 0.1;
      // Slight scale bounce anticipation
      const s = fallProgress < 0.95 ? 0.8 + fallProgress * 0.2 : 1;
      boxGroupRef.current.scale.setScalar(s);

      if (fallProgress >= 1) {
        onPhaseAuto("impact");
      }
    }

    else if (currentPhase === "impact") {
      // Squash & stretch on landing
      const impactT = Math.min(t * 4, 1);
      const squash = impactT < 0.3
        ? 1 - impactT * 1.5  // squash down
        : 1 - 0.45 + (impactT - 0.3) * 0.64; // bounce back
      const stretch = impactT < 0.3
        ? 1 + impactT * 1.2
        : 1 + 0.36 - (impactT - 0.3) * 0.51;
      boxGroupRef.current.scale.set(stretch, squash, stretch);
      groupRef.current.position.y = 0;
      boxGroupRef.current.rotation.y += dt * 0.5;

      if (!showImpact) setShowImpact(true);
      setShakeIntensity(Math.max(0, 1 - t * 2));

      if (impactT >= 1) {
        onPhaseAuto("shaking");
      }
    }

    else if (currentPhase === "shaking") {
      // Violent shake, building intensity
      groupRef.current.position.y = 0;
      boxGroupRef.current.scale.setScalar(1);
      const shakeAmt = Math.min(t * 0.8, 1);
      const freq = 30 + t * 20;
      boxGroupRef.current.position.x = Math.sin(t * freq) * 0.06 * shakeAmt;
      boxGroupRef.current.position.y = Math.abs(Math.sin(t * freq * 1.3)) * 0.03 * shakeAmt;
      boxGroupRef.current.rotation.z = Math.sin(t * freq * 0.7) * 0.08 * shakeAmt;
      boxGroupRef.current.rotation.x = Math.sin(t * freq * 0.5) * 0.04 * shakeAmt;

      setShakeIntensity(shakeAmt * 0.8);

      // Crack glow intensifies
      if (crackGlowRef.current) {
        (crackGlowRef.current.material as THREE.MeshStandardMaterial).opacity = shakeAmt * 0.8;
        crackGlowRef.current.scale.setScalar(0.6 + shakeAmt * 0.3);
      }

      if (t > 1.8) {
        onPhaseAuto("cracking");
      }
    }

    else if (currentPhase === "cracking") {
      // Light leaks through cracks, building to burst
      const crackT = Math.min(t * 1.5, 1);
      boxGroupRef.current.position.x = Math.sin(t * 60) * 0.1 * (1 - crackT * 0.5);
      boxGroupRef.current.rotation.z = Math.sin(t * 50) * 0.12 * (1 - crackT * 0.3);
      setShakeIntensity(1 - crackT * 0.3);

      if (crackGlowRef.current) {
        const gIntensity = 0.8 + crackT * 0.2;
        (crackGlowRef.current.material as THREE.MeshStandardMaterial).opacity = gIntensity;
        (crackGlowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 3 + crackT * 5;
        crackGlowRef.current.scale.setScalar(0.9 + crackT * 0.6);
      }

      if (!showRays) setShowRays(true);
      setRayIntensity(crackT);

      if (crackT >= 1) {
        onPhaseAuto("exploding");
      }
    }

    else if (currentPhase === "exploding") {
      // Box pieces fly apart, massive light burst
      const explodeT = Math.min(t * 2, 1);
      if (!showConfetti) setShowConfetti(true);
      setShakeIntensity(Math.max(0, 0.5 - t));
      setRayIntensity(Math.max(0, 1.5 - t));

      // Scale box down and apart
      const boxScale = Math.max(0, 1 - explodeT * 1.5);
      boxGroupRef.current.scale.setScalar(boxScale);
      boxGroupRef.current.rotation.y += dt * 8;

      // Lid flies up
      if (lidRef.current) {
        lidRef.current.position.y = 0.62 + explodeT * 4;
        lidRef.current.rotation.x = -explodeT * 2;
        lidRef.current.rotation.z = explodeT * 1.5;
      }

      // Inner glow expands
      if (glowRef.current) {
        glowRef.current.scale.setScalar(0.5 + explodeT * 2);
        (glowRef.current.material as THREE.MeshStandardMaterial).opacity = 1 - explodeT * 0.3;
        (glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 5 + explodeT * 10;
      }

      if (explodeT >= 1) {
        onPhaseAuto("reveal");
      }
    }

    else if (currentPhase === "reveal") {
      // Reward glow orbiting gently
      boxGroupRef.current.scale.setScalar(0);
      if (glowRef.current) {
        const pulse = 1.2 + Math.sin(t * 3) * 0.2;
        glowRef.current.scale.setScalar(pulse);
        (glowRef.current.material as THREE.MeshStandardMaterial).opacity = 0.8 + Math.sin(t * 4) * 0.15;
        (glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 6 + Math.sin(t * 2) * 2;
        glowRef.current.rotation.y = t * 1.5;
      }
      groupRef.current.position.y = 0;
      setRayIntensity(0.3 + Math.sin(t * 2) * 0.1);
      setShakeIntensity(0);
    }
  });

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[3, 5, 2]} intensity={0.6} />
      <pointLight position={[0, 2, 0]} intensity={1.5} color={tier.glowColor} />
      <pointLight position={[-2, -1, 2]} intensity={0.3} color={tier.accentColor} />
      {(phase === "exploding" || phase === "reveal") && (
        <pointLight position={[0, 0, 0]} intensity={3} color={rarityColor} distance={8} />
      )}

      <CameraShake intensity={shakeIntensity} />

      <group ref={groupRef}>
        {/* The box group */}
        <group ref={boxGroupRef}>
          {/* Main box body — rounded cube look */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={tier.boxColor} metalness={0.7} roughness={0.2} />
          </mesh>

          {/* Beveled edges — accent strips */}
          {[
            [0.52, 0, 0, 0, 0, 0],
            [-0.52, 0, 0, 0, 0, 0],
            [0, 0, 0.52, 0, Math.PI / 2, 0],
            [0, 0, -0.52, 0, Math.PI / 2, 0],
          ].map(([x, y, z, rx, ry, rz], i) => (
            <mesh key={`edge-${i}`} position={[x as number, y as number, z as number]} rotation={[rx as number, ry as number, rz as number]}>
              <boxGeometry args={[0.04, 0.9, 0.04]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} toneMapped={false} />
            </mesh>
          ))}

          {/* Top horizontal accent strips */}
          {[0, Math.PI / 2].map((rot, i) => (
            <mesh key={`topstrip-${i}`} position={[0, 0.52, 0]} rotation={[0, rot, 0]}>
              <boxGeometry args={[1.05, 0.04, 0.04]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} toneMapped={false} />
            </mesh>
          ))}

          {/* Bottom horizontal accent strips */}
          {[0, Math.PI / 2].map((rot, i) => (
            <mesh key={`botstrip-${i}`} position={[0, -0.52, 0]} rotation={[0, rot, 0]}>
              <boxGeometry args={[1.05, 0.04, 0.04]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} toneMapped={false} />
            </mesh>
          ))}

          {/* Star emblem on front face */}
          <mesh position={[0, 0, 0.52]}>
            <circleGeometry args={[0.22, 6]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={3} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          {/* Inner star */}
          <mesh position={[0, 0, 0.525]}>
            <circleGeometry args={[0.12, 6]} />
            <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={4} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>

          {/* Lid group */}
          <group ref={lidRef} position={[0, 0.62, 0]}>
            <mesh>
              <boxGeometry args={[1.05, 0.15, 1.05]} />
              <meshStandardMaterial color={tier.boxColor} metalness={0.7} roughness={0.2} />
            </mesh>
            {/* Lid accent cross */}
            <mesh position={[0, 0.08, 0]}>
              <boxGeometry args={[0.8, 0.02, 0.08]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.08, 0]}>
              <boxGeometry args={[0.08, 0.02, 0.8]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} toneMapped={false} />
            </mesh>
            {/* Lid knob */}
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.08, 0.12, 0.08, 8]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.5} toneMapped={false} />
            </mesh>
          </group>

          {/* Crack glow — visible during shaking/cracking */}
          <mesh ref={crackGlowRef} position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.65, 16, 16]} />
            <meshStandardMaterial
              color={rarityColor}
              emissive={rCol}
              emissiveIntensity={3}
              transparent
              opacity={0}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        </group>

        {/* Inner reward glow orb */}
        <mesh ref={glowRef} position={[0, 0, 0]}>
          <icosahedronGeometry args={[0.5, 2]} />
          <meshStandardMaterial
            color={rarityColor}
            emissive={rCol}
            emissiveIntensity={5}
            transparent
            opacity={0}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Light rays */}
      <LightRays active={showRays} color={rarityColor} intensity={rayIntensity} />

      {/* Impact ring on ground */}
      <ImpactRing active={showImpact} color={tier.accentColor} />

      {/* Star confetti */}
      <StarConfetti active={showConfetti} color={rarityColor} burst={showConfetti} />

      {/* Ground plane for shadows */}
      <mesh position={[0, -1.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#050510" transparent opacity={0.5} />
      </mesh>
    </>
  );
}

/* ═══════════════════ Main component ═══════════════════ */
export const MysteryBoxModal = ({ open, onOpenChange }: MysteryBoxModalProps) => {
  const [selectedTier, setSelectedTier] = useState(0);
  const [phase, setPhase] = useState<DropPhase>("idle");
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

  const handlePhaseAuto = useCallback((next: DropPhase) => {
    setPhase(next);
  }, []);

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
    setPhase("falling");
  }, [canAfford, purchasing, currencies, tier]);

  // When we reach reveal phase, grant the reward
  useEffect(() => {
    if (phase === "reveal" && reward) {
      grantReward(reward);
    }
  }, [phase, reward]);

  const grantRewardCalled = useRef(false);
  useEffect(() => { grantRewardCalled.current = false; }, [purchasing]);

  const grantReward = async (won: BoxReward) => {
    if (grantRewardCalled.current) return;
    grantRewardCalled.current = true;
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
  const isAnimating = phase !== "idle" && phase !== "reveal";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isAnimating) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0" style={{ background: "linear-gradient(180deg, #0a0a18 0%, #120822 50%, #0d0d1a 100%)" }}>
        {/* Header */}
        <div className="px-5 pt-5 pb-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black tracking-wide" style={{ color: tier.accentColor }}>
              <Zap className="w-5 h-5" />
              MYSTERY DROPS
            </DialogTitle>
            <DialogDescription className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
              Choose a tier. Higher cost = better legendary odds!
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Currency bar */}
        <div className="flex gap-4 justify-center py-2 mx-5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
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

        {/* Tier selector */}
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            onClick={() => setSelectedTier(Math.max(0, selectedTier - 1))}
            disabled={selectedTier === 0 || isAnimating}
            className="p-1 rounded-full transition-colors disabled:opacity-30"
            style={{ color: tier.accentColor }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex gap-1.5 justify-center overflow-x-auto">
            {DROP_TIERS.map((t, i) => (
              <button
                key={t.id}
                onClick={() => { if (!isAnimating) setSelectedTier(i); }}
                disabled={isAnimating}
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
            disabled={selectedTier === DROP_TIERS.length - 1 || isAnimating}
            className="p-1 rounded-full transition-colors disabled:opacity-30"
            style={{ color: tier.accentColor }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Scene with video background */}
        <div className="mx-5 rounded-xl overflow-hidden relative" style={{
          height: 260,
          background: `radial-gradient(ellipse at center, ${tier.glowColor}18 0%, #07071a 70%)`,
          border: `1px solid ${tier.accentColor}20`,
        }}>
          {/* Video background — plays during animation */}
          <video
            ref={(el) => {
              if (!el) return;
              if (isAnimating || phase === "reveal") {
                el.currentTime = 0;
                el.play().catch(() => {});
              } else {
                el.pause();
                el.currentTime = 0;
              }
            }}
            src="/drop.mov"
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
            style={{
              opacity: isAnimating ? 0.6 : phase === "reveal" ? 0.35 : 0,
              transition: "opacity 0.4s ease",
              mixBlendMode: "screen",
            }}
          />

          {/* Tier label overlay */}
          <div className="absolute top-2 left-3 z-10">
            <span className="text-xs font-black tracking-wider uppercase" style={{ color: tier.accentColor, textShadow: `0 0 10px ${tier.glowColor}80` }}>
              {tier.name}
            </span>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{tier.subtitle}</p>
          </div>

          {/* Phase indicator */}
          {isAnimating && (
            <div className="absolute bottom-2 left-0 right-0 text-center z-10">
              <span className="text-xs font-bold animate-pulse" style={{ color: tier.accentColor }}>
                {phase === "falling" ? "⬇ INCOMING..." :
                 phase === "impact" ? "💥 IMPACT!" :
                 phase === "shaking" ? "🔥 BUILDING UP..." :
                 phase === "cracking" ? "⚡ CRACKING OPEN..." :
                 phase === "exploding" ? "💫 BOOM!" : ""}
              </span>
            </div>
          )}

          <div className="relative z-[1] w-full h-full">
            <Canvas camera={{ position: [0, 0.5, 3.5], fov: 50 }}>
              <Suspense fallback={null}>
                <BrawlStarsDrop
                  phase={phase}
                  tier={tier}
                  rarityColor={rarityColor}
                  onPhaseAuto={handlePhaseAuto}
                />
              </Suspense>
            </Canvas>
          </div>
        </div>

        {/* Reveal card */}
        {phase === "reveal" && reward && (
          <div className="mx-5 p-4 rounded-xl text-center animate-scale-in" style={{
            background: `linear-gradient(135deg, ${RARITY_COLORS[reward.rarity]}25 0%, ${RARITY_COLORS[reward.rarity]}08 100%)`,
            border: `2px solid ${RARITY_COLORS[reward.rarity]}`,
            boxShadow: `0 0 40px ${RARITY_COLORS[reward.rarity]}50, inset 0 0 40px ${RARITY_COLORS[reward.rarity]}15`,
          }}>
            <Badge className="mb-1.5 text-xs font-black uppercase tracking-wider" style={{ backgroundColor: RARITY_COLORS[reward.rarity], color: "#fff" }}>
              {reward.rarity}
            </Badge>
            <h3 className="text-xl font-black text-white" style={{ textShadow: `0 0 20px ${RARITY_COLORS[reward.rarity]}80` }}>
              {reward.name}
            </h3>
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
                className="w-full py-3 rounded-xl font-black text-sm tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-40 uppercase"
                style={{
                  background: canAfford ? `linear-gradient(135deg, ${tier.accentColor}, ${tier.glowColor})` : "rgba(255,255,255,0.08)",
                  color: canAfford ? "#000" : "rgba(255,255,255,0.4)",
                  boxShadow: canAfford ? `0 4px 20px ${tier.glowColor}50, 0 0 40px ${tier.glowColor}20` : "none",
                }}
              >
                <Zap className="w-4 h-4" />
                {loading ? "Loading..." : !canAfford ? "Not Enough Currency" : `Open ${tier.name}`}
              </button>
            </>
          )}
          {isAnimating && (
            <div className="text-center text-sm font-bold animate-pulse py-2" style={{ color: tier.accentColor }}>
              Dropping...
            </div>
          )}
          {phase === "reveal" && (
            <button
              onClick={() => { setPhase("idle"); setReward(null); }}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all uppercase tracking-wide"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Open Another
            </button>
          )}
        </div>

        {/* Drop rates */}
        <div className="px-5 pb-4 pt-1">
          <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
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
