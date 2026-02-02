import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, MessageSquare, Shield, Trophy, Bot, User } from "lucide-react";
import { AdminChat } from "./AdminChat";
import { TouchControls } from "./TouchControls";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface YouVsMeModeProps {
  username: string;
  onBack: () => void;
  touchscreenMode?: boolean;
  playerSkin?: string;
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

export const YouVsMeMode = ({ username, onBack, touchscreenMode = false, playerSkin = "#FFF3D6" }: YouVsMeModeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [gameState, setGameState] = useState<"ready" | "playing" | "victory" | "defeat">("ready");
  const [health, setHealth] = useState(100);
  const [botHealth, setBotHealth] = useState(100);
  const [ammo, setAmmo] = useState(10);
  const [maxAmmo, setMaxAmmo] = useState(10);
  const [currentWeapon, setCurrentWeapon] = useState<Weapon>("pistol");
  const [unlockedWeapons] = useState<Weapon[]>(WEAPON_ORDER); // Player gets all weapons
  const [spawnImmunity, setSpawnImmunity] = useState(true);

  const playerRef = useRef<any>(null);
  const botRef = useRef<any>(null);
  const playerBulletsRef = useRef<any[]>([]);
  const botBulletsRef = useRef<any[]>([]);
  const particlesRef = useRef<any[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const mouseRef = useRef({ x: 480, y: 320, down: false });
  const animationFrameRef = useRef<number>();
  const spawnImmunityRef = useRef(true);

  const touchMoveRef = useRef({ x: 0, y: 0 });
  const touchAimRef = useRef({ x: 480, y: 320 });
  const touchShootingRef = useRef(false);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setGameState("playing");
    playerBulletsRef.current = [];
    botBulletsRef.current = [];
    particlesRef.current = [];

    // Initialize player
    playerRef.current = {
      x: 200,
      y: canvas.height / 2,
      r: 14,
      speed: 180,
      angle: 0,
      weapon: "pistol" as Weapon,
      lastShot: -1,
      lastMelee: -1,
      hp: 100,
      ammo: 10,
      maxAmmo: 10,
    };

    // Initialize AI bot - has all weapons, same HP as player
    botRef.current = {
      x: 760,
      y: canvas.height / 2,
      r: 14,
      speed: 150,
      angle: Math.PI,
      weapon: "pistol" as Weapon,
      lastShot: -1,
      lastWeaponSwitch: 0,
      hp: 100,
      ammo: 999,
      state: "aggressive" as "aggressive" | "defensive" | "flanking",
      targetX: 760,
      targetY: canvas.height / 2,
      strafeDirTime: 0,
      strafeDir: 1,
    };

    setHealth(100);
    setBotHealth(100);
    setAmmo(10);
    setMaxAmmo(10);
    setCurrentWeapon("pistol");

    // Spawn immunity
    spawnImmunityRef.current = true;
    setSpawnImmunity(true);
    setTimeout(() => {
      spawnImmunityRef.current = false;
      setSpawnImmunity(false);
    }, 3000);
  }, []);

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

  const handleCommand = useCallback((cmd: string) => {
    if (cmd.startsWith("/heal")) {
      if (playerRef.current) {
        playerRef.current.hp = 100;
        setHealth(100);
        toast.success("Healed!");
      }
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
      const bot = botRef.current;
      if (!player || !bot) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const playerBullets = playerBulletsRef.current;
      const botBullets = botBulletsRef.current;
      const particles = particlesRef.current;

      // Check game over
      if (player.hp <= 0) {
        setGameState("defeat");
        return;
      }
      if (bot.hp <= 0) {
        setGameState("victory");
        return;
      }

      // Handle player input
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
        player.x = Math.max(20, Math.min(W - 20, player.x + dx * player.speed * dt));
        player.y = Math.max(20, Math.min(H - 20, player.y + dy * player.speed * dt));
      }

      // Player shooting
      const weapon = WEAPONS[player.weapon as Weapon];
      if (!weapon.isMelee) {
        if (mouseRef.current.down && time - player.lastShot >= weapon.fireRate && player.ammo > 0) {
          player.lastShot = time;
          player.ammo--;
          setAmmo(player.ammo);

          const bulletsToFire = player.weapon === "shotgun" ? 5 : 1;
          for (let i = 0; i < bulletsToFire; i++) {
            const spread = weapon.spread * (Math.PI / 180);
            const finalAngle = player.angle + rand(-spread, spread);
            playerBullets.push({
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
          spawnParticles(player.x + Math.cos(player.angle) * player.r * 1.6, player.y + Math.sin(player.angle) * player.r * 1.6, weapon.color, 6);
        }
      } else {
        if (mouseRef.current.down && time - player.lastMelee >= weapon.fireRate) {
          player.lastMelee = time;
          const meleeRange = 50;
          spawnParticles(player.x + Math.cos(player.angle) * meleeRange, player.y + Math.sin(player.angle) * meleeRange, weapon.color, 10);
          
          const edx = bot.x - player.x;
          const edy = bot.y - player.y;
          const dist = Math.hypot(edx, edy);
          const angleToBot = Math.atan2(edy, edx);
          const angleDiff = Math.abs(angleToBot - player.angle);
          
          if (dist <= meleeRange && angleDiff < 0.5) {
            bot.hp -= weapon.damage;
            setBotHealth(Math.max(0, bot.hp));
            spawnParticles(bot.x, bot.y, weapon.color, 12);
          }
        }
      }

      // AI Bot behavior - Smart opponent
      const distToPlayer = Math.hypot(player.x - bot.x, player.y - bot.y);
      bot.angle = Math.atan2(player.y - bot.y, player.x - bot.x);

      // Switch weapons based on distance
      if (time - bot.lastWeaponSwitch > 3) {
        bot.lastWeaponSwitch = time;
        if (distToPlayer < 100) {
          bot.weapon = Math.random() > 0.5 ? "shotgun" : "sword";
        } else if (distToPlayer > 300) {
          bot.weapon = Math.random() > 0.5 ? "sniper" : "rifle";
        } else {
          const midRangeWeapons: Weapon[] = ["smg", "rifle", "minigun", "pistol"];
          bot.weapon = midRangeWeapons[Math.floor(Math.random() * midRangeWeapons.length)];
        }
      }

      // Bot movement - strafe and approach/retreat
      if (time - bot.strafeDirTime > 1.5) {
        bot.strafeDirTime = time;
        bot.strafeDir = Math.random() > 0.5 ? 1 : -1;
        bot.state = Math.random() < 0.3 ? "defensive" : (Math.random() < 0.6 ? "aggressive" : "flanking");
      }

      let botDx = 0, botDy = 0;
      const perpAngle = bot.angle + Math.PI / 2;
      
      // Strafe
      botDx += Math.cos(perpAngle) * bot.strafeDir;
      botDy += Math.sin(perpAngle) * bot.strafeDir;

      // Approach or retreat based on state and distance
      if (bot.state === "aggressive" || distToPlayer > 250) {
        botDx += Math.cos(bot.angle) * 0.7;
        botDy += Math.sin(bot.angle) * 0.7;
      } else if (bot.state === "defensive" && distToPlayer < 150) {
        botDx -= Math.cos(bot.angle) * 0.7;
        botDy -= Math.sin(bot.angle) * 0.7;
      }

      const botLen = Math.hypot(botDx, botDy);
      if (botLen > 0) {
        botDx /= botLen; botDy /= botLen;
        bot.x = Math.max(20, Math.min(W - 20, bot.x + botDx * bot.speed * dt));
        bot.y = Math.max(20, Math.min(H - 20, bot.y + botDy * bot.speed * dt));
      }

      // Bot shooting
      const botWeapon = WEAPONS[bot.weapon as Weapon];
      if (!botWeapon.isMelee) {
        if (time - bot.lastShot >= botWeapon.fireRate) {
          bot.lastShot = time;
          const bulletsToFire = bot.weapon === "shotgun" ? 5 : 1;
          for (let i = 0; i < bulletsToFire; i++) {
            const spread = botWeapon.spread * (Math.PI / 180);
            const finalAngle = bot.angle + rand(-spread, spread);
            botBullets.push({
              x: bot.x + Math.cos(bot.angle) * bot.r * 1.6,
              y: bot.y + Math.sin(bot.angle) * bot.r * 1.6,
              vx: Math.cos(finalAngle) * botWeapon.bulletSpeed,
              vy: Math.sin(finalAngle) * botWeapon.bulletSpeed,
              r: 6,
              life: 2.5,
              dmg: botWeapon.damage,
              color: botWeapon.color,
            });
          }
          spawnParticles(bot.x + Math.cos(bot.angle) * bot.r * 1.6, bot.y + Math.sin(bot.angle) * bot.r * 1.6, botWeapon.color, 4);
        }
      } else {
        // Melee attack
        if (distToPlayer < 50 && time - bot.lastShot >= botWeapon.fireRate) {
          bot.lastShot = time;
          if (!spawnImmunityRef.current) {
            player.hp -= botWeapon.damage;
            setHealth(Math.max(0, player.hp));
            spawnParticles(player.x, player.y, botWeapon.color, 12);
          }
        }
      }

      // Update player bullets - check collision with bot
      for (let i = playerBullets.length - 1; i >= 0; i--) {
        const b = playerBullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
          playerBullets.splice(i, 1);
          continue;
        }

        const bdx = b.x - bot.x, bdy = b.y - bot.y;
        if (bdx * bdx + bdy * bdy <= (b.r + bot.r) * (b.r + bot.r)) {
          bot.hp -= b.dmg;
          setBotHealth(Math.max(0, bot.hp));
          spawnParticles(b.x, b.y, "#FFF3D6", 8);
          playerBullets.splice(i, 1);
        }
      }

      // Update bot bullets - check collision with player
      const isImmune = spawnImmunityRef.current;
      for (let i = botBullets.length - 1; i >= 0; i--) {
        const b = botBullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
          botBullets.splice(i, 1);
          continue;
        }

        const bdx = b.x - player.x, bdy = b.y - player.y;
        if (bdx * bdx + bdy * bdy <= (b.r + player.r) * (b.r + player.r)) {
          if (!isImmune) {
            player.hp -= b.dmg;
            setHealth(Math.max(0, player.hp));
            spawnParticles(b.x, b.y, "#FF6B6B", 8);
          }
          botBullets.splice(i, 1);
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

      // Draw arena divider line
      ctx.save();
      ctx.strokeStyle = "#444";
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.restore();

      // Draw bullets
      for (const b of playerBullets) {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (const b of botBullets) {
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

      // Draw username above player
      ctx.save();
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      const nameWidth = ctx.measureText(username).width + 10;
      ctx.fillRect(player.x - nameWidth / 2, player.y - player.r - 26, nameWidth, 14);
      ctx.fillStyle = "#fff";
      ctx.fillText(username, player.x, player.y - player.r - 16);
      ctx.restore();

      // Draw bot
      ctx.save();
      ctx.translate(bot.x, bot.y);
      ctx.rotate(bot.angle);
      
      ctx.fillStyle = "#FF4444";
      ctx.beginPath();
      ctx.arc(0, 0, bot.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b2b2b";
      ctx.beginPath();
      ctx.arc(bot.r * 0.45, -4, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = botWeapon.color;
      if (botWeapon.isMelee) {
        ctx.fillRect(bot.r - 2, -3, 25, 6);
      } else {
        ctx.fillRect(bot.r - 2, -6, 18, 12);
      }
      ctx.restore();

      // Draw "AI Bot" above bot
      ctx.save();
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,0,0,0.6)";
      const botNameWidth = ctx.measureText("AI Bot").width + 10;
      ctx.fillRect(bot.x - botNameWidth / 2, bot.y - bot.r - 26, botNameWidth, 14);
      ctx.fillStyle = "#fff";
      ctx.fillText("AI Bot", bot.x, bot.y - bot.r - 16);
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
    };
  }, [gameState, unlockedWeapons, playerSkin, touchscreenMode, username]);

  // Ready screen
  if (gameState === "ready") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-6">
          <div className="flex items-center justify-center gap-4">
            <User className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">VS</span>
            <Bot className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold">You vs. Me</h1>
          <p className="text-muted-foreground">
            1v1 against a smart AI bot. Both have all weapons, same HP. May the best player win!
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button variant="gaming" onClick={startGame} className="flex-1">
              Start Duel
            </Button>
          </div>
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
              {gameState === "victory" ? "You Win!" : "Bot Wins!"}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {gameState === "victory" ? "You defeated the AI bot!" : "The AI bot was victorious."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button variant="gaming" onClick={startGame} className="flex-1">
              Rematch
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Game screen
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen">
      {/* HUD - Left - Player */}
      <div className="fixed left-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-2 min-w-[160px]">
        <div className="font-bold text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          You
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Health</span>
          <span className="font-bold">{Math.round(health)}</span>
        </div>
        <Progress value={health} className="h-3" />
        {spawnImmunity && (
          <Badge variant="secondary" className="text-xs">
            <Shield className="w-3 h-3 mr-1" />
            Protected
          </Badge>
        )}
      </div>

      {/* HUD - Right - Bot */}
      <div className="fixed right-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-2 min-w-[160px]">
        <div className="font-bold text-lg flex items-center gap-2">
          <Bot className="w-5 h-5 text-red-500" />
          AI Bot
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Health</span>
          <span className="font-bold">{Math.round(botHealth)}</span>
        </div>
        <Progress value={botHealth} className="h-3 [&>div]:bg-red-500" />
      </div>

      {/* Weapon info */}
      <div className="fixed left-4 bottom-20 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-3 space-y-2">
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

      {/* Weapon Hotbar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 flex gap-1 flex-wrap justify-center max-w-[600px]">
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

      {/* Buttons */}
      <div className="fixed bottom-20 left-4 flex gap-2">
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
