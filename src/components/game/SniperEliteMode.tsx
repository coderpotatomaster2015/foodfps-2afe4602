import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Shield } from "lucide-react";
import { AdminChat } from "./AdminChat";
import { TouchControls } from "./TouchControls";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SniperEliteModeProps { username: string; onBack: () => void; adminAbuseEvents?: { event_type: string; expires_at: string }[]; touchscreenMode?: boolean; playerSkin?: string; }

type Weapon = "pistol"|"shotgun"|"minigun"|"sniper"|"sword"|"knife"|"axe"|"rifle"|"smg"|"rpg"|"flamethrower"|"railgun"|"crossbow"|"laser_pistol"|"grenade_launcher"|"katana"|"dual_pistols"|"plasma_rifle"|"boomerang"|"whip"|"freeze_ray"|"harpoon_gun";
interface WeaponConfig { name: string; fireRate: number; damage: number; ammo: number; maxAmmo: number; spread: number; bulletSpeed: number; color: string; isMelee: boolean; unlockScore: number; }
const WEAPONS: Record<Weapon, WeaponConfig> = {
  pistol:{name:"Pistol",fireRate:0.18,damage:40,ammo:10,maxAmmo:10,spread:10,bulletSpeed:420,color:"#FFB84D",isMelee:false,unlockScore:0},shotgun:{name:"Shotgun",fireRate:0.5,damage:25,ammo:6,maxAmmo:6,spread:40,bulletSpeed:380,color:"#FF6B6B",isMelee:false,unlockScore:100},sword:{name:"Sword",fireRate:0.4,damage:80,ammo:999,maxAmmo:999,spread:0,bulletSpeed:0,color:"#C0C0C0",isMelee:true,unlockScore:200},rifle:{name:"Rifle",fireRate:0.12,damage:35,ammo:30,maxAmmo:30,spread:5,bulletSpeed:600,color:"#8B7355",isMelee:false,unlockScore:250},sniper:{name:"Sniper",fireRate:1.0,damage:120,ammo:5,maxAmmo:5,spread:0,bulletSpeed:800,color:"#A6FFB3",isMelee:false,unlockScore:300},smg:{name:"SMG",fireRate:0.08,damage:25,ammo:40,maxAmmo:40,spread:15,bulletSpeed:480,color:"#FFD700",isMelee:false,unlockScore:350},knife:{name:"Knife",fireRate:0.2,damage:50,ammo:999,maxAmmo:999,spread:0,bulletSpeed:0,color:"#888888",isMelee:true,unlockScore:400},rpg:{name:"RPG",fireRate:2.5,damage:200,ammo:3,maxAmmo:3,spread:0,bulletSpeed:300,color:"#FF00FF",isMelee:false,unlockScore:450},axe:{name:"Axe",fireRate:0.6,damage:100,ammo:999,maxAmmo:999,spread:0,bulletSpeed:0,color:"#8B4513",isMelee:true,unlockScore:500},flamethrower:{name:"Flamethrower",fireRate:0.03,damage:15,ammo:200,maxAmmo:200,spread:25,bulletSpeed:200,color:"#FF4500",isMelee:false,unlockScore:550},minigun:{name:"Minigun",fireRate:0.05,damage:20,ammo:100,maxAmmo:100,spread:20,bulletSpeed:500,color:"#6BAFFF",isMelee:false,unlockScore:600},railgun:{name:"Railgun",fireRate:1.8,damage:250,ammo:4,maxAmmo:4,spread:0,bulletSpeed:1200,color:"#00FFFF",isMelee:false,unlockScore:700},crossbow:{name:"Crossbow",fireRate:0.8,damage:90,ammo:8,maxAmmo:8,spread:2,bulletSpeed:700,color:"#A0522D",isMelee:false,unlockScore:750},laser_pistol:{name:"Laser Pistol",fireRate:0.15,damage:45,ammo:15,maxAmmo:15,spread:3,bulletSpeed:900,color:"#FF1493",isMelee:false,unlockScore:800},grenade_launcher:{name:"Grenade Launcher",fireRate:1.5,damage:180,ammo:4,maxAmmo:4,spread:8,bulletSpeed:250,color:"#228B22",isMelee:false,unlockScore:850},katana:{name:"Katana",fireRate:0.3,damage:110,ammo:999,maxAmmo:999,spread:0,bulletSpeed:0,color:"#DC143C",isMelee:true,unlockScore:900},dual_pistols:{name:"Dual Pistols",fireRate:0.1,damage:30,ammo:20,maxAmmo:20,spread:18,bulletSpeed:420,color:"#DAA520",isMelee:false,unlockScore:950},plasma_rifle:{name:"Plasma Rifle",fireRate:0.2,damage:55,ammo:25,maxAmmo:25,spread:6,bulletSpeed:650,color:"#7B68EE",isMelee:false,unlockScore:1000},boomerang:{name:"Boomerang",fireRate:0.7,damage:70,ammo:999,maxAmmo:999,spread:0,bulletSpeed:350,color:"#FF8C00",isMelee:false,unlockScore:1050},whip:{name:"Whip",fireRate:0.35,damage:65,ammo:999,maxAmmo:999,spread:0,bulletSpeed:0,color:"#8B0000",isMelee:true,unlockScore:1100},freeze_ray:{name:"Freeze Ray",fireRate:0.12,damage:20,ammo:30,maxAmmo:30,spread:12,bulletSpeed:400,color:"#ADD8E6",isMelee:false,unlockScore:1150},harpoon_gun:{name:"Harpoon Gun",fireRate:1.2,damage:160,ammo:3,maxAmmo:3,spread:0,bulletSpeed:550,color:"#4682B4",isMelee:false,unlockScore:1200},
};
const WEAPON_ORDER: Weapon[] = ["pistol","shotgun","sword","rifle","sniper","smg","knife","rpg","axe","flamethrower","minigun","railgun","crossbow","laser_pistol","grenade_launcher","katana","dual_pistols","plasma_rifle","boomerang","whip","freeze_ray","harpoon_gun"];

// Sniper Elite: Sniper-only mode. Enemies have 1-shot HP but are fast and hard to hit. Dark stealth theme.
export const SniperEliteMode = ({ username, onBack, adminAbuseEvents = [], touchscreenMode = false, playerSkin = "#FFF3D6" }: SniperEliteModeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [ammo, setAmmo] = useState(5);
  const [maxAmmo, setMaxAmmo] = useState(5);
  const [currentWeapon] = useState<Weapon>("sniper");
  const [health, setHealth] = useState(100);
  const [maxHealth] = useState(100);
  const [spawnImmunity, setSpawnImmunity] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [kills, setKills] = useState(0);
  const [headshots, setHeadshots] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);

  const adminStateRef = useRef({ active: false, godMode: false, speedMultiplier: 1, infiniteAmmo: false });
  const gameStateRef = useRef<any>({ enemies: [], pickups: [] });
  const playerRef = useRef<any>(null);
  const spawnImmunityRef = useRef(true);
  const gameLoopRef = useRef<number | null>(null);
  const touchMoveRef = useRef({ x: 0, y: 0 });
  const touchAimRef = useRef({ x: 480, y: 320 });
  const touchShootingRef = useRef(false);

  useEffect(() => { checkPermissions(); }, []);
  useEffect(() => { const now = new Date(); for (const event of adminAbuseEvents) { if (new Date(event.expires_at) > now && event.event_type === "godmode") adminStateRef.current.godMode = true; } }, [adminAbuseEvents]);

  const checkPermissions = async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) return; const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single(); if (roleData) { setHasPermission(true); adminStateRef.current.active = true; return; } const { data: permData } = await supabase.from("chat_permissions").select("can_use_commands").eq("user_id", user.id).single(); if (permData?.can_use_commands) { setHasPermission(true); adminStateRef.current.active = true; } };
  const saveProgress = async (newScore: number) => { try { const { data: { user } } = await supabase.auth.getUser(); if (!user || newScore <= 0) return; const { data: p } = await supabase.from("profiles").select("total_score").eq("user_id", user.id).single(); await supabase.from("profiles").update({ total_score: (p?.total_score || 0) + newScore }).eq("user_id", user.id); } catch {} };
  const revivePlayer = useCallback(() => { if (playerRef.current) { playerRef.current.hp = 100; setHealth(100); setGameOver(false); spawnImmunityRef.current = true; setSpawnImmunity(true); setTimeout(() => { spawnImmunityRef.current = false; setSpawnImmunity(false); }, 5000); toast.success("Revived!"); } }, []);
  const handleCommand = useCallback((cmd: string) => { if (!hasPermission && !adminStateRef.current.active) return; if (cmd.startsWith("/godmode")) { adminStateRef.current.godMode = !adminStateRef.current.godMode; } else if (cmd.startsWith("/nuke")) { gameStateRef.current.enemies.length = 0; } else if (cmd.startsWith("/revive")) { revivePlayer(); } else if (cmd.startsWith("/infiniteammo")) { adminStateRef.current.infiniteAmmo = !adminStateRef.current.infiniteAmmo; } }, [hasPermission, revivePlayer]);
  const handleTouchMove = useCallback((dx: number, dy: number) => { touchMoveRef.current = { x: dx, y: dy }; }, []);
  const handleTouchAim = useCallback((x: number, y: number) => { touchAimRef.current = { x, y }; }, []);
  const handleTouchShoot = useCallback((shooting: boolean) => { touchShootingRef.current = shooting; }, []);
  const handleTouchReload = useCallback(() => { if (playerRef.current) { playerRef.current.ammo = 5; setAmmo(5); } }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    spawnImmunityRef.current = true; setSpawnImmunity(true);
    setTimeout(() => { spawnImmunityRef.current = false; setSpawnImmunity(false); }, 5000);

    let keys: Record<string, boolean> = {};
    let mouse = { x: W / 2, y: H / 2, down: false };
    // Sniper-only: slow movement, high damage
    const player = { x: W / 2, y: H / 2, r: 12, speed: 140, angle: 0, weapon: "sniper" as Weapon, lastShot: -1, lastMelee: -1, hp: 100, maxHp: 100, score: 0, ammo: 5, maxAmmo: 5 };
    playerRef.current = player;

    let bullets: any[] = [], enemyBullets: any[] = [], enemies: any[] = [], pickups: any[] = [], particles: any[] = [];
    let time = 0, lastSpawn = 0, enemySpawnInterval = 2.5;
    let last = performance.now();
    gameStateRef.current.enemies = enemies; gameStateRef.current.pickups = pickups;
    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    // Fast enemies with low HP (one-shot kills)
    const spawnEnemy = () => {
      const side = Math.floor(rand(0, 4));
      let x, y;
      if (side === 0) { x = rand(50, W - 50); y = -30; } else if (side === 1) { x = rand(50, W - 50); y = H + 30; } else if (side === 2) { x = -30; y = rand(50, H - 50); } else { x = W + 30; y = rand(50, H - 50); }
      enemies.push({ id: `e_${Date.now()}_${Math.random().toString(36).substr(2,6)}`, x, y, r: 12, speed: rand(80, 150), hp: 50, maxHp: 50, color: "#14B8A6", stun: 0, lastShot: -1 });
    };
    const spawnPickup = () => { pickups.push({ x: rand(80, W - 80), y: rand(80, H - 80), r: 10, amt: 2, ttl: 15 }); };
    const spawnParticles = (x: number, y: number, color: string, count = 10) => { for (let i = 0; i < count; i++) particles.push({ x, y, vx: rand(-120, 120), vy: rand(-120, 120), life: rand(0.3, 0.9), color }); };

    const tryShoot = (t: number) => {
      const weapon = WEAPONS["sniper"];
      const fireRate = adminStateRef.current.godMode ? 0 : weapon.fireRate;
      const hasInfinite = adminStateRef.current.godMode || adminStateRef.current.infiniteAmmo;
      if (mouse.down && t - player.lastShot >= fireRate && (hasInfinite || player.ammo > 0)) {
        player.lastShot = t;
        if (!hasInfinite) { player.ammo--; setAmmo(player.ammo); }
        bullets.push({ x: player.x + Math.cos(player.angle) * player.r * 1.6, y: player.y + Math.sin(player.angle) * player.r * 1.6, vx: Math.cos(player.angle) * 900, vy: Math.sin(player.angle) * 900, r: 4, life: 3, dmg: 200, color: "#14B8A6" });
        spawnParticles(player.x + Math.cos(player.angle) * player.r * 1.6, player.y + Math.sin(player.angle) * player.r * 1.6, "#14B8A6", 8);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true; if (e.key.toLowerCase() === "r") { player.ammo = 5; setAmmo(5); } };
    const handleKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    const handleMouseMove = (e: MouseEvent) => { const rect = canvas.getBoundingClientRect(); mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width); mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height); };
    const handleMouseDown = (e: MouseEvent) => { if (e.button === 0) mouse.down = true; };
    const handleMouseUp = (e: MouseEvent) => { if (e.button === 0) mouse.down = false; };

    window.addEventListener("keydown", handleKeyDown); window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("mousemove", handleMouseMove); canvas.addEventListener("mousedown", handleMouseDown); canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000); last = now; time += dt;
      if (player.hp <= 0 && !adminStateRef.current.godMode) {
        if (!gameOver) { setGameOver(true); saveProgress(score); }
        ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#14B8A6"; ctx.font = "bold 48px sans-serif"; ctx.textAlign = "center"; ctx.fillText("MISSION FAILED", W / 2, H / 2 - 30);
        ctx.fillStyle = "#fff"; ctx.font = "24px sans-serif"; ctx.fillText(`Score: ${score} • Kills: ${kills} • Headshots: ${headshots}`, W / 2, H / 2 + 20);
        ctx.font = "14px sans-serif"; ctx.fillStyle = "#888"; ctx.fillText("Use /revive or press Back to Menu", W / 2, H / 2 + 60);
        gameLoopRef.current = requestAnimationFrame(loop); return;
      }

      let dx = 0, dy = 0;
      if (touchscreenMode) { dx = touchMoveRef.current.x; dy = touchMoveRef.current.y; mouse.x = touchAimRef.current.x; mouse.y = touchAimRef.current.y; mouse.down = touchShootingRef.current; }
      else { if (keys["w"]||keys["arrowup"]) dy -= 1; if (keys["s"]||keys["arrowdown"]) dy += 1; if (keys["a"]||keys["arrowleft"]) dx -= 1; if (keys["d"]||keys["arrowright"]) dx += 1; }
      player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
      if (dx !== 0 || dy !== 0) { const len = Math.hypot(dx, dy); dx /= len; dy /= len; player.x = Math.max(20, Math.min(W - 20, player.x + dx * player.speed * adminStateRef.current.speedMultiplier * dt)); player.y = Math.max(20, Math.min(H - 20, player.y + dy * player.speed * adminStateRef.current.speedMultiplier * dt)); }
      tryShoot(time);

      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) { bullets.splice(i, 1); continue; }
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 <= (b.r + e.r) ** 2) {
            e.hp -= b.dmg; e.stun = 0.6; spawnParticles(b.x, b.y, "#14B8A6", 12);
            if (e.hp <= 0) { spawnParticles(e.x, e.y, e.color, 20); setScore(p => { const ns = p + 25; player.score = ns; return ns; }); setKills(p => p + 1); setHeadshots(p => p + 1); if (Math.random() < 0.3) pickups.push({ x: e.x, y: e.y, r: 10, amt: 2, ttl: 15 }); enemies.splice(j, 1); }
            bullets.splice(i, 1); break;
          }
        }
      }

      const isImmune = spawnImmunityRef.current;
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) { enemyBullets.splice(i, 1); continue; }
        if ((b.x - player.x) ** 2 + (b.y - player.y) ** 2 <= (b.r + player.r) ** 2) {
          if (!adminStateRef.current.godMode && !isImmune) { player.hp -= b.dmg; setHealth(Math.max(0, player.hp)); } enemyBullets.splice(i, 1);
        }
      }

      for (const e of enemies) {
        if (e.stun > 0) { e.stun -= dt; continue; }
        const vx = player.x - e.x, vy = player.y - e.y, d = Math.hypot(vx, vy);
        if (d > 0) { e.x += (vx / d) * e.speed * dt; e.y += (vy / d) * e.speed * dt; }
        if (d < player.r + e.r && !adminStateRef.current.godMode && !isImmune) { player.hp -= 8 * dt; setHealth(Math.max(0, player.hp)); }
        if (d < 400 && time - e.lastShot >= 4.0) { e.lastShot = time; const ang = Math.atan2(player.y - e.y, player.x - e.x); enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, r: 5, life: 3, dmg: 15, color: "#0D9488" }); }
      }

      for (let i = pickups.length - 1; i >= 0; i--) { const p = pickups[i]; p.ttl -= dt; if (p.ttl <= 0) { pickups.splice(i, 1); continue; } if ((player.x - p.x) ** 2 + (player.y - p.y) ** 2 <= (player.r + p.r) ** 2) { player.ammo = Math.min(5, player.ammo + p.amt); setAmmo(player.ammo); spawnParticles(p.x, p.y, "#14B8A6", 10); pickups.splice(i, 1); } }
      for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.vy *= 0.98; p.life -= dt; if (p.life <= 0) particles.splice(i, 1); }
      if (time - lastSpawn > enemySpawnInterval) { lastSpawn = time; spawnEnemy(); if (enemySpawnInterval > 1.0) enemySpawnInterval *= 0.99; }

      // Draw
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#060a0e"; ctx.fillRect(0, 0, W, H);
      // Scope vignette effect
      ctx.save();
      const grad = ctx.createRadialGradient(W / 2, H / 2, 150, W / 2, H / 2, 500);
      grad.addColorStop(0, "transparent"); grad.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      // Grid
      ctx.save(); ctx.globalAlpha = 0.04; ctx.strokeStyle = "#14B8A6";
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();

      // HUD on canvas
      ctx.save(); ctx.fillStyle = "rgba(20,184,166,0.15)"; ctx.fillRect(W / 2 - 100, 8, 200, 30); ctx.strokeStyle = "#14B8A6"; ctx.lineWidth = 1; ctx.strokeRect(W / 2 - 100, 8, 200, 30);
      ctx.fillStyle = "#14B8A6"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center"; ctx.fillText(`🎯 Headshots: ${headshots} • Kills: ${kills}`, W / 2, 28); ctx.restore();

      for (const p of pickups) { ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = "#14B8A6"; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#022c22"; ctx.font = "10px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("+" + p.amt, 0, 0); ctx.restore(); }
      for (const b of bullets) { ctx.save(); ctx.fillStyle = b.color; ctx.shadowColor = "#14B8A6"; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      for (const b of enemyBullets) { ctx.save(); ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      for (const e of enemies) { ctx.save(); ctx.translate(e.x, e.y); ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill(); const hpW = 24; ctx.fillStyle = "#333"; ctx.fillRect(-hpW / 2, -e.r - 10, hpW, 4); ctx.fillStyle = "#14B8A6"; ctx.fillRect(-hpW / 2, -e.r - 10, hpW * Math.max(0, e.hp / e.maxHp), 4); ctx.restore(); }

      ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(player.x, player.y + player.r * 0.8, player.r * 1.1, player.r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle);
      if (isImmune) { ctx.strokeStyle = "#14B8A6"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, player.r + 5, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = playerSkin; ctx.beginPath(); ctx.arc(0, 0, player.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2b2b2b"; ctx.beginPath(); ctx.arc(player.r * 0.45, -4, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#A6FFB3"; ctx.fillRect(player.r - 2, -4, 28, 8); // Long sniper barrel
      ctx.restore();

      for (const p of particles) { ctx.save(); ctx.globalAlpha = Math.max(0, p.life / 0.9); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); ctx.restore(); }
      // Scope crosshair
      ctx.save(); ctx.strokeStyle = "#14B8A6"; ctx.globalAlpha = 0.8; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mouse.x - 20, mouse.y); ctx.lineTo(mouse.x - 5, mouse.y); ctx.moveTo(mouse.x + 5, mouse.y); ctx.lineTo(mouse.x + 20, mouse.y);
      ctx.moveTo(mouse.x, mouse.y - 20); ctx.lineTo(mouse.x, mouse.y - 5); ctx.moveTo(mouse.x, mouse.y + 5); ctx.lineTo(mouse.x, mouse.y + 20); ctx.stroke();
      ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 15, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    for (let i = 0; i < 3; i++) spawnEnemy();
    for (let i = 0; i < 2; i++) spawnPickup();
    gameLoopRef.current = requestAnimationFrame(loop);

    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); canvas.removeEventListener("mousemove", handleMouseMove); canvas.removeEventListener("mousedown", handleMouseDown); canvas.removeEventListener("mouseup", handleMouseUp); if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
  }, [playerSkin, touchscreenMode]);

  return (
    <div className="relative">
      <div className="fixed left-4 top-4 bg-card/80 backdrop-blur-sm border border-teal-500/30 rounded-lg p-4 space-y-2">
        <div className="font-bold text-lg text-teal-400">🎯 Sniper Elite</div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div><span className="text-teal-400 font-mono">WASD</span> move</div>
          <div><span className="text-teal-400 font-mono">Mouse</span> aim</div>
          <div><span className="text-teal-400 font-mono">LMB</span> fire</div>
          <div><span className="text-teal-400 font-mono">R</span> reload</div>
          <div className="text-teal-300 text-xs mt-2">One shot, one kill!</div>
        </div>
      </div>
      <div className="fixed right-4 top-4 bg-card/80 backdrop-blur-sm border border-teal-500/30 rounded-lg p-4 space-y-3 min-w-[180px]">
        <div className="text-center text-teal-400 font-bold">🎯 Headshots: {headshots}</div>
        <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Health</span><span className="font-bold text-lg">{Math.round(health)}</span></div>
        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden"><div className="bg-gradient-to-r from-red-500 to-teal-400 h-full transition-all" style={{ width: `${(health / maxHealth) * 100}%` }} /></div>
        {spawnImmunity && <div className="flex items-center gap-2 text-teal-400 text-sm"><Shield className="w-4 h-4" /><span>Spawn Protection</span></div>}
        <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Ammo</span><span className="font-bold text-lg">{ammo}/{maxAmmo}</span></div>
        <div className="w-full bg-secondary rounded-full h-2"><div className="bg-teal-400 h-full rounded-full" style={{ width: `${(ammo / maxAmmo) * 100}%` }} /></div>
        <div className="pt-2 border-t border-teal-500/20">
          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Score</span><span className="font-bold text-lg text-teal-400">{score}</span></div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>Kills: {kills}</span></div>
        </div>
      </div>
      <canvas ref={canvasRef} width={960} height={640} className="border-2 border-teal-500/30 rounded-lg shadow-2xl" />
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={() => { if (score > 0) saveProgress(score); onBack(); }}><ArrowLeft className="w-4 h-4 mr-2" />Back to Menu</Button>
        <Button variant="outline" onClick={() => setChatOpen(!chatOpen)}><MessageSquare className="w-4 h-4 mr-2" />Console</Button>
      </div>
      <AdminChat open={chatOpen} onOpenChange={setChatOpen} onCommand={handleCommand} onShowOnlinePlayers={() => {}} />
      {touchscreenMode && <TouchControls onMove={handleTouchMove} onAim={handleTouchAim} onShoot={handleTouchShoot} onReload={handleTouchReload} canvasWidth={960} canvasHeight={640} />}
    </div>
  );
};
