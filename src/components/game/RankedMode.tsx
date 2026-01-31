import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Swords, Heart, Trophy, Medal, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TouchControls } from "./TouchControls";
import { AdminChat } from "./AdminChat";

interface RankedModeProps {
  username: string;
  onBack: () => void;
  touchscreenMode: boolean;
  playerSkin: string;
  adminAbuseEvents?: { event_type: string; expires_at: string }[];
}

type Weapon = "pistol" | "shotgun" | "minigun" | "sniper" | "sword" | "knife" | "axe" | "rifle" | "smg" | "rpg" | "flamethrower" | "railgun";

interface WeaponConfig {
  name: string;
  fireRate: number;
  damage: number;
  ammo: number;
  maxAmmo: number;
  spread: number;
  bulletSpeed: number;
  color: string;
  isMelee: boolean;
}

const WEAPONS: Record<Weapon, WeaponConfig> = {
  pistol: { name: "Pistol", fireRate: 0.18, damage: 40, ammo: 10, maxAmmo: 10, spread: 10, bulletSpeed: 420, color: "#FFB84D", isMelee: false },
  shotgun: { name: "Shotgun", fireRate: 0.5, damage: 25, ammo: 6, maxAmmo: 6, spread: 40, bulletSpeed: 380, color: "#FF6B6B", isMelee: false },
  sword: { name: "Sword", fireRate: 0.4, damage: 80, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 0, color: "#C0C0C0", isMelee: true },
  rifle: { name: "Rifle", fireRate: 0.12, damage: 35, ammo: 30, maxAmmo: 30, spread: 5, bulletSpeed: 600, color: "#8B7355", isMelee: false },
  sniper: { name: "Sniper", fireRate: 1.0, damage: 120, ammo: 5, maxAmmo: 5, spread: 0, bulletSpeed: 800, color: "#A6FFB3", isMelee: false },
  smg: { name: "SMG", fireRate: 0.08, damage: 25, ammo: 40, maxAmmo: 40, spread: 15, bulletSpeed: 480, color: "#FFD700", isMelee: false },
  knife: { name: "Knife", fireRate: 0.2, damage: 50, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 0, color: "#888888", isMelee: true },
  rpg: { name: "RPG", fireRate: 2.5, damage: 200, ammo: 3, maxAmmo: 3, spread: 0, bulletSpeed: 300, color: "#FF00FF", isMelee: false },
  axe: { name: "Axe", fireRate: 0.6, damage: 100, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 0, color: "#8B4513", isMelee: true },
  flamethrower: { name: "Flamethrower", fireRate: 0.03, damage: 15, ammo: 200, maxAmmo: 200, spread: 25, bulletSpeed: 200, color: "#FF4500", isMelee: false },
  minigun: { name: "Minigun", fireRate: 0.05, damage: 20, ammo: 100, maxAmmo: 100, spread: 20, bulletSpeed: 500, color: "#6BAFFF", isMelee: false },
  railgun: { name: "Railgun", fireRate: 1.8, damage: 250, ammo: 4, maxAmmo: 4, spread: 0, bulletSpeed: 1200, color: "#00FFFF", isMelee: false },
};

const WEAPON_ORDER: Weapon[] = ["pistol", "shotgun", "sword", "rifle", "sniper", "smg", "knife", "rpg", "axe", "flamethrower", "minigun", "railgun"];

const WAVE_CONFIG = [
  { count: 8, types: ["normal"], spawnDelay: 1000 },
  { count: 12, types: ["normal", "fast"], spawnDelay: 800 },
  { count: 15, types: ["normal", "fast", "tank"], spawnDelay: 600 },
  { count: 18, types: ["normal", "fast", "tank"], spawnDelay: 500 },
  { count: 20, types: ["fast", "tank", "elite"], spawnDelay: 400 },
  { count: 25, types: ["fast", "tank", "elite"], spawnDelay: 350 },
  { count: 30, types: ["tank", "elite"], spawnDelay: 300 },
];

const RANK_THRESHOLDS = [
  { rank: "bronze", minWaves: 1 },
  { rank: "gold", minWaves: 3 },
  { rank: "diamond", minWaves: 5 },
  { rank: "pro", minWaves: 7 },
];

interface Enemy {
  id: string;
  x: number;
  y: number;
  r: number;
  speed: number;
  hp: number;
  maxHp: number;
  color: string;
  type: "normal" | "fast" | "tank" | "elite";
  stun: number;
  lastShot: number;
}

export const RankedMode = ({ username, onBack, touchscreenMode, playerSkin, adminAbuseEvents = [] }: RankedModeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [gameState, setGameState] = useState<"ready" | "playing" | "waveComplete" | "victory" | "defeat">("ready");
  const [currentWave, setCurrentWave] = useState(1);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [earnedRank, setEarnedRank] = useState<string | null>(null);
  const [earnedTier, setEarnedTier] = useState<number | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [ammo, setAmmo] = useState(10);
  const [maxAmmo, setMaxAmmo] = useState(10);
  const [currentWeapon, setCurrentWeapon] = useState<Weapon>("pistol");
  const [unlockedWeapons, setUnlockedWeapons] = useState<Weapon[]>(["pistol"]);

  const playerRef = useRef<any>(null);
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<any[]>([]);
  const enemyBulletsRef = useRef<any[]>([]);
  const pickupsRef = useRef<any[]>([]);
  const particlesRef = useRef<any[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const mouseRef = useRef({ x: 480, y: 320, down: false });
  const spawnedCountRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const adminStateRef = useRef({ godMode: false, speedMultiplier: 1, infiniteAmmo: false });
  const specialPowerRef = useRef<string | null>(null);
  const teleportCooldownRef = useRef(0);

  // Touch controls
  const touchMoveRef = useRef({ x: 0, y: 0 });
  const touchAimRef = useRef({ x: 480, y: 320 });
  const touchShootingRef = useRef(false);

  useEffect(() => {
    checkPermissions();
    loadWeapons();
    loadSpecialPower();
    applyAdminAbuseEvents();
  }, []);

  const applyAdminAbuseEvents = () => {
    const now = new Date();
    for (const event of adminAbuseEvents) {
      if (new Date(event.expires_at) > now) {
        if (event.event_type === "godmode") {
          adminStateRef.current.godMode = true;
        } else if (event.event_type === "all_weapons") {
          setUnlockedWeapons([...WEAPON_ORDER]);
        }
      }
    }
  };

  const loadSpecialPower = () => {
    try {
      const customSkinData = localStorage.getItem("selectedCustomSkin");
      if (customSkinData) {
        const parsed = JSON.parse(customSkinData);
        specialPowerRef.current = parsed.specialPower || null;
      }
    } catch (e) {
      console.error("Error loading special power:", e);
    }
  };

  const checkPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "owner"]);

    setHasPermission(roleData && roleData.length > 0);
  };

  const loadWeapons = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("total_score")
      .eq("user_id", user.id)
      .single();

    const totalScore = profile?.total_score || 0;
    const unlocked: Weapon[] = WEAPON_ORDER.filter(w => {
      const config = WEAPONS[w];
      return (config as any).unlockScore === undefined || (config as any).unlockScore <= totalScore;
    });
    
    setUnlockedWeapons(unlocked.length > 0 ? unlocked : ["pistol"]);
  };

  const getEnemyStats = (type: string, wave: number) => {
    const waveMultiplier = 1 + (wave - 1) * 0.2;
    switch (type) {
      case "fast":
        return { hp: Math.floor(40 * waveMultiplier), speed: 120, color: "#00FF00", r: 14 };
      case "tank":
        return { hp: Math.floor(150 * waveMultiplier), speed: 40, color: "#0000FF", r: 22 };
      case "elite":
        return { hp: Math.floor(100 * waveMultiplier), speed: 80, color: "#FF00FF", r: 18 };
      default:
        return { hp: Math.floor(60 * waveMultiplier), speed: 60, color: "#FF6B6B", r: 16 };
    }
  };

  const spawnEnemy = useCallback((wave: number) => {
    const waveConfig = WAVE_CONFIG[wave - 1];
    if (!waveConfig || spawnedCountRef.current >= waveConfig.count) return;

    const types = waveConfig.types;
    const type = types[Math.floor(Math.random() * types.length)] as Enemy["type"];
    const stats = getEnemyStats(type, wave);

    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    switch (side) {
      case 0: x = Math.random() * 960; y = -30; break;
      case 1: x = 990; y = Math.random() * 640; break;
      case 2: x = Math.random() * 960; y = 670; break;
      case 3: x = -30; y = Math.random() * 640; break;
    }

    const newEnemy: Enemy = {
      id: `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x, y,
      r: stats.r,
      speed: stats.speed,
      hp: stats.hp,
      maxHp: stats.hp,
      color: stats.color,
      type,
      stun: 0,
      lastShot: -1,
    };

    enemiesRef.current.push(newEnemy);
    spawnedCountRef.current++;
  }, []);

  const startWave = useCallback(() => {
    const waveConfig = WAVE_CONFIG[currentWave - 1];
    if (!waveConfig) return;

    setGameState("playing");
    enemiesRef.current = [];
    bulletsRef.current = [];
    enemyBulletsRef.current = [];
    pickupsRef.current = [];
    spawnedCountRef.current = 0;

    // Initialize player
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    playerRef.current = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      r: 14,
      speed: 180,
      angle: 0,
      weapon: "pistol" as Weapon,
      lastShot: -1,
      hp: specialPowerRef.current === "shield" ? 125 : 100,
      ammo: 10,
      maxAmmo: 10,
    };

    setPlayerHealth(playerRef.current.hp);
    setAmmo(10);

    // Spawn enemies over time
    const spawnInterval = setInterval(() => {
      if (spawnedCountRef.current < waveConfig.count) {
        spawnEnemy(currentWave);
      } else {
        clearInterval(spawnInterval);
      }
    }, waveConfig.spawnDelay);

    return () => clearInterval(spawnInterval);
  }, [currentWave, spawnEnemy]);

  const calculateRank = (wavesCompleted: number): { rank: string; tier: number } | null => {
    if (wavesCompleted === 0) return null;

    let bestRank = RANK_THRESHOLDS[0];
    for (const threshold of RANK_THRESHOLDS) {
      if (wavesCompleted >= threshold.minWaves) {
        bestRank = threshold;
      }
    }

    let tier = 1;
    if (bestRank.rank === "pro") {
      tier = 1;
    } else {
      const nextRankIndex = RANK_THRESHOLDS.findIndex(t => t.rank === bestRank.rank) + 1;
      if (nextRankIndex < RANK_THRESHOLDS.length) {
        const nextThreshold = RANK_THRESHOLDS[nextRankIndex];
        const progress = (wavesCompleted - bestRank.minWaves) / (nextThreshold.minWaves - bestRank.minWaves);
        tier = Math.min(5, Math.floor(progress * 5) + 1);
      } else {
        tier = 5;
      }
    }

    return { rank: bestRank.rank, tier };
  };

  const endMatch = async (victory: boolean) => {
    const wavesCompleted = victory ? 7 : currentWave - 1;
    const rankResult = calculateRank(wavesCompleted);

    if (rankResult) {
      setEarnedRank(rankResult.rank);
      setEarnedTier(rankResult.tier);
    }

    setGameState(victory ? "victory" : "defeat");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("ranked_matches").insert({
          user_id: user.id,
          waves_completed: wavesCompleted,
          enemies_killed: kills,
          victory,
          rank_earned: rankResult?.rank || null,
          tier_earned: rankResult?.tier || null,
        });

        if (rankResult) {
          const { data: currentProfile } = await supabase
            .from("profiles")
            .select("ranked_rank, ranked_tier, total_score")
            .eq("user_id", user.id)
            .single();

          const rankOrder = ["bronze", "gold", "diamond", "pro"];
          const currentRankIndex = currentProfile?.ranked_rank ? rankOrder.indexOf(currentProfile.ranked_rank) : -1;
          const newRankIndex = rankOrder.indexOf(rankResult.rank);

          const shouldUpdate = newRankIndex > currentRankIndex ||
            (newRankIndex === currentRankIndex && (rankResult.tier || 0) > (currentProfile?.ranked_tier || 0));

          if (shouldUpdate) {
            await supabase
              .from("profiles")
              .update({
                ranked_rank: rankResult.rank,
                ranked_tier: rankResult.tier,
              })
              .eq("user_id", user.id);

            toast.success(`New rank achieved: ${rankResult.rank.toUpperCase()} ${rankResult.tier}!`);
          }

          // Update total score
          const currentScore = currentProfile?.total_score || 0;
          await supabase
            .from("profiles")
            .update({ total_score: currentScore + score })
            .eq("user_id", user.id);
        }
      }
    } catch (error) {
      console.error("Error saving ranked match:", error);
    }
  };

  const handleCommand = useCallback((cmd: string) => {
    if (!hasPermission) return;

    if (cmd.startsWith("/godmode")) {
      adminStateRef.current.godMode = !adminStateRef.current.godMode;
      toast.success(adminStateRef.current.godMode ? "Godmode ON" : "Godmode OFF");
    } else if (cmd.startsWith("/infiniteammo")) {
      adminStateRef.current.infiniteAmmo = !adminStateRef.current.infiniteAmmo;
      toast.success(adminStateRef.current.infiniteAmmo ? "Infinite ammo ON" : "Infinite ammo OFF");
    } else if (cmd.startsWith("/give")) {
      setUnlockedWeapons([...WEAPON_ORDER]);
      toast.success("All weapons unlocked!");
    }
  }, [hasPermission]);

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    let time = 0;
    let last = performance.now();

    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    const spawnParticles = (x: number, y: number, color: string, count = 10) => {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({ x, y, vx: rand(-120, 120), vy: rand(-120, 120), life: rand(0.3, 0.9), color });
      }
    };

    const gameLoop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      time += dt;

      const player = playerRef.current;
      if (!player) return;

      // Check game over
      if (player.hp <= 0 && !adminStateRef.current.godMode) {
        endMatch(false);
        return;
      }

      // Handle input
      let dx = 0, dy = 0;
      if (touchscreenMode) {
        dx = touchMoveRef.current.x;
        dy = touchMoveRef.current.y;
        mouseRef.current.x = touchAimRef.current.x;
        mouseRef.current.y = touchAimRef.current.y;
        mouseRef.current.down = touchShootingRef.current;
      } else {
        if (keysRef.current["w"] || keysRef.current["arrowup"]) dy -= 1;
        if (keysRef.current["s"] || keysRef.current["arrowdown"]) dy += 1;
        if (keysRef.current["a"] || keysRef.current["arrowleft"]) dx -= 1;
        if (keysRef.current["d"] || keysRef.current["arrowright"]) dx += 1;
      }

      player.angle = Math.atan2(mouseRef.current.y - player.y, mouseRef.current.x - player.x);

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx /= len; dy /= len;
        let speedMult = adminStateRef.current.speedMultiplier;
        if (specialPowerRef.current === "speed") speedMult *= 1.3;
        player.x = Math.max(20, Math.min(W - 20, player.x + dx * player.speed * speedMult * dt));
        player.y = Math.max(20, Math.min(H - 20, player.y + dy * player.speed * speedMult * dt));
      }

      // Shooting
      const weapon = WEAPONS[player.weapon as Weapon];
      const hasInfiniteAmmo = adminStateRef.current.godMode || adminStateRef.current.infiniteAmmo;
      
      if (!weapon.isMelee && mouseRef.current.down && time - player.lastShot >= weapon.fireRate && (hasInfiniteAmmo || player.ammo > 0)) {
        player.lastShot = time;
        if (!hasInfiniteAmmo) {
          player.ammo--;
          setAmmo(player.ammo);
        }

        const bulletsToFire = player.weapon === "shotgun" ? 5 : 1;
        const dmgMult = specialPowerRef.current === "double_damage" ? 2 : 1;
        
        for (let i = 0; i < bulletsToFire; i++) {
          const spread = weapon.spread * (Math.PI / 180);
          const finalAngle = player.angle + rand(-spread, spread);
          bulletsRef.current.push({
            x: player.x + Math.cos(player.angle) * player.r * 1.6,
            y: player.y + Math.sin(player.angle) * player.r * 1.6,
            vx: Math.cos(finalAngle) * weapon.bulletSpeed,
            vy: Math.sin(finalAngle) * weapon.bulletSpeed,
            r: 8,
            life: 2.5,
            dmg: weapon.damage * dmgMult,
            color: weapon.color,
          });
        }
      }

      // Update bullets
      for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
        const b = bulletsRef.current[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
          bulletsRef.current.splice(i, 1);
          continue;
        }

        // Check enemy collision
        for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
          const e = enemiesRef.current[j];
          const edx = b.x - e.x, edy = b.y - e.y;
          if (edx * edx + edy * edy <= (b.r + e.r) * (b.r + e.r)) {
            e.hp -= b.dmg;
            e.stun = 0.6;
            spawnParticles(b.x, b.y, "#FFF", 8);
            if (e.hp <= 0) {
              spawnParticles(e.x, e.y, e.color, 16);
              setScore(prev => prev + 10);
              setKills(prev => prev + 1);
              if (Math.random() < 0.35) {
                pickupsRef.current.push({ x: e.x, y: e.y, r: 10, amt: 3, ttl: 18 });
              }
              enemiesRef.current.splice(j, 1);
            }
            bulletsRef.current.splice(i, 1);
            break;
          }
        }
      }

      // Update enemies
      const slowMult = specialPowerRef.current === "slow_motion" ? 0.5 : 1;
      
      for (const e of enemiesRef.current) {
        if (e.stun > 0) {
          e.stun -= dt;
          continue;
        }

        const edx = player.x - e.x;
        const edy = player.y - e.y;
        const dist = Math.hypot(edx, edy);

        if (dist > 30) {
          e.x += (edx / dist) * e.speed * slowMult * dt;
          e.y += (edy / dist) * e.speed * slowMult * dt;
        } else if (!adminStateRef.current.godMode) {
          player.hp -= 15 * dt;
          setPlayerHealth(Math.max(0, player.hp));
        }

        // Enemy shooting
        if (time - e.lastShot >= 3.5 && dist < 400) {
          e.lastShot = time;
          const angle = Math.atan2(player.y - e.y, player.x - e.x);
          enemyBulletsRef.current.push({
            x: e.x, y: e.y,
            vx: Math.cos(angle) * 200,
            vy: Math.sin(angle) * 200,
            r: 6, life: 3, dmg: 15, color: e.color,
          });
        }
      }

      // Update enemy bullets
      for (let i = enemyBulletsRef.current.length - 1; i >= 0; i--) {
        const b = enemyBulletsRef.current[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
          enemyBulletsRef.current.splice(i, 1);
          continue;
        }

        const pdx = b.x - player.x, pdy = b.y - player.y;
        if (pdx * pdx + pdy * pdy <= (b.r + player.r) * (b.r + player.r)) {
          if (!adminStateRef.current.godMode) {
            player.hp -= b.dmg;
            setPlayerHealth(Math.max(0, player.hp));
          }
          enemyBulletsRef.current.splice(i, 1);
        }
      }

      // Update pickups
      for (let i = pickupsRef.current.length - 1; i >= 0; i--) {
        const p = pickupsRef.current[i];
        p.ttl -= dt;
        if (p.ttl <= 0) {
          pickupsRef.current.splice(i, 1);
          continue;
        }
        const pdx = p.x - player.x, pdy = p.y - player.y;
        if (pdx * pdx + pdy * pdy <= (p.r + player.r) * (p.r + player.r)) {
          player.ammo = Math.min(player.maxAmmo, player.ammo + p.amt);
          setAmmo(player.ammo);
          pickupsRef.current.splice(i, 1);
        }
      }

      // Update particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) particlesRef.current.splice(i, 1);
      }

      // Check wave complete
      const waveConfig = WAVE_CONFIG[currentWave - 1];
      if (waveConfig && spawnedCountRef.current >= waveConfig.count && enemiesRef.current.length === 0) {
        if (currentWave >= 7) {
          endMatch(true);
          return;
        } else {
          setGameState("waveComplete");
          return;
        }
      }

      // Draw
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      for (let i = 0; i < W; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, H);
        ctx.stroke();
      }
      for (let i = 0; i < H; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(W, i);
        ctx.stroke();
      }

      // Particles
      for (const p of particlesRef.current) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Pickups
      for (const p of pickupsRef.current) {
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Enemies
      for (const e of enemiesRef.current) {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const healthPercent = e.hp / e.maxHp;
        ctx.fillStyle = "#333";
        ctx.fillRect(e.x - 20, e.y - e.r - 10, 40, 6);
        ctx.fillStyle = healthPercent > 0.5 ? "#00FF00" : healthPercent > 0.25 ? "#FFFF00" : "#FF0000";
        ctx.fillRect(e.x - 20, e.y - e.r - 10, 40 * healthPercent, 6);
      }

      // Enemy bullets
      for (const b of enemyBulletsRef.current) {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Player bullets
      for (const b of bulletsRef.current) {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Player
      ctx.globalAlpha = specialPowerRef.current === "invisibility" ? 0.5 : 1;
      ctx.fillStyle = playerSkin;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Player aim line
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(player.x + Math.cos(player.angle) * 40, player.y + Math.sin(player.angle) * 40);
      ctx.stroke();
      ctx.globalAlpha = 1;

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, currentWave, playerSkin, touchscreenMode, kills, score]);

  // Input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      
      if (e.key.toLowerCase() === "r" && playerRef.current) {
        const weapon = WEAPONS[playerRef.current.weapon as Weapon];
        playerRef.current.ammo = weapon.maxAmmo;
        setAmmo(weapon.maxAmmo);
      }

      // Handle teleport
      if (e.key.toLowerCase() === "shift" && specialPowerRef.current === "teleport" && playerRef.current) {
        const now = performance.now();
        if (now - teleportCooldownRef.current >= 3000) {
          teleportCooldownRef.current = now;
          const player = playerRef.current;
          const teleportDist = 150;
          player.x = Math.max(20, Math.min(940, player.x + Math.cos(player.angle) * teleportDist));
          player.y = Math.max(20, Math.min(620, player.y + Math.sin(player.angle) * teleportDist));
          toast.info("Teleported!");
        }
      }

      const keyNum = parseInt(e.key);
      if (keyNum >= 1 && keyNum <= unlockedWeapons.length && playerRef.current) {
        const weapon = unlockedWeapons[keyNum - 1];
        playerRef.current.weapon = weapon;
        const config = WEAPONS[weapon];
        playerRef.current.ammo = config.ammo;
        playerRef.current.maxAmmo = config.maxAmmo;
        setCurrentWeapon(weapon);
        setAmmo(config.ammo);
        setMaxAmmo(config.maxAmmo);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) * (canvas.width / rect.width);
      mouseRef.current.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) mouseRef.current.down = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) mouseRef.current.down = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [unlockedWeapons]);

  const nextWave = () => {
    setCurrentWave(prev => prev + 1);
    setPlayerHealth(Math.min(100, playerHealth + 25));
    if (playerRef.current) playerRef.current.hp = Math.min(100, playerRef.current.hp + 25);
    setTimeout(() => startWave(), 100);
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case "bronze": return "text-orange-600";
      case "gold": return "text-yellow-500";
      case "diamond": return "text-blue-400";
      case "pro": return "text-purple-500";
      default: return "text-foreground";
    }
  };

  // Touch control handlers
  const handleTouchMove = useCallback((dx: number, dy: number) => {
    touchMoveRef.current = { x: dx, y: dy };
  }, []);

  const handleTouchAim = useCallback((x: number, y: number) => {
    touchAimRef.current = { x, y };
  }, []);

  const handleTouchShoot = useCallback((shooting: boolean) => {
    touchShootingRef.current = shooting;
  }, []);

  const handleTouchReload = useCallback(() => {
    if (playerRef.current) {
      const weapon = WEAPONS[playerRef.current.weapon as Weapon];
      playerRef.current.ammo = weapon.maxAmmo;
      setAmmo(weapon.maxAmmo);
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Exit
        </Button>

        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-lg px-4 py-1">
            <Swords className="w-4 h-4 mr-2" />
            Wave {currentWave}/7
          </Badge>
          <div className="flex items-center gap-2 bg-card px-3 py-1 rounded-lg">
            <Heart className="w-4 h-4 text-red-500" />
            <Progress value={playerHealth} className="w-24 h-2" />
          </div>
          <Badge variant="outline">Score: {score}</Badge>
          <Badge variant="outline">Kills: {kills}</Badge>
        </div>

        <Button variant="ghost" size="sm" onClick={() => setChatOpen(true)}>
          <MessageSquare className="w-4 h-4" />
        </Button>
      </div>

      {/* Weapon HUD */}
      {gameState === "playing" && (
        <div className="absolute bottom-4 left-4 z-10 bg-card/80 p-2 rounded-lg">
          <div className="flex gap-1 mb-2">
            {unlockedWeapons.map((w, i) => (
              <div
                key={w}
                className={`px-2 py-1 text-xs rounded ${currentWeapon === w ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
              >
                {i + 1}: {WEAPONS[w].name}
              </div>
            ))}
          </div>
          <div className="text-sm">
            Ammo: {ammo}/{maxAmmo} | Press R to reload
          </div>
        </div>
      )}

      {/* Ready Screen */}
      {gameState === "ready" && (
        <Card className="p-8 text-center space-y-6 max-w-md">
          <div>
            <Medal className="w-16 h-16 mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-bold">Ranked Mode</h2>
            <p className="text-muted-foreground mt-2">
              Survive 7 waves of increasingly difficult enemies to earn your rank!
            </p>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>🥉 Bronze: Complete 1 wave</p>
            <p>🥇 Gold: Complete 3 waves</p>
            <p>💎 Diamond: Complete 5 waves</p>
            <p>🏆 Pro: Complete all 7 waves</p>
          </div>

          <Button size="lg" onClick={startWave} className="w-full">
            <Swords className="w-5 h-5 mr-2" />
            Start Ranked Match
          </Button>
        </Card>
      )}

      {/* Game Canvas */}
      {gameState === "playing" && (
        <>
          <canvas
            ref={canvasRef}
            width={960}
            height={640}
            className="border rounded-lg shadow-lg cursor-crosshair"
          />
          {touchscreenMode && (
            <TouchControls
              onMove={handleTouchMove}
              onAim={handleTouchAim}
              onShoot={handleTouchShoot}
              onReload={handleTouchReload}
              canvasWidth={960}
              canvasHeight={640}
            />
          )}
        </>
      )}

      {/* Wave Complete */}
      {gameState === "waveComplete" && (
        <Card className="p-8 text-center space-y-6 max-w-md">
          <div>
            <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold">Wave {currentWave} Complete!</h2>
            <p className="text-muted-foreground">Prepare for the next wave...</p>
          </div>
          <div className="text-sm">
            <p>Kills so far: {kills}</p>
            <p>Health restored: +25 HP</p>
          </div>
          <Button size="lg" onClick={nextWave} className="w-full">
            Start Wave {currentWave + 1}
          </Button>
        </Card>
      )}

      {/* Victory/Defeat */}
      {(gameState === "victory" || gameState === "defeat") && (
        <Card className="p-8 text-center space-y-6 max-w-md">
          <div>
            {gameState === "victory" ? (
              <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            ) : (
              <Swords className="w-16 h-16 mx-auto text-red-500 mb-4" />
            )}
            <h2 className="text-2xl font-bold">
              {gameState === "victory" ? "Victory!" : "Defeat"}
            </h2>
            {earnedRank && (
              <p className={`text-xl font-bold mt-2 ${getRankColor(earnedRank)}`}>
                Rank: {earnedRank.toUpperCase()} {earnedTier}
              </p>
            )}
          </div>
          <div className="text-sm space-y-1">
            <p>Waves Completed: {gameState === "victory" ? 7 : currentWave - 1}</p>
            <p>Total Kills: {kills}</p>
            <p>Score Earned: {score}</p>
          </div>
          <Button size="lg" onClick={onBack} className="w-full">
            Return to Menu
          </Button>
        </Card>
      )}

      {/* Admin Chat */}
      <AdminChat
        open={chatOpen}
        onOpenChange={setChatOpen}
        onCommand={handleCommand}
      />
    </div>
  );
};
