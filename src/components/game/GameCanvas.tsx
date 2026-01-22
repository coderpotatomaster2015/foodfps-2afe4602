import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Shield } from "lucide-react";
import { AdminChat } from "./AdminChat";
import { OnlinePlayersModal } from "./OnlinePlayersModal";
import { BanModal } from "./BanModal";
import { Scoreboard } from "./Scoreboard";
import { TouchControls } from "./TouchControls";
import type { GameMode } from "@/pages/Index";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMultiplayer } from "@/hooks/useMultiplayer";

interface GameCanvasProps {
  mode: Exclude<GameMode, null | "boss">;
  username: string;
  roomCode: string;
  onBack: () => void;
  adminAbuseEvents?: { event_type: string; expires_at: string }[];
  touchscreenMode?: boolean;
  playerSkin?: string;
}

interface AdminState {
  active: boolean;
  godMode: boolean;
  speedMultiplier: number;
  infiniteAmmo: boolean;
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
};

const WEAPON_ORDER: Weapon[] = ["pistol", "shotgun", "sword", "rifle", "sniper", "smg", "knife", "rpg", "axe", "flamethrower", "minigun", "railgun"];

export const GameCanvas = ({ mode, username, roomCode, onBack, adminAbuseEvents = [], touchscreenMode = false, playerSkin = "#FFF3D6" }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [onlinePlayersOpen, setOnlinePlayersOpen] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [ammo, setAmmo] = useState(10);
  const [maxAmmo, setMaxAmmo] = useState(10);
  const [currentWeapon, setCurrentWeapon] = useState<Weapon>("pistol");
  const [health, setHealth] = useState(100);
  const [maxHealth] = useState(100);
  const [unlockedWeapons, setUnlockedWeapons] = useState<Weapon[]>(["pistol"]);
  const [spawnImmunity, setSpawnImmunity] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [kills, setKills] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const touchMoveRef = useRef({ x: 0, y: 0 });
  const touchAimRef = useRef({ x: 480, y: 320 });
  const touchShootingRef = useRef(false);
  
  const adminStateRef = useRef<AdminState>({ active: false, godMode: false, speedMultiplier: 1, infiniteAmmo: false });
  const gameStateRef = useRef<any>({ enemies: [], pickups: [], W: 960, H: 640, mapBoundsMultiplier: 1 });
  const playerRef = useRef<any>(null);
  const spawnTimeRef = useRef(0);
  const spawnImmunityRef = useRef(true);
  const positionUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const specialPowerRef = useRef<string | null>(null);
  const teleportCooldownRef = useRef(0);
  
  const { players, updatePlayerPosition, broadcastBullet, otherPlayersBullets, isHost, sharedEnemies, broadcastEnemyUpdate, broadcastEnemyKilled, coopMode } = useMultiplayer(mode, roomCode, username);

  // Load special power from localStorage
  useEffect(() => {
    try {
      const customSkinData = localStorage.getItem("selectedCustomSkin");
      if (customSkinData) {
        const parsed = JSON.parse(customSkinData);
        specialPowerRef.current = parsed.specialPower || null;
        
        // Apply shield power - start with extra HP
        if (parsed.specialPower === "shield" && playerRef.current) {
          playerRef.current.hp = 125;
          playerRef.current.maxHp = 125;
          setHealth(125);
        }
      }
    } catch (e) {
      console.error("Error loading special power:", e);
    }
  }, []);

  // Check command permissions
  useEffect(() => {
    checkPermissions();
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      const weaponConfig = WEAPONS[playerRef.current.weapon as Weapon];
      playerRef.current.ammo = weaponConfig.maxAmmo;
      setAmmo(weaponConfig.maxAmmo);
    }
  }, []);

  // Apply admin abuse events
  useEffect(() => {
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
  }, [adminAbuseEvents]);

  const checkPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleData) {
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

  useEffect(() => {
    loadUserProgress();
  }, []);

  useEffect(() => {
    if ((mode === "host" || mode === "join") && playerRef.current) {
      positionUpdateIntervalRef.current = setInterval(() => {
        if (playerRef.current) {
          updatePlayerPosition(
            playerRef.current.x,
            playerRef.current.y,
            playerRef.current.hp,
            playerRef.current.weapon,
            playerRef.current.angle
          );
        }
      }, 50);

      return () => {
        if (positionUpdateIntervalRef.current) {
          clearInterval(positionUpdateIntervalRef.current);
        }
      };
    }
  }, [mode, updatePlayerPosition]);

  const loadUserProgress = async () => {
    try {
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

      // Fixed weapon progression - calculate based on total score
      const currentTotalScore = profile?.total_score || 0;
      setTotalScore(currentTotalScore);
      
      // Build unlocked weapons list based on score thresholds
      const scoreUnlocked: Weapon[] = [];
      for (const weapon of WEAPON_ORDER) {
        if (WEAPONS[weapon].unlockScore <= currentTotalScore) {
          scoreUnlocked.push(weapon);
        }
      }
      
      // Merge with database-stored unlocked weapons (for /give command)
      const dbUnlocked = (progress?.unlocked_weapons as Weapon[]) || [];
      const allUnlocked = [...new Set([...scoreUnlocked, ...dbUnlocked])];
      
      // Sort by weapon order to maintain correct hotbar
      const sortedUnlocked = WEAPON_ORDER.filter(w => allUnlocked.includes(w));
      setUnlockedWeapons(sortedUnlocked.length > 0 ? sortedUnlocked : ["pistol"]);
      
      console.log("Weapon progression loaded:", { totalScore: currentTotalScore, unlocked: sortedUnlocked });
    } catch (error) {
      console.error("Error loading user progress:", error);
      setUnlockedWeapons(["pistol"]);
    }
  };

  const saveProgress = async (newScore: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || newScore <= 0) return;

      // Fetch current score from database to avoid stale state issues
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("total_score")
        .eq("user_id", user.id)
        .single();

      const currentTotal = currentProfile?.total_score || 0;
      const newTotal = currentTotal + newScore;
      
      const { error } = await supabase
        .from("profiles")
        .update({ total_score: newTotal })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating score:", error);
        return;
      }

      setTotalScore(newTotal);
      console.log(`Score saved: ${currentTotal} + ${newScore} = ${newTotal}`);

      const newlyUnlocked: Weapon[] = [];
      for (const weapon of WEAPON_ORDER) {
        if (WEAPONS[weapon].unlockScore <= newTotal && !unlockedWeapons.includes(weapon)) {
          newlyUnlocked.push(weapon);
        }
      }

      if (newlyUnlocked.length > 0) {
        const updated = [...unlockedWeapons, ...newlyUnlocked];
        setUnlockedWeapons(updated);
        await supabase
          .from("player_progress")
          .update({ unlocked_weapons: updated })
          .eq("user_id", user.id);
        
        newlyUnlocked.forEach(w => {
          toast.success(`Weapon unlocked: ${WEAPONS[w].name}!`);
        });
      }
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const revivePlayer = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.hp = 100;
      setHealth(100);
      setGameOver(false);
      spawnTimeRef.current = performance.now();
      spawnImmunityRef.current = true;
      setSpawnImmunity(true);
      setTimeout(() => {
        spawnImmunityRef.current = false;
        setSpawnImmunity(false);
      }, 5000);
      toast.success("Player revived!");
    }
  }, []);

  const handleCommand = useCallback((cmd: string) => {
    if (!hasPermission && !adminStateRef.current.active) return;

    if (cmd.startsWith("/godmode")) {
      adminStateRef.current.godMode = !adminStateRef.current.godMode;
      if (adminStateRef.current.godMode && playerRef.current) {
        playerRef.current.hp = 100;
        playerRef.current.ammo = 999;
        playerRef.current.maxAmmo = 999;
        setHealth(100);
        setAmmo(999);
        setMaxAmmo(999);
      }
    } else if (cmd.startsWith("/speed")) {
      const match = cmd.match(/\/speed\s+(\d+(?:\.\d+)?)/);
      if (match) {
        adminStateRef.current.speedMultiplier = parseFloat(match[1]);
        toast.success(`Speed set to ${match[1]}x`);
      }
    } else if (cmd.startsWith("/nuke")) {
      gameStateRef.current.enemies.length = 0;
    } else if (cmd.startsWith("/rain ammo")) {
      for (let i = 0; i < 20; i++) {
        const rand = (min: number, max: number) => Math.random() * (max - min) + min;
        const { W, H } = gameStateRef.current;
        gameStateRef.current.pickups.push({ x: rand(80, W - 80), y: rand(80, H - 80), r: 10, amt: 10, ttl: 30 });
      }
    } else if (cmd.startsWith("/infiniteammo")) {
      adminStateRef.current.infiniteAmmo = !adminStateRef.current.infiniteAmmo;
    } else if (cmd.startsWith("/revive")) {
      revivePlayer();
    } else if (cmd.startsWith("/give")) {
      const allWeapons = [...WEAPON_ORDER];
      setUnlockedWeapons(allWeapons);
      toast.success("All weapons unlocked!");
    } else if (cmd.startsWith("/heal")) {
      const match = cmd.match(/\/heal\s+(\d+)/);
      const amount = match ? parseInt(match[1]) : 100;
      if (playerRef.current) {
        playerRef.current.hp = Math.min(100, playerRef.current.hp + amount);
        setHealth(playerRef.current.hp);
        toast.success(`Healed ${amount} HP`);
      }
    } else if (cmd.startsWith("/spawn")) {
      const match = cmd.match(/\/spawn\s+(\d+)/);
      const count = match ? Math.min(50, parseInt(match[1])) : 5;
      const { W, H, enemies } = gameStateRef.current;
      const rand = (min: number, max: number) => Math.random() * (max - min) + min;
      for (let i = 0; i < count; i++) {
        const side = Math.floor(rand(0, 4));
        let x, y;
        if (side === 0) { x = rand(50, W - 50); y = -30; }
        else if (side === 1) { x = rand(50, W - 50); y = H + 30; }
        else if (side === 2) { x = -30; y = rand(50, H - 50); }
        else { x = W + 30; y = rand(50, H - 50); }
        const enemyId = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        enemies.push({ id: enemyId, x, y, r: 16, speed: rand(40, 80), hp: 60, color: "#FF6B6B", stun: 0, lastHit: 0, lastShot: -1 });
      }
      toast.success(`Spawned ${count} enemies`);
    } else if (cmd.startsWith("/clear")) {
      gameStateRef.current.pickups.length = 0;
      toast.success("Cleared pickups");
    } else if (cmd.startsWith("/tp")) {
      const match = cmd.match(/\/tp\s+(\d+)\s+(\d+)/);
      if (match && playerRef.current) {
        playerRef.current.x = parseInt(match[1]);
        playerRef.current.y = parseInt(match[2]);
        toast.success(`Teleported to (${match[1]}, ${match[2]})`);
      }
    } else if (cmd.startsWith("/score")) {
      const match = cmd.match(/\/score\s+(\d+)/);
      if (match) {
        const amount = parseInt(match[1]);
        setScore(prev => prev + amount);
        if (playerRef.current) playerRef.current.score += amount;
        toast.success(`Added ${amount} score`);
      }
    } else if (cmd.startsWith("/join")) {
      setOnlinePlayersOpen(true);
    } else if (cmd.startsWith("/shield")) {
      // Add temporary invincibility for 10 seconds
      if (playerRef.current) {
        const originalGodMode = adminStateRef.current.godMode;
        adminStateRef.current.godMode = true;
        toast.success("Shield activated for 10 seconds!");
        setTimeout(() => {
          adminStateRef.current.godMode = originalGodMode;
          toast.info("Shield expired");
        }, 10000);
      }
    } else if (cmd.startsWith("/freeze")) {
      // Freeze all enemies for 5 seconds by setting their speed to 0
      gameStateRef.current.enemies.forEach((e: any) => {
        e.originalSpeed = e.speed;
        e.speed = 0;
      });
      toast.success("Enemies frozen for 5 seconds!");
      setTimeout(() => {
        gameStateRef.current.enemies.forEach((e: any) => {
          if (e.originalSpeed) e.speed = e.originalSpeed;
        });
        toast.info("Enemies unfrozen");
      }, 5000);
    } else if (cmd.startsWith("/size")) {
      if (playerRef.current) {
        const match = cmd.match(/\/size\s+(small|big)/i);
        if (match) {
          const size = match[1].toLowerCase();
          playerRef.current.r = size === "small" ? 8 : size === "big" ? 24 : 14;
          toast.success(`Size set to ${size}`);
        } else {
          toast.error("Usage: /size [small/big]");
        }
      }
    } else if (cmd.startsWith("/explode")) {
      // Create explosion effect
      if (playerRef.current) {
        const { x, y } = playerRef.current;
        // Kill nearby enemies
        gameStateRef.current.enemies = gameStateRef.current.enemies.filter((e: any) => {
          const dist = Math.hypot(e.x - x, e.y - y);
          if (dist < 150) {
            setScore(prev => prev + 10);
            return false;
          }
          return true;
        });
        toast.success("BOOM! Explosion created!");
      }
    } else if (cmd.startsWith("/coins")) {
      const match = cmd.match(/\/coins\s+(\d+)/);
      if (match) {
        const amount = parseInt(match[1]);
        addCurrency(amount, 0, 0);
        toast.success(`Added ${amount} coins!`);
      }
    } else if (cmd.startsWith("/gems")) {
      const match = cmd.match(/\/gems\s+(\d+)/);
      if (match) {
        const amount = parseInt(match[1]);
        addCurrency(0, amount, 0);
        toast.success(`Added ${amount} gems!`);
      }
    } else if (cmd.startsWith("/gold")) {
      const match = cmd.match(/\/gold\s+(\d+)/);
      if (match) {
        const amount = parseInt(match[1]);
        addCurrency(0, 0, amount);
        toast.success(`Added ${amount} gold!`);
      }
    }
  }, [hasPermission, revivePlayer]);

  // Helper to add currency
  const addCurrency = async (coins: number, gems: number, gold: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.rpc("add_player_currency", {
        _user_id: user.id,
        _coins: coins,
        _gems: gems,
        _gold: gold
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = canvas.width;
    let H = canvas.height;
    gameStateRef.current.W = W;
    gameStateRef.current.H = H;

    spawnTimeRef.current = performance.now();
    spawnImmunityRef.current = true;
    setSpawnImmunity(true);
    setTimeout(() => {
      spawnImmunityRef.current = false;
      setSpawnImmunity(false);
    }, 5000);

    let keys: Record<string, boolean> = {};
    let mouse = { x: W / 2, y: H / 2, down: false };

    const player = {
      x: W / 2,
      y: H / 2,
      r: 14,
      speed: 180,
      angle: 0,
      weapon: "pistol" as Weapon,
      lastShot: -1,
      lastMelee: -1,
      hp: 100,
      maxHp: 100,
      score: 0,
      ammo: 10,
      maxAmmo: 10,
    };

    playerRef.current = player;

    let bullets: any[] = [];
    let enemyBullets: any[] = [];
    let enemies: any[] = [];
    let pickups: any[] = [];
    let particles: any[] = [];
    let time = 0;
    let lastSpawn = 0;
    let enemySpawnInterval = 2.0;

    gameStateRef.current.enemies = enemies;
    gameStateRef.current.pickups = pickups;

    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    const expandMap = () => {
      gameStateRef.current.mapBoundsMultiplier += 0.1;
    };

    const spawnEnemy = () => {
      const mult = gameStateRef.current.mapBoundsMultiplier;
      const side = Math.floor(rand(0, 4));
      let x, y;
      if (side === 0) { x = rand(-40 * mult, W * mult + 40); y = -30 * mult; }
      else if (side === 1) { x = rand(-40 * mult, W * mult + 40); y = H * mult + 30; }
      else if (side === 2) { x = -30 * mult; y = rand(-40 * mult, H * mult + 40); }
      else { x = W * mult + 30; y = rand(-40 * mult, H * mult + 40); }
      const enemyId = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      enemies.push({ id: enemyId, x, y, r: 16, speed: rand(40, 80), hp: 60, color: "#FF6B6B", stun: 0, lastHit: 0, lastShot: -1 });
    };

    const spawnPickup = () => {
      pickups.push({ x: rand(80, W - 80), y: rand(80, H - 80), r: 10, amt: 3, ttl: 20 });
    };

    const spawnParticles = (x: number, y: number, color: string, count = 10) => {
      for (let i = 0; i < count; i++) {
        particles.push({ x, y, vx: rand(-120, 120), vy: rand(-120, 120), life: rand(0.3, 0.9), color });
      }
    };

    const tryShoot = (t: number) => {
      const weapon = WEAPONS[player.weapon];
      const isMultiplayerCoopMelee = (mode === "host" || mode === "join") && coopMode;
      
      if (weapon.isMelee) {
        if (mouse.down && t - player.lastMelee >= weapon.fireRate) {
          player.lastMelee = t;
          const meleeRange = 50;
          spawnParticles(player.x + Math.cos(player.angle) * meleeRange, player.y + Math.sin(player.angle) * meleeRange, weapon.color, 10);
          
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            const dx = e.x - player.x;
            const dy = e.y - player.y;
            const dist = Math.hypot(dx, dy);
            const angleToEnemy = Math.atan2(dy, dx);
            const angleDiff = Math.abs(angleToEnemy - player.angle);
            
            if (dist <= meleeRange && angleDiff < 0.5) {
              // Apply double damage power
              const damageMultiplier = specialPowerRef.current === "double_damage" ? 2 : 1;
              e.hp -= weapon.damage * damageMultiplier;
              e.stun = 0.6;
              spawnParticles(e.x, e.y, weapon.color, 12);
              if (e.hp <= 0) {
                spawnParticles(e.x, e.y, "#FF6B6B", 20);
                setScore(prev => {
                  const newScore = prev + 10;
                  player.score = newScore;
                  return newScore;
                });
                setKills(prev => prev + 1);
                if (Math.random() < 0.35) pickups.push({ x: e.x, y: e.y, r: 10, amt: 2, ttl: 18 });
                // Broadcast enemy kill in coop mode
                if (isMultiplayerCoopMelee && e.id) {
                  broadcastEnemyKilled(e.id, username);
                }
                enemies.splice(i, 1);
              }
            }
          }
        }
        return;
      }

      const fireRate = adminStateRef.current.godMode ? 0 : weapon.fireRate;
      const hasInfiniteAmmo = adminStateRef.current.godMode || adminStateRef.current.infiniteAmmo;
      if (mouse.down && t - player.lastShot >= fireRate && (hasInfiniteAmmo || player.ammo > 0)) {
        player.lastShot = t;
        if (!hasInfiniteAmmo) {
          player.ammo--;
          setAmmo(player.ammo);
        }

        const bulletsToFire = player.weapon === "shotgun" ? 5 : 1;
        for (let i = 0; i < bulletsToFire; i++) {
          const ang = player.angle;
          const spread = weapon.spread * (Math.PI / 180);
          const finalAngle = ang + rand(-spread, spread);
          const speed = weapon.bulletSpeed;
          // Apply double damage power to bullets
          const damageMultiplier = specialPowerRef.current === "double_damage" ? 2 : 1;
          const newBullet = {
            x: player.x + Math.cos(ang) * player.r * 1.6,
            y: player.y + Math.sin(ang) * player.r * 1.6,
            vx: Math.cos(finalAngle) * speed,
            vy: Math.sin(finalAngle) * speed,
            r: player.weapon === "sniper" ? 6 : 8,
            life: 2.5,
            dmg: weapon.damage * damageMultiplier,
            color: weapon.color,
            createdAt: t,
          };
          bullets.push(newBullet);
          
          if (mode === "host" || mode === "join") {
            broadcastBullet({
              x: newBullet.x,
              y: newBullet.y,
              vx: newBullet.vx,
              vy: newBullet.vy,
              r: newBullet.r,
              life: newBullet.life,
              dmg: newBullet.dmg,
              color: newBullet.color,
            });
          }
        }
        spawnParticles(player.x + Math.cos(player.angle) * player.r * 1.6, player.y + Math.sin(player.angle) * player.r * 1.6, weapon.color, 6);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === "r" && player.ammo < player.maxAmmo && !WEAPONS[player.weapon].isMelee) {
        player.ammo = player.maxAmmo;
        setAmmo(player.ammo);
      }
      
      // Handle teleport power with SHIFT key
      if (e.key.toLowerCase() === "shift" && specialPowerRef.current === "teleport") {
        const now = performance.now();
        if (now - teleportCooldownRef.current >= 3000) { // 3 second cooldown
          teleportCooldownRef.current = now;
          const teleportDist = 150;
          const newX = player.x + Math.cos(player.angle) * teleportDist;
          const newY = player.y + Math.sin(player.angle) * teleportDist;
          const mult = gameStateRef.current.mapBoundsMultiplier;
          player.x = Math.max(20, Math.min(W * mult - 20, newX));
          player.y = Math.max(20, Math.min(H * mult - 20, newY));
          spawnParticles(player.x, player.y, "#00FFFF", 20);
          toast.info("Teleported!");
        } else {
          const remaining = Math.ceil((3000 - (now - teleportCooldownRef.current)) / 1000);
          toast.error(`Teleport on cooldown: ${remaining}s`);
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
      keys[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
      mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) mouse.down = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) mouse.down = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      time += dt;

      // Check if game over
      if (player.hp <= 0 && !adminStateRef.current.godMode) {
        if (!gameOver) {
          setGameOver(true);
          setDeaths(prev => prev + 1);
          saveProgress(score);
        }
        
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.font = "48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 20);
        ctx.font = "24px sans-serif";
        ctx.fillText("Score: " + score, W / 2, H / 2 + 30);
        ctx.fillText("Kills: " + kills + " | Deaths: " + deaths, W / 2, H / 2 + 65);
        ctx.font = "16px sans-serif";
        ctx.fillStyle = "#aaa";
        ctx.fillText("Use /revive command or press Back to Menu", W / 2, H / 2 + 100);
        ctx.restore();
        
        gameLoopRef.current = requestAnimationFrame(loop);
        return;
      }

      // Handle touch controls for movement and aiming
      let dx = 0, dy = 0;
      
      if (touchscreenMode) {
        dx = touchMoveRef.current.x;
        dy = touchMoveRef.current.y;
        mouse.x = touchAimRef.current.x;
        mouse.y = touchAimRef.current.y;
        mouse.down = touchShootingRef.current;
      } else {
        if (keys["w"] || keys["arrowup"]) dy -= 1;
        if (keys["s"] || keys["arrowdown"]) dy += 1;
        if (keys["a"] || keys["arrowleft"]) dx -= 1;
        if (keys["d"] || keys["arrowright"]) dx += 1;
      }
      
      player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
        let speedMultiplier = adminStateRef.current.speedMultiplier;
        
        // Apply speed boost power (+30%)
        if (specialPowerRef.current === "speed") {
          speedMultiplier *= 1.3;
        }
        
        const newX = player.x + dx * player.speed * speedMultiplier * dt;
        const newY = player.y + dy * player.speed * speedMultiplier * dt;
        
        const mult = gameStateRef.current.mapBoundsMultiplier;
        if (newX < 20 || newX > W * mult - 20 || newY < 20 || newY > H * mult - 20) {
          expandMap();
        }
        
        player.x = Math.max(20, Math.min(W * mult - 20, newX));
        player.y = Math.max(20, Math.min(H * mult - 20, newY));
      }

      tryShoot(time);

      // Update bullets
      const isMultiplayerCoopBullets = (mode === "host" || mode === "join") && coopMode;
      
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
          const dx = b.x - e.x, dy = b.y - e.y;
          if (dx * dx + dy * dy <= (b.r + e.r) * (b.r + e.r)) {
            e.hp -= b.dmg;
            e.stun = 0.6;
            spawnParticles(b.x, b.y, "#FFF3D6", 8);
            if (e.hp <= 0) {
              spawnParticles(e.x, e.y, "#FF6B6B", 16);
              setScore(prev => {
                const newScore = prev + 10;
                player.score = newScore;
                return newScore;
              });
              setKills(prev => prev + 1);
              if (Math.random() < 0.35) pickups.push({ x: e.x, y: e.y, r: 10, amt: 2, ttl: 18 });
              // Broadcast enemy kill in coop mode
              if (isMultiplayerCoopBullets && e.id) {
                broadcastEnemyKilled(e.id, username);
              }
              enemies.splice(j, 1);
            }
            bullets.splice(i, 1);
            break;
          }
        }
      }

      // Process other players' bullets hitting enemies in coop mode
      if (isMultiplayerCoopBullets) {
        const now = Date.now();
        otherPlayersBullets.forEach((playerBullets, playerId) => {
          playerBullets.forEach(b => {
            const age = (now - b.timestamp) / 1000;
            if (age < b.life) {
              const bx = b.x + b.vx * age;
              const by = b.y + b.vy * age;
              
              for (let j = enemies.length - 1; j >= 0; j--) {
                const e = enemies[j];
                const dx = bx - e.x, dy = by - e.y;
                if (dx * dx + dy * dy <= (b.r + e.r) * (b.r + e.r)) {
                  // Only process if we're host (to avoid double damage)
                  if (isHost) {
                    e.hp -= b.dmg;
                    e.stun = 0.6;
                    spawnParticles(bx, by, "#FFF3D6", 8);
                    if (e.hp <= 0) {
                      spawnParticles(e.x, e.y, "#FF6B6B", 16);
                      if (Math.random() < 0.35) pickups.push({ x: e.x, y: e.y, r: 10, amt: 2, ttl: 18 });
                      if (e.id) {
                        broadcastEnemyKilled(e.id, playerId);
                      }
                      enemies.splice(j, 1);
                    }
                  }
                  break;
                }
              }
            }
          });
        });
      }

      // Update enemy bullets - use ref for spawn immunity check
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
        if (d > 0) {
          e.x += (vx / d) * e.speed * dt;
          e.y += (vy / d) * e.speed * dt;
        }

        // Enemy collision damage
        if (d < player.r + e.r) {
          if (!adminStateRef.current.godMode && !isImmune) {
            player.hp -= 5 * dt;
            setHealth(Math.max(0, player.hp));
          }
        }

        if (d < 350 && time - e.lastShot >= 3.5) {
          e.lastShot = time;
          const ang = Math.atan2(player.y - e.y, player.x - e.x);
          enemyBullets.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(ang) * 200,
            vy: Math.sin(ang) * 200,
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
          if (!WEAPONS[player.weapon].isMelee) {
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

      // Spawn enemies (only host spawns in coop multiplayer)
      const isMultiplayerCoop = (mode === "host" || mode === "join") && coopMode;
      const shouldSpawn = !isMultiplayerCoop || (isMultiplayerCoop && isHost);
      
      if (shouldSpawn && time - lastSpawn > enemySpawnInterval) {
        lastSpawn = time;
        spawnEnemy();
        if (enemySpawnInterval > 0.6) enemySpawnInterval *= 0.993;
      }

      // In coop mode, host broadcasts enemy state, non-hosts sync from shared state
      if (isMultiplayerCoop) {
        if (isHost) {
          // Host broadcasts enemy positions every 100ms
          if (time % 0.1 < dt) {
            const enemyData = enemies.map(e => ({ id: e.id, x: e.x, y: e.y, hp: e.hp, speed: e.speed }));
            broadcastEnemyUpdate(enemyData);
          }
        } else if (sharedEnemies.length > 0) {
          // Non-host syncs enemy positions from host
          for (const shared of sharedEnemies) {
            const existing = enemies.find(e => e.id === shared.id);
            if (existing) {
              existing.x = shared.x;
              existing.y = shared.y;
              existing.hp = shared.hp;
            } else {
              enemies.push({ id: shared.id, x: shared.x, y: shared.y, r: 16, speed: shared.speed, hp: shared.hp, color: "#FF6B6B", stun: 0, lastHit: 0, lastShot: -1 });
            }
          }
          // Remove enemies that don't exist in shared state
          for (let i = enemies.length - 1; i >= 0; i--) {
            if (!sharedEnemies.find(s => s.id === enemies[i].id)) {
              enemies.splice(i, 1);
            }
          }
        }
      }

      gameStateRef.current.enemies = enemies;
      gameStateRef.current.pickups = pickups;

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
        ctx.fillStyle = "#FF6B6B";
        ctx.fillRect(-hpW / 2, -e.r - 12, hpW * Math.max(0, e.hp / 60), 6);
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
      
      // Spawn immunity glow
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
      ctx.fillStyle = WEAPONS[player.weapon].color;
      if (WEAPONS[player.weapon].isMelee) {
        ctx.fillRect(player.r - 2, -3, 25, 6);
      } else {
        ctx.fillRect(player.r - 2, -6, 18, 12);
      }
      ctx.restore();

      // Draw other players (multiplayer) - Enhanced visibility
      if (mode === "host" || mode === "join") {
        for (const otherPlayer of players) {
          if (otherPlayer.username === username) continue;
          
          const opx = otherPlayer.position_x || 480;
          const opy = otherPlayer.position_y || 320;
          const opAngle = (otherPlayer as any).angle || 0;
          const opWeapon = (otherPlayer.weapon || "pistol") as Weapon;
          const opHealth = otherPlayer.health ?? 100;
          
          ctx.save();
          ctx.translate(opx, opy);
          
          // Player shadow
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          ctx.beginPath();
          ctx.ellipse(0, player.r * 0.8, player.r * 1.1, player.r * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // Rotate for weapon direction
          ctx.rotate(opAngle);
          
          // Player body - distinct color for other players
          ctx.fillStyle = "#A6FFB3";
          ctx.beginPath();
          ctx.arc(0, 0, player.r, 0, Math.PI * 2);
          ctx.fill();
          
          // Player eye
          ctx.fillStyle = "#2b2b2b";
          ctx.beginPath();
          ctx.arc(player.r * 0.45, -4, 3.5, 0, Math.PI * 2);
          ctx.fill();
          
          // Player weapon
          const weaponConfig = WEAPONS[opWeapon];
          ctx.fillStyle = weaponConfig?.color || "#FFB84D";
          if (weaponConfig?.isMelee) {
            ctx.fillRect(player.r - 2, -3, 25, 6);
          } else {
            ctx.fillRect(player.r - 2, -6, 18, 12);
          }
          
          ctx.restore();
          
          // Draw UI elements without rotation
          ctx.save();
          ctx.translate(opx, opy);
          
          // Username label with background
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          const nameWidth = ctx.measureText(otherPlayer.username).width + 10;
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.roundRect(-nameWidth / 2, -player.r - 26, nameWidth, 14, 3);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.fillText(otherPlayer.username, 0, -player.r - 16);
          
          // Health bar with border
          const hpW = 36;
          ctx.fillStyle = "#222";
          ctx.fillRect(-hpW / 2 - 1, -player.r - 9, hpW + 2, 6);
          ctx.fillStyle = "#333";
          ctx.fillRect(-hpW / 2, -player.r - 8, hpW, 4);
          const healthColor = opHealth > 60 ? "#22c55e" : opHealth > 30 ? "#eab308" : "#ef4444";
          ctx.fillStyle = healthColor;
          ctx.fillRect(-hpW / 2, -player.r - 8, hpW * Math.max(0, opHealth / 100), 4);
          
          ctx.restore();
        }

        // Draw other players' bullets
        const now = Date.now();
        otherPlayersBullets.forEach((playerBullets) => {
          playerBullets.forEach(b => {
            const age = (now - b.timestamp) / 1000;
            if (age < b.life) {
              const x = b.x + b.vx * age;
              const y = b.y + b.vy * age;
              ctx.save();
              ctx.fillStyle = b.color;
              ctx.globalAlpha = Math.max(0.3, 1 - age / b.life);
              ctx.beginPath();
              ctx.arc(x, y, b.r, 0, Math.PI * 2);
              ctx.fill();
              // Bullet glow
              ctx.globalAlpha = 0.3;
              ctx.beginPath();
              ctx.arc(x, y, b.r * 1.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          });
        });
      }

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
      ctx.moveTo(mouse.x - 8, mouse.y);
      ctx.lineTo(mouse.x + 8, mouse.y);
      ctx.moveTo(mouse.x, mouse.y - 8);
      ctx.lineTo(mouse.x, mouse.y + 8);
      ctx.stroke();
      ctx.restore();

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    // Only spawn initial enemies if not joining coop (host or solo spawn)
    const shouldSpawnInitial = mode === "solo" || mode === "host" || !coopMode;
    if (shouldSpawnInitial) {
      for (let i = 0; i < 3; i++) spawnEnemy();
    }
    for (let i = 0; i < 2; i++) spawnPickup();

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [unlockedWeapons, mode, broadcastBullet, players, username, otherPlayersBullets, isHost, sharedEnemies, broadcastEnemyUpdate, broadcastEnemyKilled, coopMode, playerSkin]);

  const handleBackWithScoreboard = () => {
    // Save progress when leaving the game
    if (score > 0) {
      saveProgress(score);
    }
    
    if (mode === "host" || mode === "join") {
      setShowScoreboard(true);
    } else {
      onBack();
    }
  };

  return (
    <div className="relative">
      <div className="fixed left-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-2">
        <div className="font-bold text-lg">Food FPS</div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div><span className="text-primary font-mono">WASD</span> move</div>
          <div><span className="text-primary font-mono">Mouse</span> aim</div>
          <div><span className="text-primary font-mono">LMB</span> shoot</div>
          {!WEAPONS[currentWeapon].isMelee && <div><span className="text-primary font-mono">R</span> reload</div>}
          <div><span className="text-primary font-mono">1-{unlockedWeapons.length}</span> weapons</div>
        </div>
      </div>

      <div className="fixed right-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-3 min-w-[180px]">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Health</span>
          <span className="font-bold text-lg">{Math.round(health)}</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-red-500 to-green-500 h-full transition-all duration-300"
            style={{ width: `${(health / maxHealth) * 100}%` }}
          />
        </div>

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
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${(ammo / maxAmmo) * 100}%` }}
              />
            </div>
          </>
        )}

        <div className="pt-2 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Score</span>
            <span className="font-bold text-lg text-primary">{score}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>K: {kills} | D: {deaths}</span>
            <span>Total: {totalScore}</span>
          </div>
        </div>
      </div>

      {/* Hotbar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 flex gap-2">
        {unlockedWeapons.map((weapon, index) => (
          <div
            key={weapon}
            className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${
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
            <span className="text-xs opacity-70">{index + 1}</span>
            <span className="text-xs font-medium text-center">{WEAPONS[weapon].name}</span>
          </div>
        ))}
        
        {WEAPON_ORDER.filter(w => !unlockedWeapons.includes(w)).slice(0, 3).map((weapon) => (
          <div
            key={weapon}
            className="w-16 h-16 rounded-lg flex flex-col items-center justify-center bg-secondary/40 opacity-50 relative"
          >
            <span className="text-xs font-medium text-center">{WEAPONS[weapon].name}</span>
            <span className="text-[10px] text-muted-foreground">{WEAPONS[weapon].unlockScore}</span>
          </div>
        ))}
      </div>

      <canvas 
        ref={canvasRef} 
        width={960} 
        height={640} 
        className="border-2 border-border rounded-lg shadow-2xl"
      />

      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={handleBackWithScoreboard}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Menu
        </Button>
        <Button variant="outline" onClick={() => setChatOpen(!chatOpen)}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Console
        </Button>
      </div>

      <AdminChat
        open={chatOpen}
        onOpenChange={setChatOpen}
        onCommand={handleCommand}
        onShowOnlinePlayers={() => setOnlinePlayersOpen(true)}
      />

      <OnlinePlayersModal
        open={onlinePlayersOpen}
        onOpenChange={setOnlinePlayersOpen}
        currentUsername={username}
      />

      <BanModal
        open={banModalOpen}
        onOpenChange={setBanModalOpen}
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

      {showScoreboard && (
        <Scoreboard
          players={[
            { username, kills, deaths, score },
            ...players
              .filter(p => p.username !== username)
              .map(p => ({ username: p.username, kills: 0, deaths: 0, score: p.score || 0 }))
          ]}
          currentPlayer={username}
          onBack={() => {
            setShowScoreboard(false);
            onBack();
          }}
        />
      )}
    </div>
  );
};
