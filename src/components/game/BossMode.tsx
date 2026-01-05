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

export const BossMode = ({ username, onBack, playerSkin = "#FFF3D6", adminAbuseEvents = [], touchscreenMode = false }: BossModeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  
  // Load highest level from localStorage
  const savedLevel = parseInt(localStorage.getItem("foodfps_boss_level") || "1", 10);
  const [bossLevel, setBossLevel] = useState(savedLevel);
  const [highestLevel, setHighestLevel] = useState(savedLevel);
  
  const [bossHealth, setBossHealth] = useState(500 * savedLevel);
  const [bossMaxHealth, setBossMaxHealth] = useState(500 * savedLevel);
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
  }, []);

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

    const { data: progress } = await supabase
      .from("player_progress")
      .select("unlocked_weapons")
      .eq("user_id", user.id)
      .single();

    if (progress?.unlocked_weapons) {
      setUnlockedWeapons(progress.unlocked_weapons as Weapon[]);
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
    }
  }, [hasPermission]);

  useEffect(() => {
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
    let time = 0;
    
    let boss = {
      x: W / 2,
      y: 100,
      r: 60,
      hp: 500 * bossLevel,
      maxHp: 500 * bossLevel,
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
      if (e.key.toLowerCase() === "r" && player.ammo < player.maxAmmo) {
        player.ammo = player.maxAmmo;
        setAmmo(player.ammo);
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
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.font = "48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 40);
        ctx.font = "24px sans-serif";
        ctx.fillText(`Boss Level ${bossLevel} - Score: ${score}`, W / 2, H / 2 + 10);
        ctx.fillText(`Highest Level Reached: ${highestLevel}`, W / 2, H / 2 + 40);
        ctx.fillText(`Rewards: 💎${earnedRewards.gems} 🪙${earnedRewards.coins} ⭐${earnedRewards.gold}`, W / 2, H / 2 + 80);
        ctx.restore();
        gameLoopRef.current = requestAnimationFrame(loop);
        return;
      }

      if (boss.hp <= 0) {
        // Boss defeated - award rewards and spawn next boss
        const newLevel = bossLevel + 1;
        const gemsEarned = bossLevel * 5;
        const coinsEarned = bossLevel * 20;
        const goldEarned = bossLevel >= 5 ? bossLevel : 0;
        
        awardCurrencies(gemsEarned, coinsEarned, goldEarned);
        toast.success(`Boss ${bossLevel} defeated! +${gemsEarned}💎 +${coinsEarned}🪙 ${goldEarned > 0 ? `+${goldEarned}⭐` : ""}`);
        
        // Save highest level to localStorage
        if (newLevel > highestLevel) {
          setHighestLevel(newLevel);
          localStorage.setItem("foodfps_boss_level", String(newLevel));
        }
        
        setBossLevel(newLevel);
        boss = {
          x: W / 2,
          y: 100,
          r: 60 + bossLevel * 5,
          hp: 500 * newLevel,
          maxHp: 500 * newLevel,
          lastShot: time,
          phase: 0,
          color: `hsl(${(bossLevel * 30) % 360}, 70%, 50%)`,
        };
        setBossHealth(boss.hp);
        setBossMaxHealth(boss.maxHp);
        setScore(prev => prev + 100 * bossLevel);
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
        dx /= len;
        dy /= len;
        player.x = Math.max(20, Math.min(W - 20, player.x + dx * player.speed * adminStateRef.current.speedMultiplier * dt));
        player.y = Math.max(20, Math.min(H - 20, player.y + dy * player.speed * adminStateRef.current.speedMultiplier * dt));
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
            dmg: weapon.damage,
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
      boss.x += Math.sin(time * 2) * 100 * dt;
      
      // Boss shooting (more aggressive at higher levels) - INCREASED DAMAGE
      const shootInterval = Math.max(0.3, 1.5 - bossLevel * 0.15);
      if (time - boss.lastShot >= shootInterval) {
        boss.lastShot = time;
        const bulletCount = Math.min(12, 4 + Math.floor(bossLevel / 2));
        for (let i = 0; i < bulletCount; i++) {
          const angle = (Math.PI * 2 / bulletCount) * i + time;
          bossBullets.push({
            x: boss.x,
            y: boss.y + boss.r,
            vx: Math.cos(angle) * 250,
            vy: Math.sin(angle) * 250 + 120,
            r: 10,
            life: 4,
            dmg: 25 + bossLevel * 5, // INCREASED from 15+2*level to 25+5*level
            color: boss.color,
          });
        }
        
        // Additional aimed shot at player at higher levels
        if (bossLevel >= 2) {
          const aimAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
          bossBullets.push({
            x: boss.x,
            y: boss.y + boss.r,
            vx: Math.cos(aimAngle) * 350,
            vy: Math.sin(aimAngle) * 350,
            r: 12,
            life: 3,
            dmg: 35 + bossLevel * 8, // Heavy damage aimed shot
            color: "#FF00FF",
          });
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
  }, [bossLevel, unlockedWeapons, playerSkin, touchscreenMode, highestLevel]);

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