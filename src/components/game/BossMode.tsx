import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Shield, Gem, Coins, Star } from "lucide-react";
import { AdminChat } from "./AdminChat";
import { TouchControls } from "./TouchControls";
import type { GameMode } from "@/pages/Index";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BossModeProps {
  username: string;
  onBack: () => void;
  playerSkin?: string;
  adminAbuseEvents?: { event_type: string; expires_at: string }[];
  touchscreenMode?: boolean;
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

type Difficulty = "easy" | "normal" | "hard";

const DIFFICULTY_CONFIG: Record<Difficulty, { hpMult: number; dmgMult: number; speedMult: number; shootMult: number; label: string; color: string }> = {
  easy: { hpMult: 0.6, dmgMult: 0.5, speedMult: 0.7, shootMult: 1.5, label: "Easy", color: "#4ADE80" },
  normal: { hpMult: 1.0, dmgMult: 1.0, speedMult: 1.0, shootMult: 1.0, label: "Normal", color: "#FACC15" },
  hard: { hpMult: 1.6, dmgMult: 1.5, speedMult: 1.3, shootMult: 0.7, label: "Hard", color: "#EF4444" },
};

export const BossMode = ({ username, onBack, playerSkin = "#FFF3D6", adminAbuseEvents = [], touchscreenMode = false }: BossModeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [checkpointLevel, setCheckpointLevel] = useState(1);
  
  const [bossLevel, setBossLevel] = useState(1);
  const [highestLevel, setHighestLevel] = useState(1);
  const [isLoadingLevel, setIsLoadingLevel] = useState(true);
  
  const [bossHealth, setBossHealth] = useState(500);
  const [bossMaxHealth, setBossMaxHealth] = useState(500);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [ammo, setAmmo] = useState(10);
  const [maxAmmo, setMaxAmmo] = useState(10);
  const [currentWeapon, setCurrentWeapon] = useState<Weapon>("pistol");
  const [unlockedWeapons, setUnlockedWeapons] = useState<Weapon[]>(["pistol"]);
  const [gameOver, setGameOver] = useState(false);
  const [bossDefeated, setBossDefeated] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [earnedRewards, setEarnedRewards] = useState({ gems: 0, coins: 0, gold: 0 });

  const adminStateRef = useRef({ active: false, godMode: false, speedMultiplier: 1, infiniteAmmo: false });
  
  // Touch controls refs
  const touchMoveRef = useRef({ dx: 0, dy: 0 });
  const touchAimRef = useRef({ x: 480, y: 320 });
  const touchShootingRef = useRef(false);
  const playerRef = useRef<any>(null);
  const gameLoopRef = useRef<number | null>(null);
  const bossLevelRef = useRef(1);
  const specialPowerRef = useRef<string | null>(null);
  const difficultyRef = useRef<Difficulty>("normal");
  const minionsRef = useRef<any[]>([]);
  const laserRef = useRef<{ active: boolean; angle: number; timer: number; warning: number }>({ active: false, angle: 0, timer: 0, warning: 0 });
  const shockwaveRef = useRef<{ active: boolean; radius: number; maxRadius: number; timer: number }>({ active: false, radius: 0, maxRadius: 0, timer: 0 });
  const teleportCooldownRef = useRef<number>(0);

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

  useEffect(() => {
    checkPermissions();
    loadWeapons();
    loadBossLevel();
  }, []);

  const loadBossLevel = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoadingLevel(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("boss_level")
        .eq("user_id", user.id)
        .single();

      const level = profile?.boss_level || 1;
      setBossLevel(level);
      setHighestLevel(level);
      bossLevelRef.current = level;
      setBossHealth(500 * level);
      setBossMaxHealth(500 * level);
    } catch (error) {
      console.error("Error loading boss level:", error);
    } finally {
      setIsLoadingLevel(false);
    }
  };

  const saveBossLevel = async (newLevel: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("profiles")
        .update({ boss_level: newLevel })
        .eq("user_id", user.id);
    } catch (error) {
      console.error("Error saving boss level:", error);
    }
  };

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
    }
  };

  const loadWeapons = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load from equipped_loadout table (NOT player_progress)
    const { data: loadout } = await supabase
      .from("equipped_loadout")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (loadout) {
      const equippedWeapons = [
        loadout.slot_1,
        loadout.slot_2,
        loadout.slot_3,
        loadout.slot_4,
        loadout.slot_5,
      ].filter(Boolean) as Weapon[];
      
      setUnlockedWeapons(equippedWeapons.length > 0 ? equippedWeapons : ["pistol"]);
      console.log("BossMode loaded equipped weapons:", equippedWeapons);
    } else {
      // Fallback to localStorage
      const savedWeapons = localStorage.getItem("equippedWeapons");
      if (savedWeapons) {
        try {
          const parsed = JSON.parse(savedWeapons) as Weapon[];
          setUnlockedWeapons(parsed.length > 0 ? parsed : ["pistol"]);
        } catch {
          setUnlockedWeapons(["pistol"]);
        }
      }
    }

    // Also load equipped power
    const equippedPower = localStorage.getItem("equippedPower");
    if (equippedPower) {
      specialPowerRef.current = equippedPower;
      if (equippedPower === "shield" && playerRef.current) {
        playerRef.current.hp = 125;
        playerRef.current.maxHp = 125;
        setHealth(125);
      }
    }
  };

  const awardCurrencies = async (gems: number, coins: number, gold: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: current } = await supabase
      .from("player_currencies")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (current) {
      await supabase
        .from("player_currencies")
        .update({
          gems: current.gems + gems,
          coins: current.coins + coins,
          gold: current.gold + gold,
        })
        .eq("user_id", user.id);
    }

    setEarnedRewards(prev => ({
      gems: prev.gems + gems,
      coins: prev.coins + coins,
      gold: prev.gold + gold,
    }));
  };

  const handleCommand = useCallback((cmd: string) => {
    if (!hasPermission && !adminStateRef.current.active) return;

    if (cmd.startsWith("/godmode")) {
      adminStateRef.current.godMode = !adminStateRef.current.godMode;
      if (adminStateRef.current.godMode && playerRef.current) {
        playerRef.current.hp = 100;
        setHealth(100);
      }
    } else if (cmd.startsWith("/infiniteammo")) {
      adminStateRef.current.infiniteAmmo = !adminStateRef.current.infiniteAmmo;
    } else if (cmd.startsWith("/give")) {
      setUnlockedWeapons([...WEAPON_ORDER]);
      toast.success("All weapons unlocked!");
    } else if (cmd.startsWith("/heal") || cmd.startsWith("/revive")) {
      if (playerRef.current) {
        playerRef.current.hp = 100;
        setHealth(100);
        setGameOver(false);
      }
    } else if (cmd.startsWith("/nuke")) {
      setBossHealth(0);
    }
  }, [hasPermission]);

  useEffect(() => {
    if (!difficulty) return;
    const diffConf = DIFFICULTY_CONFIG[difficulty];
    difficultyRef.current = difficulty;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    let keys: Record<string, boolean> = {};
    let mouse = { x: W / 2, y: H / 2, down: false };

    const player = {
      x: W / 2,
      y: H - 100,
      r: 14,
      speed: 180,
      angle: 0,
      weapon: "pistol" as Weapon,
      lastShot: -1,
      hp: 100,
      ammo: 10,
      maxAmmo: 10,
    };

    playerRef.current = player;

    let bullets: any[] = [];
    let bossBullets: any[] = [];
    let particles: any[] = [];
    let minions: any[] = [];
    let time = 0;
    let lastSpecialAbility = 0;
    
    const bossHp = Math.round(500 * bossLevel * diffConf.hpMult);
    let boss = {
      x: W / 2,
      y: 100,
      r: 60,
      hp: bossHp,
      maxHp: bossHp,
      lastShot: 0,
      phase: 0,
      color: "#FF0000",
    };

    setBossHealth(boss.hp);
    setBossMaxHealth(boss.maxHp);

    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    const spawnParticles = (x: number, y: number, color: string, count = 10) => {
      for (let i = 0; i < count; i++) {
        particles.push({ x, y, vx: rand(-120, 120), vy: rand(-120, 120), life: rand(0.3, 0.9), color });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      
      // SPACE to restart from checkpoint
      if (e.key === " " && player.hp <= 0) {
        player.hp = 100;
        player.x = W / 2;
        player.y = H - 100;
        setHealth(100);
        setGameOver(false);
        bossBullets.length = 0;
        minions.length = 0;
        laserRef.current = { active: false, angle: 0, timer: 0, warning: 0 };
        shockwaveRef.current = { active: false, radius: 0, maxRadius: 0, timer: 0 };
        // Respawn boss at current level
        const curLvl = bossLevelRef.current;
        const respawnHp = Math.round(500 * curLvl * diffConf.hpMult);
        boss.hp = respawnHp;
        boss.maxHp = respawnHp;
        boss.x = W / 2;
        boss.y = 100;
        setBossHealth(respawnHp);
        setBossMaxHealth(respawnHp);
        return;
      }
      
      if (e.key.toLowerCase() === "r" && player.ammo < player.maxAmmo) {
        player.ammo = player.maxAmmo;
        setAmmo(player.ammo);
      }
      
      // Handle teleport power with SHIFT key
      if (e.key.toLowerCase() === "shift" && specialPowerRef.current === "teleport") {
        const now = performance.now();
        if (!teleportCooldownRef.current || now - teleportCooldownRef.current >= 3000) {
          teleportCooldownRef.current = now;
          const teleportDist = 150;
          player.x = Math.max(20, Math.min(W - 20, player.x + Math.cos(player.angle) * teleportDist));
          player.y = Math.max(20, Math.min(H - 20, player.y + Math.sin(player.angle) * teleportDist));
          spawnParticles(player.x, player.y, "#00FFFF", 20);
          toast.info("Teleported!");
        }
      }
      
      // Handle H key for health pack usage
      if (e.key.toLowerCase() === "h") {
        try {
          const pendingHealthPacks = JSON.parse(localStorage.getItem("pendingHealthPacks") || "[]");
          if (pendingHealthPacks.length > 0) {
            const pack = pendingHealthPacks.shift();
            localStorage.setItem("pendingHealthPacks", JSON.stringify(pendingHealthPacks));
            player.hp = Math.min(100, player.hp + pack.healAmount);
            setHealth(player.hp);
            toast.success(`Used health pack! +${pack.healAmount} HP`);
          }
        } catch (err) {
          console.error("Health pack error:", err);
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

      if (player.hp <= 0 && !adminStateRef.current.godMode) {
        setGameOver(true);
        setCheckpointLevel(Math.max(1, bossLevelRef.current));
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.font = "48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 60);
        ctx.font = "24px sans-serif";
        ctx.fillText(`Boss Level ${bossLevel} - Score: ${score}`, W / 2, H / 2 - 20);
        ctx.fillText(`Highest Level Reached: ${highestLevel}`, W / 2, H / 2 + 10);
        ctx.fillText(`Rewards: 💎${earnedRewards.gems} 🪙${earnedRewards.coins} ⭐${earnedRewards.gold}`, W / 2, H / 2 + 50);
        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#4ADE80";
        ctx.fillText(`Press SPACE to restart from Level ${Math.max(1, bossLevelRef.current)}`, W / 2, H / 2 + 90);
        ctx.restore();
        gameLoopRef.current = requestAnimationFrame(loop);
        return;
      }

      if (boss.hp <= 0) {
        // Boss defeated - award rewards and spawn next boss
        const currentLevel = bossLevelRef.current;
        const newLevel = currentLevel + 1;
        const gemsEarned = currentLevel * 5;
        const coinsEarned = currentLevel * 20;
        const goldEarned = currentLevel >= 5 ? currentLevel : 0;
        
        awardCurrencies(gemsEarned, coinsEarned, goldEarned);
        toast.success(`Boss ${currentLevel} defeated! +${gemsEarned}💎 +${coinsEarned}🪙 ${goldEarned > 0 ? `+${goldEarned}⭐` : ""}`);
        
        // Heal player to full on boss defeat (checkpoint)
        player.hp = 100;
        setHealth(100);
        
        // Save highest level to cloud
        if (newLevel > highestLevel) {
          setHighestLevel(newLevel);
          saveBossLevel(newLevel);
        }
        
        // Clear minions on boss defeat
        minions.length = 0;
        laserRef.current = { active: false, angle: 0, timer: 0, warning: 0 };
        shockwaveRef.current = { active: false, radius: 0, maxRadius: 0, timer: 0 };
        lastSpecialAbility = time;
        
        bossLevelRef.current = newLevel;
        setBossLevel(newLevel);
        setCheckpointLevel(newLevel);
        const newBossHp = Math.round(500 * newLevel * diffConf.hpMult);
        boss = {
          x: W / 2,
          y: 100,
          r: 60 + currentLevel * 5,
          hp: newBossHp,
          maxHp: newBossHp,
          lastShot: time,
          phase: 0,
          color: `hsl(${(currentLevel * 30) % 360}, 70%, 50%)`,
        };
        setBossHealth(boss.hp);
        setBossMaxHealth(boss.maxHp);
        setScore(prev => prev + 100 * currentLevel);
      }

      // Player movement - handle touch controls
      let dx = 0, dy = 0;
      
      if (touchscreenMode) {
        dx = touchMoveRef.current.dx;
        dy = touchMoveRef.current.dy;
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
        let speedMultiplier = adminStateRef.current.speedMultiplier;
        if (specialPowerRef.current === "speed") speedMultiplier *= 1.3;
        player.x = Math.max(20, Math.min(W - 20, player.x + dx * player.speed * speedMultiplier * dt));
        player.y = Math.max(20, Math.min(H - 20, player.y + dy * player.speed * speedMultiplier * dt));
      }

      // Shooting
      const weapon = WEAPONS[player.weapon];
      const hasInfiniteAmmo = adminStateRef.current.godMode || adminStateRef.current.infiniteAmmo;
      if (mouse.down && time - player.lastShot >= weapon.fireRate && (hasInfiniteAmmo || player.ammo > 0) && !weapon.isMelee) {
        player.lastShot = time;
        if (!hasInfiniteAmmo) {
          player.ammo--;
          setAmmo(player.ammo);
        }

        const bulletsToFire = player.weapon === "shotgun" ? 5 : 1;
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
            dmg: weapon.damage * (specialPowerRef.current === "double_damage" ? 2 : 1),
            color: weapon.color,
          });
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

        // Check boss collision
        const bx = b.x - boss.x, by = b.y - boss.y;
        if (bx * bx + by * by <= (b.r + boss.r) * (b.r + boss.r)) {
          boss.hp -= b.dmg;
          setBossHealth(boss.hp);
          spawnParticles(b.x, b.y, "#FFF", 8);
          bullets.splice(i, 1);
        }
      }

      // Boss AI
      const bossSpeedMult = diffConf.speedMult;
      boss.x += Math.sin(time * 2 * bossSpeedMult) * 100 * bossSpeedMult * dt;
      boss.x = Math.max(boss.r, Math.min(W - boss.r, boss.x));
      
      // Boss shooting - difficulty adjusted
      const shootInterval = Math.max(0.6, 2.0 - bossLevel * 0.1) * diffConf.shootMult;
      if (time - boss.lastShot >= shootInterval) {
        boss.lastShot = time;
        const bulletCount = Math.min(8, 3 + Math.floor(bossLevel / 3));
        for (let i = 0; i < bulletCount; i++) {
          const angle = (Math.PI * 2 / bulletCount) * i + time;
          bossBullets.push({
            x: boss.x,
            y: boss.y + boss.r,
            vx: Math.cos(angle) * 200 * bossSpeedMult,
            vy: Math.sin(angle) * 200 * bossSpeedMult + 80,
            r: 8,
            life: 3,
            dmg: Math.round((10 + bossLevel * 2) * diffConf.dmgMult),
            color: boss.color,
          });
        }
        
        // Additional aimed shot at player at higher levels
        if (bossLevel >= 3) {
          const aimAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
          bossBullets.push({
            x: boss.x,
            y: boss.y + boss.r,
            vx: Math.cos(aimAngle) * 280 * bossSpeedMult,
            vy: Math.sin(aimAngle) * 280 * bossSpeedMult,
            r: 10,
            life: 2.5,
            dmg: Math.round((15 + bossLevel * 3) * diffConf.dmgMult),
            color: "#FF00FF",
          });
        }
      }

      // === BOSS SPECIAL ABILITIES ===
      const specialCooldown = bossLevel >= 8 ? 4 : bossLevel >= 5 ? 6 : 8;
      if (bossLevel >= 3 && time - lastSpecialAbility >= specialCooldown) {
        lastSpecialAbility = time;
        const abilities: string[] = [];
        if (bossLevel >= 3) abilities.push("shockwave");
        if (bossLevel >= 5) abilities.push("laser");
        if (bossLevel >= 7) abilities.push("minions");
        const chosen = abilities[Math.floor(Math.random() * abilities.length)];

        if (chosen === "shockwave") {
          shockwaveRef.current = { active: true, radius: 0, maxRadius: 200 + bossLevel * 15, timer: 0.8 };
          spawnParticles(boss.x, boss.y, "#FFAA00", 20);
        } else if (chosen === "laser") {
          const laserAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
          laserRef.current = { active: true, angle: laserAngle, timer: 1.2, warning: 0.5 };
        } else if (chosen === "minions") {
          const count = Math.min(4, 1 + Math.floor(bossLevel / 4));
          for (let i = 0; i < count; i++) {
            minions.push({
              x: boss.x + rand(-80, 80),
              y: boss.y + rand(20, 60),
              r: 12,
              hp: 30 + bossLevel * 5,
              speed: 80 + bossLevel * 5,
              lastShot: time,
            });
          }
          toast.info("Boss summoned minions!");
        }
      }

      // Update shockwave
      if (shockwaveRef.current.active) {
        shockwaveRef.current.timer -= dt;
        shockwaveRef.current.radius += (shockwaveRef.current.maxRadius / 0.8) * dt;
        if (shockwaveRef.current.timer <= 0) {
          shockwaveRef.current.active = false;
        }
        // Check player collision with shockwave ring
        const dist = Math.hypot(player.x - boss.x, player.y - boss.y);
        const ringR = shockwaveRef.current.radius;
        if (Math.abs(dist - ringR) < 25 && !adminStateRef.current.godMode) {
          player.hp -= Math.round(8 * diffConf.dmgMult);
          setHealth(Math.max(0, player.hp));
        }
      }

      // Update laser
      if (laserRef.current.active) {
        laserRef.current.timer -= dt;
        laserRef.current.warning -= dt;
        if (laserRef.current.timer <= 0) {
          laserRef.current.active = false;
        }
        // Damage player if laser is past warning phase
        if (laserRef.current.warning <= 0) {
          const laserDx = Math.cos(laserRef.current.angle);
          const laserDy = Math.sin(laserRef.current.angle);
          // Point-to-line distance
          const relX = player.x - boss.x, relY = player.y - boss.y;
          const proj = relX * laserDx + relY * laserDy;
          if (proj > 0) {
            const perpDist = Math.abs(relX * laserDy - relY * laserDx);
            if (perpDist < 20 && !adminStateRef.current.godMode) {
              player.hp -= Math.round(15 * diffConf.dmgMult * dt);
              setHealth(Math.max(0, player.hp));
            }
          }
        }
      }

      // Update minions
      for (let i = minions.length - 1; i >= 0; i--) {
        const m = minions[i];
        const toPlayerAngle = Math.atan2(player.y - m.y, player.x - m.x);
        m.x += Math.cos(toPlayerAngle) * m.speed * dt;
        m.y += Math.sin(toPlayerAngle) * m.speed * dt;
        
        // Minion shooting
        if (time - m.lastShot >= 2.0) {
          m.lastShot = time;
          bossBullets.push({
            x: m.x, y: m.y,
            vx: Math.cos(toPlayerAngle) * 180,
            vy: Math.sin(toPlayerAngle) * 180,
            r: 6, life: 2,
            dmg: Math.round(8 * diffConf.dmgMult),
            color: "#FF8800",
          });
        }

        // Check if player bullets hit minion
        for (let j = bullets.length - 1; j >= 0; j--) {
          const b = bullets[j];
          const mdx = b.x - m.x, mdy = b.y - m.y;
          if (mdx * mdx + mdy * mdy <= (b.r + m.r) * (b.r + m.r)) {
            m.hp -= b.dmg;
            spawnParticles(b.x, b.y, "#FF8800", 5);
            bullets.splice(j, 1);
            if (m.hp <= 0) {
              spawnParticles(m.x, m.y, "#FF8800", 15);
              minions.splice(i, 1);
              setScore(prev => prev + 25);
              break;
            }
          }
        }
      }

      // Update boss bullets
      for (let i = bossBullets.length - 1; i >= 0; i--) {
        const b = bossBullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
          bossBullets.splice(i, 1);
          continue;
        }

        const px = b.x - player.x, py = b.y - player.y;
        if (px * px + py * py <= (b.r + player.r) * (b.r + player.r)) {
          if (!adminStateRef.current.godMode) {
            player.hp -= b.dmg;
            setHealth(Math.max(0, player.hp));
            spawnParticles(b.x, b.y, "#FF6B6B", 8);
          }
          bossBullets.splice(i, 1);
        }
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Draw
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = "#333";
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

      // Draw boss
      ctx.save();
      ctx.translate(boss.x, boss.y);
      ctx.fillStyle = boss.color;
      ctx.beginPath();
      ctx.arc(0, 0, boss.r, 0, Math.PI * 2);
      ctx.fill();
      
      // Boss health bar
      const bhpW = 120;
      ctx.fillStyle = "#333";
      ctx.fillRect(-bhpW / 2, -boss.r - 20, bhpW, 10);
      ctx.fillStyle = boss.color;
      ctx.fillRect(-bhpW / 2, -boss.r - 20, bhpW * Math.max(0, boss.hp / boss.maxHp), 10);
      
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`BOSS LV.${bossLevel}`, 0, boss.r + 20);
      ctx.restore();

      // Draw bullets
      for (const b of bullets) {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw boss bullets
      for (const b of bossBullets) {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw player
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);
      ctx.fillStyle = playerSkin;
      ctx.beginPath();
      ctx.arc(0, 0, player.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = WEAPONS[player.weapon].color;
      ctx.fillRect(player.r - 2, -6, 18, 12);
      ctx.restore();

      // Draw minions
      for (const m of minions) {
        ctx.save();
        ctx.fillStyle = "#FF8800";
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
        // Minion health bar
        ctx.fillStyle = "#333";
        ctx.fillRect(m.x - 15, m.y - m.r - 8, 30, 4);
        ctx.fillStyle = "#FF8800";
        ctx.fillRect(m.x - 15, m.y - m.r - 8, 30 * Math.max(0, m.hp / (30 + bossLevel * 5)), 4);
        ctx.restore();
      }

      // Draw shockwave
      if (shockwaveRef.current.active) {
        ctx.save();
        ctx.strokeStyle = "#FFAA00";
        ctx.lineWidth = 4;
        ctx.globalAlpha = Math.max(0, shockwaveRef.current.timer / 0.8);
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, shockwaveRef.current.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw laser
      if (laserRef.current.active) {
        ctx.save();
        const isWarning = laserRef.current.warning > 0;
        ctx.strokeStyle = isWarning ? "rgba(255,0,0,0.3)" : "#FF0000";
        ctx.lineWidth = isWarning ? 6 : 12;
        ctx.globalAlpha = isWarning ? 0.5 + Math.sin(time * 20) * 0.3 : 0.9;
        ctx.beginPath();
        ctx.moveTo(boss.x, boss.y);
        ctx.lineTo(
          boss.x + Math.cos(laserRef.current.angle) * 1200,
          boss.y + Math.sin(laserRef.current.angle) * 1200
        );
        ctx.stroke();
        ctx.restore();
      }

      // Draw particles
      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / 0.9);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        ctx.restore();
      }

      // Crosshair
      ctx.save();
      ctx.strokeStyle = "#fff";
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

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [bossLevel, unlockedWeapons, playerSkin, touchscreenMode, highestLevel, difficulty]);

  // Touch control handlers
  const handleTouchMove = useCallback((dx: number, dy: number) => {
    touchMoveRef.current = { dx, dy };
  }, []);

  const handleTouchAim = useCallback((x: number, y: number) => {
    touchAimRef.current = { x, y };
  }, []);

  const handleTouchShoot = useCallback((shooting: boolean) => {
    touchShootingRef.current = shooting;
  }, []);

  const handleTouchReload = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.ammo = playerRef.current.maxAmmo;
      setAmmo(playerRef.current.maxAmmo);
    }
  }, []);

  return (
    <div className="relative">
      {/* Stats panel */}
      <div className="fixed left-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-2">
        <div className="font-bold text-lg text-red-500">BOSS MODE</div>
        <div className="text-sm">Level: {bossLevel}</div>
        <div className="text-sm">Highest: {highestLevel}</div>
        <div className="text-sm">Score: {score}</div>
        <div className="flex gap-2 text-sm">
          <span className="flex items-center gap-1"><Gem className="w-4 h-4 text-purple-400" />{earnedRewards.gems}</span>
          <span className="flex items-center gap-1"><Coins className="w-4 h-4 text-yellow-400" />{earnedRewards.coins}</span>
          <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400" />{earnedRewards.gold}</span>
        </div>
      </div>

      {/* Health/Ammo panel */}
      <div className="fixed right-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-3 min-w-[180px]">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Health</span>
          <span className="font-bold text-lg">{Math.round(health)}</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-red-500 to-green-500 h-full transition-all"
            style={{ width: `${health}%` }}
          />
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Weapon</span>
          <span className="font-bold" style={{ color: WEAPONS[currentWeapon].color }}>
            {WEAPONS[currentWeapon].name}
          </span>
        </div>
        
        {!WEAPONS[currentWeapon].isMelee && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Ammo</span>
            <span className="font-bold">{ammo}/{maxAmmo}</span>
          </div>
        )}
      </div>

      {/* Boss health bar at top */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-3 w-80">
        <div className="text-center font-bold mb-1">BOSS LV.{bossLevel}</div>
        <div className="w-full bg-secondary rounded-full h-4 overflow-hidden">
          <div 
            className="bg-red-500 h-full transition-all"
            style={{ width: `${(bossHealth / bossMaxHealth) * 100}%` }}
          />
        </div>
        <div className="text-center text-sm mt-1">{bossHealth}/{bossMaxHealth}</div>
      </div>

      {/* Weapon hotbar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 flex gap-2">
        {unlockedWeapons.slice(0, 6).map((weapon, index) => (
          <div
            key={weapon}
            className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${
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
            <span className="text-[10px] font-medium">{WEAPONS[weapon].name}</span>
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
        <Button variant="outline" onClick={onBack}>
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
        onShowOnlinePlayers={() => {}}
      />

      {/* Touch Controls */}
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