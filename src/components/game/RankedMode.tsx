import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, MessageSquare, Shield, Trophy, Medal, Swords } from "lucide-react";
import { AdminChat } from "./AdminChat";
import { TouchControls } from "./TouchControls";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RankedModeProps {
  username: string;
  onBack: () => void;
  touchscreenMode?: boolean;
  playerSkin?: string;
  adminAbuseEvents?: { event_type: string; expires_at: string }[];
}

interface AdminState {
  active: boolean;
  godMode: boolean;
  speedMultiplier: number;
  infiniteAmmo: boolean;
}

type Weapon = "pistol" | "shotgun" | "minigun" | "sniper" | "sword" | "knife" | "axe" | "rifle" | "smg" | "rpg" | "flamethrower" | "railgun" | "crossbow" | "laser_pistol" | "grenade_launcher" | "katana" | "dual_pistols" | "plasma_rifle" | "boomerang" | "whip" | "freeze_ray" | "harpoon_gun";

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
  unlockScore: number;
}

const WEAPONS: Record<Weapon, WeaponConfig> = {
  pistol: { name: "Pistol", fireRate: 0.18, damage: 40, ammo: 10, maxAmmo: 10, spread: 10, bulletSpeed: 420, color: "#FFB84D", isMelee: false, unlockScore: 0 },
  shotgun: { name: "Shotgun", fireRate: 0.5, damage: 25, ammo: 6, maxAmmo: 6, spread: 40, bulletSpeed: 380, color: "#FF6B6B", isMelee: false, unlockScore: 100 },
  sword: { name: "Sword", fireRate: 0.4, damage: 80, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 0, color: "#C0C0C0", isMelee: true, unlockScore: 200 },
  rifle: { name: "Rifle", fireRate: 0.12, damage: 35, ammo: 30, maxAmmo: 30, spread: 5, bulletSpeed: 600, color: "#8B7355", isMelee: false, unlockScore: 250 },
  sniper: { name: "Sniper", fireRate: 1.0, damage: 120, ammo: 5, maxAmmo: 5, spread: 0, bulletSpeed: 800, color: "#A6FFB3", isMelee: false, unlockScore: 300 },
  smg: { name: "SMG", fireRate: 0.08, damage: 25, ammo: 40, maxAmmo: 40, spread: 15, bulletSpeed: 480, color: "#FFD700", isMelee: false, unlockScore: 350 },
  knife: { name: "Knife", fireRate: 0.2, damage: 50, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 0, color: "#888888", isMelee: true, unlockScore: 400 },
  rpg: { name: "RPG", fireRate: 2.5, damage: 200, ammo: 3, maxAmmo: 3, spread: 0, bulletSpeed: 300, color: "#FF00FF", isMelee: false, unlockScore: 450 },
  axe: { name: "Axe", fireRate: 0.6, damage: 100, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 0, color: "#8B4513", isMelee: true, unlockScore: 500 },
  flamethrower: { name: "Flamethrower", fireRate: 0.03, damage: 15, ammo: 200, maxAmmo: 200, spread: 25, bulletSpeed: 200, color: "#FF4500", isMelee: false, unlockScore: 550 },
  minigun: { name: "Minigun", fireRate: 0.05, damage: 20, ammo: 100, maxAmmo: 100, spread: 20, bulletSpeed: 500, color: "#6BAFFF", isMelee: false, unlockScore: 600 },
  railgun: { name: "Railgun", fireRate: 1.8, damage: 250, ammo: 4, maxAmmo: 4, spread: 0, bulletSpeed: 1200, color: "#00FFFF", isMelee: false, unlockScore: 700 },
  crossbow: { name: "Crossbow", fireRate: 0.8, damage: 90, ammo: 8, maxAmmo: 8, spread: 2, bulletSpeed: 700, color: "#A0522D", isMelee: false, unlockScore: 750 },
  laser_pistol: { name: "Laser Pistol", fireRate: 0.15, damage: 45, ammo: 15, maxAmmo: 15, spread: 3, bulletSpeed: 900, color: "#FF1493", isMelee: false, unlockScore: 800 },
  grenade_launcher: { name: "Grenade Launcher", fireRate: 1.5, damage: 180, ammo: 4, maxAmmo: 4, spread: 8, bulletSpeed: 250, color: "#228B22", isMelee: false, unlockScore: 850 },
  katana: { name: "Katana", fireRate: 0.3, damage: 110, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 0, color: "#DC143C", isMelee: true, unlockScore: 900 },
  dual_pistols: { name: "Dual Pistols", fireRate: 0.1, damage: 30, ammo: 20, maxAmmo: 20, spread: 18, bulletSpeed: 420, color: "#DAA520", isMelee: false, unlockScore: 950 },
  plasma_rifle: { name: "Plasma Rifle", fireRate: 0.2, damage: 55, ammo: 25, maxAmmo: 25, spread: 6, bulletSpeed: 650, color: "#7B68EE", isMelee: false, unlockScore: 1000 },
  boomerang: { name: "Boomerang", fireRate: 0.7, damage: 70, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 350, color: "#FF8C00", isMelee: false, unlockScore: 1050 },
  whip: { name: "Whip", fireRate: 0.35, damage: 65, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 0, color: "#8B0000", isMelee: true, unlockScore: 1100 },
  freeze_ray: { name: "Freeze Ray", fireRate: 0.12, damage: 20, ammo: 30, maxAmmo: 30, spread: 12, bulletSpeed: 400, color: "#ADD8E6", isMelee: false, unlockScore: 1150 },
  harpoon_gun: { name: "Harpoon Gun", fireRate: 1.2, damage: 160, ammo: 3, maxAmmo: 3, spread: 0, bulletSpeed: 550, color: "#4682B4", isMelee: false, unlockScore: 1200 },
};

const WEAPON_ORDER: Weapon[] = ["pistol", "shotgun", "sword", "rifle", "sniper", "smg", "knife", "rpg", "axe", "flamethrower", "minigun", "railgun", "crossbow", "laser_pistol", "grenade_launcher", "katana", "dual_pistols", "plasma_rifle", "boomerang", "whip", "freeze_ray", "harpoon_gun"];

const WAVE_CONFIG = [
  { count: 8, types: ["normal"], spawnDelay: 1000, hpMultiplier: 1 },
  { count: 12, types: ["normal", "fast"], spawnDelay: 800, hpMultiplier: 1.2 },
  { count: 15, types: ["normal", "fast", "tank"], spawnDelay: 600, hpMultiplier: 1.4 },
  { count: 18, types: ["normal", "fast", "tank"], spawnDelay: 500, hpMultiplier: 1.6 },
  { count: 20, types: ["fast", "tank", "elite"], spawnDelay: 400, hpMultiplier: 1.8 },
  { count: 25, types: ["fast", "tank", "elite"], spawnDelay: 350, hpMultiplier: 2.0 },
  { count: 30, types: ["tank", "elite"], spawnDelay: 300, hpMultiplier: 2.5 },
  { count: 35, types: ["tank", "elite"], spawnDelay: 250, hpMultiplier: 3.0 },
  { count: 40, types: ["elite"], spawnDelay: 200, hpMultiplier: 3.5 },
  { count: 50, types: ["elite"], spawnDelay: 180, hpMultiplier: 4.0 },
];

const RANK_THRESHOLDS = [
  { rank: "unranked", minWaves: 0, tier: 1 },
  { rank: "rookie", minWaves: 1, tier: 1 },
  { rank: "rookie", minWaves: 1, tier: 2 },
  { rank: "rookie", minWaves: 1, tier: 3 },
  { rank: "iron", minWaves: 2, tier: 1 },
  { rank: "iron", minWaves: 2, tier: 2 },
  { rank: "iron", minWaves: 2, tier: 3 },
  { rank: "bronze", minWaves: 3, tier: 1 },
  { rank: "bronze", minWaves: 3, tier: 2 },
  { rank: "bronze", minWaves: 3, tier: 3 },
  { rank: "silver", minWaves: 4, tier: 1 },
  { rank: "silver", minWaves: 4, tier: 2 },
  { rank: "silver", minWaves: 4, tier: 3 },
  { rank: "gold", minWaves: 5, tier: 1 },
  { rank: "gold", minWaves: 5, tier: 2 },
  { rank: "gold", minWaves: 5, tier: 3 },
  { rank: "platinum", minWaves: 6, tier: 1 },
  { rank: "platinum", minWaves: 6, tier: 2 },
  { rank: "platinum", minWaves: 6, tier: 3 },
  { rank: "diamond", minWaves: 7, tier: 1 },
  { rank: "diamond", minWaves: 7, tier: 2 },
  { rank: "diamond", minWaves: 7, tier: 3 },
  { rank: "master", minWaves: 8, tier: 1 },
  { rank: "master", minWaves: 8, tier: 2 },
  { rank: "master", minWaves: 8, tier: 3 },
  { rank: "grandmaster", minWaves: 9, tier: 1 },
  { rank: "grandmaster", minWaves: 9, tier: 2 },
  { rank: "grandmaster", minWaves: 9, tier: 3 },
  { rank: "pro", minWaves: 10, tier: 1 },
  { rank: "pro", minWaves: 10, tier: 2 },
  { rank: "pro", minWaves: 10, tier: 3 },
  { rank: "legend", minWaves: 10, tier: 4 },
  { rank: "legend", minWaves: 10, tier: 5 },
  { rank: "mythic", minWaves: 10, tier: 5 },
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

export const RankedMode = ({ username, onBack, touchscreenMode = false, playerSkin = "#FFF3D6", adminAbuseEvents = [] }: RankedModeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [gameState, setGameState] = useState<"ready" | "playing" | "waveComplete" | "victory" | "defeat">("ready");
  const [currentWave, setCurrentWave] = useState(1);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [maxHealth] = useState(100);
  const [ammo, setAmmo] = useState(10);
  const [maxAmmo, setMaxAmmo] = useState(10);
  const [currentWeapon, setCurrentWeapon] = useState<Weapon>("pistol");
  const [unlockedWeapons, setUnlockedWeapons] = useState<Weapon[]>(["pistol"]);
  const [kills, setKills] = useState(0);
  const [earnedRank, setEarnedRank] = useState<string | null>(null);
  const [earnedTier, setEarnedTier] = useState<number | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [spawnImmunity, setSpawnImmunity] = useState(true);
  const [enemiesRemaining, setEnemiesRemaining] = useState(0);

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
  const spawnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const adminStateRef = useRef<AdminState>({ active: false, godMode: false, speedMultiplier: 1, infiniteAmmo: false });
  const specialPowerRef = useRef<string | null>(null);
  const teleportCooldownRef = useRef(0);
  const spawnImmunityRef = useRef(true);

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
      const equippedPower = localStorage.getItem("equippedPower");
      if (equippedPower) {
        specialPowerRef.current = equippedPower;
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

    if (roleData && roleData.length > 0) {
      setHasPermission(true);
      adminStateRef.current.active = true;
      return;
    }

    const { data: permData } = await supabase
      .from("chat_permissions")
      .select("can_use_commands")
      .eq("user_id", user.id)
      .single();

    if (permData?.can_use_commands) {
      setHasPermission(true);
      adminStateRef.current.active = true;
    }
  };

  const loadWeapons = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("total_score")
      .eq("user_id", user.id)
      .single();

    const { data: progress } = await supabase
      .from("player_progress")
      .select("unlocked_weapons")
      .eq("user_id", user.id)
      .single();

    const currentTotalScore = profile?.total_score || 0;
    
    const scoreUnlocked: Weapon[] = [];
    for (const weapon of WEAPON_ORDER) {
      if (WEAPONS[weapon].unlockScore <= currentTotalScore) {
        scoreUnlocked.push(weapon);
      }
    }
    
    const dbUnlocked = (progress?.unlocked_weapons as Weapon[]) || [];
    const allUnlocked = [...new Set([...scoreUnlocked, ...dbUnlocked])];
    const sortedUnlocked = WEAPON_ORDER.filter(w => allUnlocked.includes(w));
    setUnlockedWeapons(sortedUnlocked.length > 0 ? sortedUnlocked : ["pistol"]);
  };

  const getEnemyStats = (type: string, wave: number) => {
    const config = WAVE_CONFIG[wave - 1] || WAVE_CONFIG[0];
    const hpMult = config.hpMultiplier;
    switch (type) {
      case "fast":
        return { hp: Math.floor(40 * hpMult), speed: 120, color: "#00FF00", r: 14 };
      case "tank":
        return { hp: Math.floor(150 * hpMult), speed: 40, color: "#0000FF", r: 22 };
      case "elite":
        return { hp: Math.floor(100 * hpMult), speed: 80, color: "#FF00FF", r: 18 };
      default:
        return { hp: Math.floor(60 * hpMult), speed: 60, color: "#FF6B6B", r: 16 };
    }
  };

  const spawnEnemy = useCallback((wave: number) => {
    const waveConfig = WAVE_CONFIG[wave - 1];
    if (!waveConfig || spawnedCountRef.current >= waveConfig.count) return;

    // Use fixed canvas dimensions instead of checking canvas ref
    const W = 960;
    const H = 640;

    const types = waveConfig.types;
    const type = types[Math.floor(Math.random() * types.length)] as Enemy["type"];
    const stats = getEnemyStats(type, wave);

    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    switch (side) {
      case 0: x = Math.random() * W; y = -30; break;
      case 1: x = W + 30; y = Math.random() * H; break;
      case 2: x = Math.random() * W; y = H + 30; break;
      case 3: x = -30; y = Math.random() * H; break;
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
    setEnemiesRemaining(prev => prev + 1);
  }, []);

  const startWave = useCallback(() => {
    try {
      const waveConfig = WAVE_CONFIG[currentWave - 1];
      if (!waveConfig) return;

      // Set game state first - canvas will be rendered
      setGameState("playing");
      keysRef.current = {};
      enemiesRef.current = [];
      bulletsRef.current = [];
      enemyBulletsRef.current = [];
      pickupsRef.current = [];
      particlesRef.current = [];
      spawnedCountRef.current = 0;
      setEnemiesRemaining(0);

      // Initialize player with default canvas size (960x640)
      const startHp = specialPowerRef.current === "shield" ? 125 : 100;
      playerRef.current = {
        x: 480, // 960 / 2
        y: 320, // 640 / 2
        r: 14,
        speed: 180,
        angle: 0,
        weapon: currentWeapon,
        lastShot: -1,
        lastMelee: -1,
        hp: startHp,
        ammo: WEAPONS[currentWeapon].ammo,
        maxAmmo: WEAPONS[currentWeapon].maxAmmo,
      };

      setHealth(startHp);
      setAmmo(WEAPONS[currentWeapon].ammo);
      setMaxAmmo(WEAPONS[currentWeapon].maxAmmo);

      // Spawn immunity
      spawnImmunityRef.current = true;
      setSpawnImmunity(true);
      setTimeout(() => {
        spawnImmunityRef.current = false;
        setSpawnImmunity(false);
      }, 3000);

      // Clear existing spawn interval
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      
      // Spawn enemies over time
      spawnIntervalRef.current = setInterval(() => {
        if (spawnedCountRef.current < waveConfig.count) {
          spawnEnemy(currentWave);
        } else {
          if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
        }
      }, waveConfig.spawnDelay);
    } catch (error) {
      console.error("Error starting Ranked wave:", error);
    }
  }, [currentWave, spawnEnemy, currentWeapon]);

  const calculateRank = (wavesCompleted: number): { rank: string; tier: number } | null => {
    if (wavesCompleted === 0) return null;

    let bestRank = RANK_THRESHOLDS[0];
    for (const threshold of RANK_THRESHOLDS) {
      if (wavesCompleted >= threshold.minWaves) {
        bestRank = threshold;
      }
    }
    return { rank: bestRank.rank, tier: bestRank.tier };
  };

  const endMatch = async (victory: boolean) => {
    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

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

          const rankOrder = ["unranked", "rookie", "iron", "bronze", "silver", "gold", "platinum", "diamond", "master", "grandmaster", "pro", "legend", "mythic"];
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

  const nextWave = () => {
    if (currentWave < 7) {
      setCurrentWave(prev => prev + 1);
      setGameState("ready");
    } else {
      endMatch(true);
    }
  };

  const handleCommand = useCallback((cmd: string) => {
    if (!hasPermission && !adminStateRef.current.active) return;

    if (cmd.startsWith("/godmode")) {
      adminStateRef.current.godMode = !adminStateRef.current.godMode;
      toast.success(adminStateRef.current.godMode ? "Godmode ON" : "Godmode OFF");
    } else if (cmd.startsWith("/infiniteammo")) {
      adminStateRef.current.infiniteAmmo = !adminStateRef.current.infiniteAmmo;
      toast.success(adminStateRef.current.infiniteAmmo ? "Infinite ammo ON" : "Infinite ammo OFF");
    } else if (cmd.startsWith("/give")) {
      setUnlockedWeapons([...WEAPON_ORDER]);
      toast.success("All weapons unlocked!");
    } else if (cmd.startsWith("/heal")) {
      const match = cmd.match(/\/heal\s+(\d+)/);
      const amount = match ? parseInt(match[1]) : 100;
      if (playerRef.current) {
        playerRef.current.hp = Math.min(maxHealth, playerRef.current.hp + amount);
        setHealth(playerRef.current.hp);
        toast.success(`Healed ${amount} HP`);
      }
    } else if (cmd.startsWith("/nuke")) {
      enemiesRef.current.length = 0;
      setEnemiesRemaining(0);
      toast.success("All enemies nuked!");
    } else if (cmd.startsWith("/speed")) {
      const match = cmd.match(/\/speed\s+(\d+(?:\.\d+)?)/);
      if (match) {
        adminStateRef.current.speedMultiplier = parseFloat(match[1]);
        toast.success(`Speed set to ${match[1]}x`);
      }
    }
  }, [hasPermission, maxHealth]);

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
      const weaponConfig = WEAPONS[playerRef.current.weapon as Weapon];
      playerRef.current.ammo = weaponConfig.maxAmmo;
      setAmmo(weaponConfig.maxAmmo);
    }
  }, []);

  // Main game loop
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

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      
      const player = playerRef.current;
      if (!player) return;

      if (e.key.toLowerCase() === "r" && player.ammo < player.maxAmmo && !WEAPONS[player.weapon as Weapon].isMelee) {
        player.ammo = player.maxAmmo;
        setAmmo(player.ammo);
      }

      // Teleport power
      if (e.key.toLowerCase() === "shift" && specialPowerRef.current === "teleport") {
        const now = performance.now();
        if (now - teleportCooldownRef.current >= 3000) {
          teleportCooldownRef.current = now;
          const teleportDist = 150;
          const newX = player.x + Math.cos(player.angle) * teleportDist;
          const newY = player.y + Math.sin(player.angle) * teleportDist;
          player.x = Math.max(20, Math.min(W - 20, newX));
          player.y = Math.max(20, Math.min(H - 20, newY));
          spawnParticles(player.x, player.y, "#00FFFF", 20);
          toast.info("Teleported!");
        }
      }

      const keyNum = parseInt(e.key);
      if (keyNum >= 1 && keyNum <= unlockedWeapons.length) {
        const weapon = unlockedWeapons[keyNum - 1];
        if (weapon) {
          player.weapon = weapon;
          const weaponConfig = WEAPONS[weapon];
          player.ammo = weaponConfig.ammo;
          player.maxAmmo = weaponConfig.maxAmmo;
          setCurrentWeapon(weapon);
          setAmmo(player.ammo);
          setMaxAmmo(player.maxAmmo);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
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
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    const gameLoop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      time += dt;

      const player = playerRef.current;
      if (!player) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const enemies = enemiesRef.current;
      const bullets = bulletsRef.current;
      const enemyBullets = enemyBulletsRef.current;
      const pickups = pickupsRef.current;
      const particles = particlesRef.current;

      // Check game over
      if (player.hp <= 0 && !adminStateRef.current.godMode) {
        endMatch(false);
        return;
      }

      // Check wave complete
      const waveConfig = WAVE_CONFIG[currentWave - 1];
      if (spawnedCountRef.current >= waveConfig.count && enemies.length === 0) {
        setGameState("waveComplete");
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

      if (weapon.isMelee) {
        if (mouseRef.current.down && time - player.lastMelee >= weapon.fireRate) {
          player.lastMelee = time;
          const meleeRange = 50;
          spawnParticles(player.x + Math.cos(player.angle) * meleeRange, player.y + Math.sin(player.angle) * meleeRange, weapon.color, 10);
          
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            const edx = e.x - player.x;
            const edy = e.y - player.y;
            const dist = Math.hypot(edx, edy);
            const angleToEnemy = Math.atan2(edy, edx);
            const angleDiff = Math.abs(angleToEnemy - player.angle);
            
            if (dist <= meleeRange && angleDiff < 0.5) {
              const damageMultiplier = specialPowerRef.current === "double_damage" ? 2 : 1;
              e.hp -= weapon.damage * damageMultiplier;
              e.stun = 0.6;
              spawnParticles(e.x, e.y, weapon.color, 12);
              if (e.hp <= 0) {
                spawnParticles(e.x, e.y, "#FF6B6B", 20);
                setScore(prev => prev + 10);
                setKills(prev => prev + 1);
                setEnemiesRemaining(prev => prev - 1);
                if (Math.random() < 0.35) pickups.push({ x: e.x, y: e.y, r: 10, amt: 2, ttl: 18 });
                enemies.splice(i, 1);
              }
            }
          }
        }
      } else {
        if (mouseRef.current.down && time - player.lastShot >= weapon.fireRate && (hasInfiniteAmmo || player.ammo > 0)) {
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
            bullets.push({
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
          spawnParticles(player.x + Math.cos(player.angle) * player.r * 1.6, player.y + Math.sin(player.angle) * player.r * 1.6, weapon.color, 6);
        }
      }

      // Update bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
          bullets.splice(i, 1);
          continue;
        }

        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          const edx = b.x - e.x, edy = b.y - e.y;
          if (edx * edx + edy * edy <= (b.r + e.r) * (b.r + e.r)) {
            e.hp -= b.dmg;
            e.stun = 0.6;
            spawnParticles(b.x, b.y, "#FFF3D6", 8);
            if (e.hp <= 0) {
              spawnParticles(e.x, e.y, "#FF6B6B", 16);
              setScore(prev => prev + 10);
              setKills(prev => prev + 1);
              setEnemiesRemaining(prev => prev - 1);
              if (Math.random() < 0.35) pickups.push({ x: e.x, y: e.y, r: 10, amt: 2, ttl: 18 });
              enemies.splice(j, 1);
            }
            bullets.splice(i, 1);
            break;
          }
        }
      }

      // Update enemy bullets
      const isImmune = spawnImmunityRef.current;
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
          enemyBullets.splice(i, 1);
          continue;
        }

        const bx = b.x - player.x, by = b.y - player.y;
        if (bx * bx + by * by <= (b.r + player.r) * (b.r + player.r)) {
          if (!adminStateRef.current.godMode && !isImmune) {
            player.hp -= b.dmg;
            setHealth(Math.max(0, player.hp));
            spawnParticles(b.x, b.y, "#FF6B6B", 8);
          }
          enemyBullets.splice(i, 1);
        }
      }

      // Update enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.stun > 0) {
          e.stun = Math.max(0, e.stun - dt);
          continue;
        }
        const vx = player.x - e.x, vy = player.y - e.y;
        const d = Math.hypot(vx, vy);
        
        // Slow motion power
        let speedMult = 1;
        if (specialPowerRef.current === "slow_motion" && d < 200) {
          speedMult = 0.5;
        }
        
        if (d > 0) {
          e.x += (vx / d) * e.speed * speedMult * dt;
          e.y += (vy / d) * e.speed * speedMult * dt;
        }

        // Enemy collision damage
        if (d < player.r + e.r) {
          if (!adminStateRef.current.godMode && !isImmune) {
            player.hp -= 5 * dt;
            setHealth(Math.max(0, player.hp));
          }
        }

        // Enemy shooting
        if (d < 350 && time - e.lastShot >= 3.5) {
          e.lastShot = time;
          const ang = Math.atan2(player.y - e.y, player.x - e.x);
          // Invisibility power reduces accuracy
          const spreadMod = specialPowerRef.current === "invisibility" ? rand(-0.5, 0.5) : 0;
          enemyBullets.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(ang + spreadMod) * 200,
            vy: Math.sin(ang + spreadMod) * 200,
            r: 6,
            life: 3,
            dmg: 10,
            color: "#FF4444",
          });
        }
      }

      // Update pickups
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i];
        p.ttl -= dt;
        if (p.ttl <= 0) {
          pickups.splice(i, 1);
          continue;
        }
        if ((player.x - p.x) ** 2 + (player.y - p.y) ** 2 <= (player.r + p.r) ** 2) {
          if (!WEAPONS[player.weapon as Weapon].isMelee) {
            player.ammo = Math.min(player.maxAmmo, player.ammo + p.amt);
            setAmmo(player.ammo);
          }
          spawnParticles(p.x, p.y, "#A6FFB3", 10);
          pickups.splice(i, 1);
        }
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Draw
      ctx.clearRect(0, 0, W, H);

      // Background grid
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = "#1b3444";
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.restore();

      // Draw pickups
      for (const p of pickups) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = "#A6FFB3";
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#073";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("+" + p.amt, 0, 0);
        ctx.restore();
      }

      // Draw bullets
      for (const b of bullets) {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw enemy bullets
      for (const b of enemyBullets) {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw enemies
      for (const e of enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(0, 0, e.r, 0, Math.PI * 2);
        ctx.fill();
        const hpW = 28;
        ctx.fillStyle = "#333";
        ctx.fillRect(-hpW / 2, -e.r - 12, hpW, 6);
        ctx.fillStyle = e.color;
        ctx.fillRect(-hpW / 2, -e.r - 12, hpW * Math.max(0, e.hp / e.maxHp), 6);
        // Type indicator
        ctx.font = "8px sans-serif";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText(e.type[0].toUpperCase(), 0, 4);
        ctx.restore();
      }

      // Draw player shadow
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.ellipse(player.x, player.y + player.r * 0.8, player.r * 1.1, player.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw player
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);
      
      if (isImmune) {
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, player.r + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      ctx.fillStyle = playerSkin;
      ctx.beginPath();
      ctx.arc(0, 0, player.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b2b2b";
      ctx.beginPath();
      ctx.arc(player.r * 0.45, -4, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = weapon.color;
      if (weapon.isMelee) {
        ctx.fillRect(player.r - 2, -3, 25, 6);
      } else {
        ctx.fillRect(player.r - 2, -6, 18, 12);
      }
      ctx.restore();

      // Draw particles
      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / 0.9);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        ctx.restore();
      }

      // Draw crosshair
      ctx.save();
      ctx.strokeStyle = "#fff";
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(mouseRef.current.x - 8, mouseRef.current.y);
      ctx.lineTo(mouseRef.current.x + 8, mouseRef.current.y);
      ctx.moveTo(mouseRef.current.x, mouseRef.current.y - 8);
      ctx.lineTo(mouseRef.current.x, mouseRef.current.y + 8);
      ctx.stroke();
      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    };
  }, [gameState, unlockedWeapons, currentWave, playerSkin, touchscreenMode]);

  const getRankColor = (rank: string) => {
    switch (rank) {
      case "bronze": return "text-amber-600";
      case "gold": return "text-yellow-400";
      case "diamond": return "text-cyan-400";
      case "pro": return "text-purple-500";
      default: return "text-muted-foreground";
    }
  };

  // Ready screen
  if (gameState === "ready") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-6">
          <div className="flex items-center justify-center gap-2">
            <Swords className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Ranked Mode</h1>
          </div>
          <div className="space-y-2">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Wave {currentWave} of 7
            </Badge>
            <p className="text-muted-foreground">
              {currentWave === 1 ? "Survive 7 waves to earn Pro rank!" : "Get ready for the next wave..."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-secondary/50 p-3 rounded-lg">
              <p className="text-muted-foreground">Score</p>
              <p className="text-xl font-bold text-primary">{score}</p>
            </div>
            <div className="bg-secondary/50 p-3 rounded-lg">
              <p className="text-muted-foreground">Kills</p>
              <p className="text-xl font-bold">{kills}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit
            </Button>
            <Button variant="gaming" onClick={startWave} className="flex-1">
              {currentWave === 1 ? "Start Match" : "Next Wave"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Wave complete screen
  if (gameState === "waveComplete") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-6">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <h1 className="text-3xl font-bold">Wave {currentWave} Complete!</h1>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-secondary/50 p-3 rounded-lg">
              <p className="text-muted-foreground">Score</p>
              <p className="text-xl font-bold text-primary">{score}</p>
            </div>
            <div className="bg-secondary/50 p-3 rounded-lg">
              <p className="text-muted-foreground">Kills</p>
              <p className="text-xl font-bold">{kills}</p>
            </div>
          </div>
          <Button variant="gaming" onClick={nextWave} className="w-full">
            {currentWave < 7 ? `Continue to Wave ${currentWave + 1}` : "Claim Victory!"}
          </Button>
        </Card>
      </div>
    );
  }

  // Victory/Defeat screen
  if (gameState === "victory" || gameState === "defeat") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-6">
          <div className="flex items-center justify-center gap-2">
            {gameState === "victory" ? (
              <Trophy className="w-10 h-10 text-yellow-400" />
            ) : (
              <Shield className="w-10 h-10 text-red-500" />
            )}
            <h1 className="text-3xl font-bold">
              {gameState === "victory" ? "Victory!" : "Defeat"}
            </h1>
          </div>
          {earnedRank && (
            <div className="space-y-2">
              <p className="text-muted-foreground">Rank Earned</p>
              <div className={`text-4xl font-bold ${getRankColor(earnedRank)}`}>
                {earnedRank.toUpperCase()} {earnedTier}
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-secondary/50 p-3 rounded-lg">
              <p className="text-muted-foreground">Waves</p>
              <p className="text-xl font-bold">{gameState === "victory" ? 7 : currentWave - 1}</p>
            </div>
            <div className="bg-secondary/50 p-3 rounded-lg">
              <p className="text-muted-foreground">Score</p>
              <p className="text-xl font-bold text-primary">{score}</p>
            </div>
            <div className="bg-secondary/50 p-3 rounded-lg">
              <p className="text-muted-foreground">Kills</p>
              <p className="text-xl font-bold">{kills}</p>
            </div>
          </div>
          <Button variant="outline" onClick={onBack} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Menu
          </Button>
        </Card>
      </div>
    );
  }

  // Game screen
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen">
      {/* HUD - Left */}
      <div className="fixed left-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-2">
        <div className="font-bold text-lg flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          Ranked
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div><span className="text-primary font-mono">WASD</span> move</div>
          <div><span className="text-primary font-mono">Mouse</span> aim</div>
          <div><span className="text-primary font-mono">LMB</span> shoot</div>
          {!WEAPONS[currentWeapon].isMelee && <div><span className="text-primary font-mono">R</span> reload</div>}
        </div>
      </div>

      {/* HUD - Right */}
      <div className="fixed right-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-3 min-w-[180px]">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Wave {currentWave}/7</Badge>
          <span className="text-sm text-muted-foreground">{enemiesRemaining} left</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Health</span>
          <span className="font-bold text-lg">{Math.round(health)}</span>
        </div>
        <Progress value={(health / maxHealth) * 100} className="h-3" />

        {spawnImmunity && (
          <div className="flex items-center gap-2 text-yellow-500 text-sm">
            <Shield className="w-4 h-4" />
            <span>Spawn Protection</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Weapon</span>
          <span className="font-bold" style={{ color: WEAPONS[currentWeapon].color }}>
            {WEAPONS[currentWeapon].name}
          </span>
        </div>
        
        {!WEAPONS[currentWeapon].isMelee && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Ammo</span>
              <span className="font-bold text-lg">{ammo}/{maxAmmo}</span>
            </div>
            <Progress value={(ammo / maxAmmo) * 100} className="h-2" />
          </>
        )}

        <div className="pt-2 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Score</span>
            <span className="font-bold text-lg text-primary">{score}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Kills: {kills}
          </div>
        </div>
      </div>

      {/* Weapon Hotbar - Organized layout */}
      <div className="fixed bottom-4 left-4 right-4 flex justify-center">
        <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 flex gap-1 flex-wrap justify-center max-w-[600px]">
          {unlockedWeapons.slice(0, 8).map((weapon, index) => (
            <div
              key={weapon}
              className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${
                currentWeapon === weapon
                  ? "bg-primary text-primary-foreground ring-2 ring-primary"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
              onClick={() => {
                if (playerRef.current) {
                  playerRef.current.weapon = weapon;
                  const weaponConfig = WEAPONS[weapon];
                  playerRef.current.ammo = weaponConfig.ammo;
                  playerRef.current.maxAmmo = weaponConfig.maxAmmo;
                  setCurrentWeapon(weapon);
                  setAmmo(weaponConfig.ammo);
                  setMaxAmmo(weaponConfig.maxAmmo);
                }
              }}
            >
              <span className="text-[10px] opacity-70">{index + 1}</span>
              <span className="text-[10px] font-medium text-center leading-tight">{WEAPONS[weapon].name.slice(0, 4)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons above hotbar */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 flex gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Exit
        </Button>
        <Button variant="outline" size="sm" onClick={() => setChatOpen(!chatOpen)}>
          <MessageSquare className="w-4 h-4 mr-1" />
          Console
        </Button>
      </div>

      <canvas 
        ref={canvasRef} 
        width={960} 
        height={640} 
        className="border-2 border-border rounded-lg shadow-2xl"
      />

      <AdminChat
        open={chatOpen}
        onOpenChange={setChatOpen}
        onCommand={handleCommand}
        onShowOnlinePlayers={() => {}}
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
    </div>
  );
};
