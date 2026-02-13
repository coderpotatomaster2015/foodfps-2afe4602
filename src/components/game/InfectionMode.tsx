import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Shield } from "lucide-react";
import { AdminChat } from "./AdminChat";
import { TouchControls } from "./TouchControls";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InfectionModeProps {
  username: string;
  onBack: () => void;
  adminAbuseEvents?: { event_type: string; expires_at: string }[];
  touchscreenMode?: boolean;
  playerSkin?: string;
}

type Weapon = "pistol" | "shotgun" | "minigun" | "sniper" | "sword" | "knife" | "axe" | "rifle" | "smg" | "rpg" | "flamethrower" | "railgun";
interface WeaponConfig { name: string; fireRate: number; damage: number; ammo: number; maxAmmo: number; spread: number; bulletSpeed: number; color: string; isMelee: boolean; unlockScore: number; }
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

const TOTAL_BOTS = 8;

export const InfectionMode = ({ username, onBack, adminAbuseEvents = [], touchscreenMode = false, playerSkin = "#FFF3D6" }: InfectionModeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [ammo, setAmmo] = useState(10);
  const [maxAmmo, setMaxAmmo] = useState(10);
  const [currentWeapon, setCurrentWeapon] = useState<Weapon>("pistol");
  const [health, setHealth] = useState(100);
  const [maxHealth] = useState(100);
  const [unlockedWeapons, setUnlockedWeapons] = useState<Weapon[]>(["pistol"]);
  const [spawnImmunity, setSpawnImmunity] = useState(true);
  const [kills, setKills] = useState(0);
  const [infected, setInfected] = useState(1);
  const [survivors, setSurvivors] = useState(TOTAL_BOTS);
  const [gameResult, setGameResult] = useState<"playing" | "win" | "lose">("playing");
  const [hasPermission, setHasPermission] = useState(false);
  const [playerInfected, setPlayerInfected] = useState(false);

  const adminStateRef = useRef({ active: false, godMode: false, speedMultiplier: 1, infiniteAmmo: false });
  const gameStateRef = useRef<any>({ W: 960, H: 640 });
  const playerRef = useRef<any>(null);
  const spawnImmunityRef = useRef(true);
  const gameLoopRef = useRef<number | null>(null);
  const specialPowerRef = useRef<string | null>(null);
  const teleportCooldownRef = useRef(0);
  const touchMoveRef = useRef({ x: 0, y: 0 });
  const touchAimRef = useRef({ x: 480, y: 320 });
  const touchShootingRef = useRef(false);

  useEffect(() => { try { const ep = localStorage.getItem("equippedPower"); if (ep) specialPowerRef.current = ep; } catch {} }, []);
  useEffect(() => { const now = new Date(); for (const event of adminAbuseEvents) { if (new Date(event.expires_at) > now) { if (event.event_type === "godmode") adminStateRef.current.godMode = true; } } }, [adminAbuseEvents]);
  useEffect(() => { checkPermissions(); loadWeapons(); }, []);

  const checkPermissions = async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) return; const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single(); if (data) { setHasPermission(true); adminStateRef.current.active = true; } };
  const loadWeapons = async () => {
    try { const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
      const { data: loadout } = await supabase.from("equipped_loadout").select("*").eq("user_id", user.id).maybeSingle();
      if (loadout) { const ew = [loadout.slot_1, loadout.slot_2, loadout.slot_3, loadout.slot_4, loadout.slot_5].filter(Boolean) as Weapon[]; setUnlockedWeapons(ew.length > 0 ? ew : ["pistol"]); if (loadout.equipped_power) { specialPowerRef.current = loadout.equipped_power; } }
      else { const sw = localStorage.getItem("equippedWeapons"); if (sw) { try { setUnlockedWeapons(JSON.parse(sw)); } catch { setUnlockedWeapons(["pistol"]); } } }
    } catch { setUnlockedWeapons(["pistol"]); }
  };
  const saveProgress = async (s: number) => { try { const { data: { user } } = await supabase.auth.getUser(); if (!user || s <= 0) return; const { data: p } = await supabase.from("profiles").select("total_score").eq("user_id", user.id).single(); await supabase.from("profiles").update({ total_score: (p?.total_score || 0) + s }).eq("user_id", user.id); } catch {} };

  const handleTouchMove = useCallback((dx: number, dy: number) => { touchMoveRef.current = { x: dx, y: dy }; }, []);
  const handleTouchAim = useCallback((x: number, y: number) => { touchAimRef.current = { x, y }; }, []);
  const handleTouchShoot = useCallback((shooting: boolean) => { touchShootingRef.current = shooting; }, []);
  const handleTouchReload = useCallback(() => { if (playerRef.current) { const wc = WEAPONS[playerRef.current.weapon as Weapon]; playerRef.current.ammo = wc.maxAmmo; setAmmo(wc.maxAmmo); } }, []);
  const handleCommand = useCallback((cmd: string) => { if (!hasPermission) return; if (cmd.startsWith("/godmode")) adminStateRef.current.godMode = !adminStateRef.current.godMode; }, [hasPermission]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let W = canvas.width, H = canvas.height;
    gameStateRef.current.W = W; gameStateRef.current.H = H;
    spawnImmunityRef.current = true; setSpawnImmunity(true);
    setTimeout(() => { spawnImmunityRef.current = false; setSpawnImmunity(false); }, 5000);

    let keys: Record<string, boolean> = {};
    let mouse = { x: W / 2, y: H / 2, down: false };
    const player = { x: W / 2, y: H / 2, r: 14, speed: 180, angle: 0, weapon: "pistol" as Weapon, lastShot: -1, lastMelee: -1, hp: 100, maxHp: 100, score: 0, ammo: 10, maxAmmo: 10, isInfected: false };
    playerRef.current = player;

    let bullets: any[] = [], particles: any[] = [];
    let time = 0, pickups: any[] = [];

    const rand = (min: number, max: number) => Math.random() * (max - min) + min;
    const spawnParticles = (x: number, y: number, color: string, count = 10) => { for (let i = 0; i < count; i++) particles.push({ x, y, vx: rand(-120, 120), vy: rand(-120, 120), life: rand(0.3, 0.9), color }); };

    // INFECTION: Create bots - one random is the alpha infector
    const BOT_NAMES = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"];
    const bots: any[] = [];
    const alphaIndex = Math.floor(rand(0, TOTAL_BOTS));
    
    for (let i = 0; i < TOTAL_BOTS; i++) {
      const isAlpha = i === alphaIndex;
      bots.push({
        id: `bot_${i}`, x: rand(50, W - 50), y: rand(50, H - 50), r: 14,
        speed: isAlpha ? 100 : rand(60, 120), hp: 100, maxHp: 100,
        color: isAlpha ? "#00FF00" : "#6B8AFF",
        name: BOT_NAMES[i], isInfected: isAlpha, lastShot: -1, stun: 0,
        targetX: rand(50, W - 50), targetY: rand(50, H - 50), changeTargetTime: rand(2, 5),
      });
    }

    toast.info(`🦠 ${BOT_NAMES[alphaIndex]} is the Alpha Infector!`);

    for (let i = 0; i < 4; i++) pickups.push({ x: rand(80, W - 80), y: rand(80, H - 80), r: 10, amt: 3, ttl: 25 });

    const tryShoot = (t: number) => {
      if (player.isInfected) return; // Infected can't shoot
      const weapon = WEAPONS[player.weapon];
      if (weapon.isMelee) {
        if (mouse.down && t - player.lastMelee >= weapon.fireRate) {
          player.lastMelee = t; const meleeRange = 50;
          spawnParticles(player.x + Math.cos(player.angle) * meleeRange, player.y + Math.sin(player.angle) * meleeRange, weapon.color, 10);
          for (const b of bots) {
            if (!b.isInfected) continue; // Only hit infected
            const dx = b.x - player.x, dy = b.y - player.y; const dist = Math.hypot(dx, dy);
            if (dist <= meleeRange) {
              const dmg = specialPowerRef.current === "double_damage" ? weapon.damage * 2 : weapon.damage;
              b.hp -= dmg; b.stun = 0.6; spawnParticles(b.x, b.y, weapon.color, 12);
              if (b.hp <= 0) { b.hp = 100; b.x = rand(50, W - 50); b.y = rand(50, H - 50); b.stun = 2; setScore(p => p + 15); setKills(p => p + 1); toast.success(`Knocked out ${b.name}! They'll recover...`); }
            }
          }
        }
        return;
      }
      const fr = adminStateRef.current.godMode ? 0 : weapon.fireRate;
      const inf = adminStateRef.current.godMode || adminStateRef.current.infiniteAmmo;
      if (mouse.down && t - player.lastShot >= fr && (inf || player.ammo > 0)) {
        player.lastShot = t; if (!inf) { player.ammo--; setAmmo(player.ammo); }
        const cnt = player.weapon === "shotgun" ? 5 : 1;
        for (let i = 0; i < cnt; i++) {
          const ang = player.angle; const sp = weapon.spread * (Math.PI / 180); const fa = ang + rand(-sp, sp);
          const dm = specialPowerRef.current === "double_damage" ? 2 : 1;
          bullets.push({ x: player.x + Math.cos(ang) * player.r * 1.6, y: player.y + Math.sin(ang) * player.r * 1.6, vx: Math.cos(fa) * weapon.bulletSpeed, vy: Math.sin(fa) * weapon.bulletSpeed, r: 8, life: 2.5, dmg: weapon.damage * dm, color: weapon.color });
        }
        spawnParticles(player.x + Math.cos(player.angle) * player.r * 1.6, player.y + Math.sin(player.angle) * player.r * 1.6, weapon.color, 6);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === "r" && !WEAPONS[player.weapon].isMelee) { player.ammo = player.maxAmmo; setAmmo(player.ammo); }
      if (e.key.toLowerCase() === "shift" && specialPowerRef.current === "teleport") { const now = performance.now(); if (now - teleportCooldownRef.current >= 3000) { teleportCooldownRef.current = now; player.x = Math.max(20, Math.min(W - 20, player.x + Math.cos(player.angle) * 150)); player.y = Math.max(20, Math.min(H - 20, player.y + Math.sin(player.angle) * 150)); } }
      if (e.key.toLowerCase() === "h") {
        try { const pp = JSON.parse(localStorage.getItem("pendingHealthPacks") || "[]"); if (pp.length > 0 && player.hp < 100) { const pack = pp.shift(); localStorage.setItem("pendingHealthPacks", JSON.stringify(pp)); player.hp = Math.min(100, player.hp + (pack.healAmount || 25)); setHealth(player.hp); toast.success(`+${pack.healAmount || 25} HP!`); }
        else { const eq = JSON.parse(localStorage.getItem("equippedHealthPacks") || "[]"); if (eq.length > 0 && player.hp < 100) { const pid = eq[0]; const ha: Record<string, number> = { small_health: 25, medium_health: 50, large_health: 100 }; player.hp = Math.min(100, player.hp + (ha[pid] || 25)); setHealth(player.hp); toast.success(`+${ha[pid] || 25} HP!`); (async () => { try { const { data: { user: cu } } = await supabase.auth.getUser(); if (!cu) return; const { data: inv } = await supabase.from("player_inventory").select("*").eq("user_id", cu.id).eq("item_id", pid).eq("item_type", "health_pack").maybeSingle(); if (inv) { if (inv.quantity <= 1) { await supabase.from("player_inventory").delete().eq("user_id", cu.id).eq("item_id", pid); localStorage.setItem("equippedHealthPacks", JSON.stringify(eq.filter((id: string) => id !== pid))); } else await supabase.from("player_inventory").update({ quantity: inv.quantity - 1 }).eq("user_id", cu.id).eq("item_id", pid); } } catch {} })(); } }
        } catch {}
      }
      const kn = parseInt(e.key);
      if (kn >= 1 && kn <= unlockedWeapons.length) { const w = unlockedWeapons[kn - 1]; if (w) { player.weapon = w; const wc = WEAPONS[w]; player.ammo = wc.ammo; player.maxAmmo = wc.maxAmmo; setCurrentWeapon(w); setAmmo(player.ammo); setMaxAmmo(player.maxAmmo); } }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    const handleMouseMove = (e: MouseEvent) => { const r = canvas.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * (canvas.width / r.width); mouse.y = (e.clientY - r.top) * (canvas.height / r.height); };
    const handleMouseDown = (e: MouseEvent) => { if (e.button === 0) mouse.down = true; };
    const handleMouseUp = (e: MouseEvent) => { if (e.button === 0) mouse.down = false; };
    window.addEventListener("keydown", handleKeyDown); window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("mousemove", handleMouseMove); canvas.addEventListener("mousedown", handleMouseDown); canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000); last = now; time += dt;

      // Check game end
      const infectedCount = bots.filter(b => b.isInfected).length + (player.isInfected ? 1 : 0);
      const totalCount = TOTAL_BOTS + 1; // bots + player
      setInfected(infectedCount); setSurvivors(totalCount - infectedCount);

      if (gameResult !== "playing") {
        ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, 0, W, H);
        ctx.font = "48px sans-serif"; ctx.textAlign = "center";
        ctx.fillStyle = gameResult === "win" ? "#FFD700" : "#00FF00";
        ctx.fillText(gameResult === "win" ? "🏆 SURVIVOR!" : "🦠 INFECTED!", W / 2, H / 2 - 20);
        ctx.fillStyle = "#fff"; ctx.font = "24px sans-serif";
        ctx.fillText(`Score: ${score} | Kills: ${kills}`, W / 2, H / 2 + 30); ctx.restore();
        gameLoopRef.current = requestAnimationFrame(loop); return;
      }

      // All bots infected = player survived (win) unless player is also infected
      if (bots.every(b => b.isInfected) && !player.isInfected) {
        setGameResult("win"); saveProgress(score + 50); toast.success("🏆 You survived the infection!"); 
        gameLoopRef.current = requestAnimationFrame(loop); return;
      }
      // Player infected = lose
      if (player.isInfected) {
        setGameResult("lose"); saveProgress(score); toast.error("🦠 You've been infected!");
        gameLoopRef.current = requestAnimationFrame(loop); return;
      }

      let dx = 0, dy = 0;
      if (touchscreenMode) { dx = touchMoveRef.current.x; dy = touchMoveRef.current.y; mouse.x = touchAimRef.current.x; mouse.y = touchAimRef.current.y; mouse.down = touchShootingRef.current; }
      else { if (keys["w"] || keys["arrowup"]) dy -= 1; if (keys["s"] || keys["arrowdown"]) dy += 1; if (keys["a"] || keys["arrowleft"]) dx -= 1; if (keys["d"] || keys["arrowright"]) dx += 1; }
      player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy); dx /= len; dy /= len;
        let sm = adminStateRef.current.speedMultiplier; if (specialPowerRef.current === "speed") sm *= 1.3;
        player.x = Math.max(20, Math.min(W - 20, player.x + dx * player.speed * sm * dt));
        player.y = Math.max(20, Math.min(H - 20, player.y + dy * player.speed * sm * dt));
      }
      tryShoot(time);

      // Update bullets - hit infected bots
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) { bullets.splice(i, 1); continue; }
        for (const bot of bots) {
          if (!bot.isInfected) continue;
          const edx = b.x - bot.x, edy = b.y - bot.y;
          if (edx * edx + edy * edy <= (b.r + bot.r) * (b.r + bot.r)) {
            bot.hp -= b.dmg; bot.stun = 0.6; spawnParticles(b.x, b.y, "#FFF3D6", 8);
            if (bot.hp <= 0) { bot.hp = 100; bot.x = rand(50, W - 50); bot.y = rand(50, H - 50); bot.stun = 3; setScore(p => p + 15); setKills(p => p + 1); }
            bullets.splice(i, 1); break;
          }
        }
      }

      // INFECTION LOGIC: Infected bots chase survivors and player, infect on contact
      const isImmune = spawnImmunityRef.current;
      for (const bot of bots) {
        if (bot.stun > 0) { bot.stun = Math.max(0, bot.stun - dt); continue; }
        
        if (bot.isInfected) {
          // Chase nearest non-infected (player or bot)
          let nearestDist = Infinity, nearestX = player.x, nearestY = player.y;
          // Check player
          const playerDist = Math.hypot(player.x - bot.x, player.y - bot.y);
          if (!player.isInfected && playerDist < nearestDist) { nearestDist = playerDist; nearestX = player.x; nearestY = player.y; }
          // Check other bots
          for (const other of bots) {
            if (other === bot || other.isInfected) continue;
            const d = Math.hypot(other.x - bot.x, other.y - bot.y);
            if (d < nearestDist) { nearestDist = d; nearestX = other.x; nearestY = other.y; }
          }
          const vx = nearestX - bot.x, vy = nearestY - bot.y; const d = Math.hypot(vx, vy);
          if (d > 0) { bot.x += (vx / d) * bot.speed * dt; bot.y += (vy / d) * bot.speed * dt; }
          bot.x = Math.max(20, Math.min(W - 20, bot.x)); bot.y = Math.max(20, Math.min(H - 20, bot.y));

          // Infect player on contact
          if (!player.isInfected && !isImmune && !adminStateRef.current.godMode && playerDist < player.r + bot.r + 5) {
            player.isInfected = true; setPlayerInfected(true);
          }
          // Infect other bots on contact
          for (const other of bots) {
            if (other === bot || other.isInfected) continue;
            const d2 = Math.hypot(other.x - bot.x, other.y - bot.y);
            if (d2 < bot.r + other.r + 5) {
              other.isInfected = true; other.color = "#00FF00"; other.speed = 100;
              spawnParticles(other.x, other.y, "#00FF00", 20);
              toast.info(`🦠 ${other.name} has been infected!`);
            }
          }
        } else {
          // Non-infected bots run away from nearest infected
          let nearestInfDist = Infinity, nearestInfX = 0, nearestInfY = 0;
          for (const other of bots) {
            if (!other.isInfected) continue;
            const d = Math.hypot(other.x - bot.x, other.y - bot.y);
            if (d < nearestInfDist) { nearestInfDist = d; nearestInfX = other.x; nearestInfY = other.y; }
          }
          if (nearestInfDist < 200) {
            // Run away
            const vx = bot.x - nearestInfX, vy = bot.y - nearestInfY; const d = Math.hypot(vx, vy);
            if (d > 0) { bot.x += (vx / d) * bot.speed * dt; bot.y += (vy / d) * bot.speed * dt; }
          } else {
            // Wander
            if (time > bot.changeTargetTime) { bot.targetX = rand(50, W - 50); bot.targetY = rand(50, H - 50); bot.changeTargetTime = time + rand(2, 5); }
            const tvx = bot.targetX - bot.x, tvy = bot.targetY - bot.y; const td = Math.hypot(tvx, tvy);
            if (td > 10) { bot.x += (tvx / td) * bot.speed * 0.5 * dt; bot.y += (tvy / td) * bot.speed * 0.5 * dt; }
          }
          bot.x = Math.max(20, Math.min(W - 20, bot.x)); bot.y = Math.max(20, Math.min(H - 20, bot.y));
        }
      }

      // Pickups
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i]; p.ttl -= dt; if (p.ttl <= 0) { pickups.splice(i, 1); pickups.push({ x: rand(80, W - 80), y: rand(80, H - 80), r: 10, amt: 3, ttl: 25 }); continue; }
        if ((player.x - p.x) ** 2 + (player.y - p.y) ** 2 <= (player.r + p.r) ** 2) { if (!WEAPONS[player.weapon].isMelee) { player.ammo = Math.min(player.maxAmmo, player.ammo + p.amt); setAmmo(player.ammo); } spawnParticles(p.x, p.y, "#A6FFB3", 10); pickups.splice(i, 1); pickups.push({ x: rand(80, W - 80), y: rand(80, H - 80), r: 10, amt: 3, ttl: 25 }); }
      }
      for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.vy *= 0.98; p.life -= dt; if (p.life <= 0) particles.splice(i, 1); }

      // === DRAW ===
      ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = 0.06; ctx.strokeStyle = "#1a3a1a";
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();

      // Header
      ctx.save(); ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
      ctx.fillStyle = "#00FF00"; ctx.fillText(`🦠 INFECTION - Infected: ${infectedCount} | Survivors: ${totalCount - infectedCount}`, W / 2, 28); ctx.restore();

      for (const p of pickups) { ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = "#A6FFB3"; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#073"; ctx.font = "10px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("+" + p.amt, 0, 0); ctx.restore(); }
      for (const b of bullets) { ctx.save(); ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }

      // Draw bots
      for (const bot of bots) {
        ctx.save(); ctx.translate(bot.x, bot.y);
        // Infected glow
        if (bot.isInfected) { ctx.strokeStyle = "#00FF00"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, bot.r + 4, 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = bot.isInfected ? "#00FF00" : bot.color; ctx.beginPath(); ctx.arc(0, 0, bot.r, 0, Math.PI * 2); ctx.fill();
        // HP bar
        const hpW = 28; ctx.fillStyle = "#333"; ctx.fillRect(-hpW / 2, -bot.r - 18, hpW, 4); ctx.fillStyle = bot.isInfected ? "#00FF00" : "#6B8AFF"; ctx.fillRect(-hpW / 2, -bot.r - 18, hpW * Math.max(0, bot.hp / 100), 4);
        // Name
        ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(`${bot.isInfected ? "🦠 " : ""}${bot.name}`, 0, -bot.r - 22);
        ctx.restore();
      }

      // Player
      ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(player.x, player.y + player.r * 0.8, player.r * 1.1, player.r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle);
      if (spawnImmunityRef.current) { ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, player.r + 5, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = player.isInfected ? "#00FF00" : playerSkin; ctx.beginPath(); ctx.arc(0, 0, player.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2b2b2b"; ctx.beginPath(); ctx.arc(player.r * 0.45, -4, 3.5, 0, Math.PI * 2); ctx.fill();
      if (!player.isInfected) { ctx.fillStyle = WEAPONS[player.weapon].color; if (WEAPONS[player.weapon].isMelee) ctx.fillRect(player.r - 2, -3, 25, 6); else ctx.fillRect(player.r - 2, -6, 18, 12); }
      ctx.restore();
      ctx.save(); ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = player.isInfected ? "#00FF00" : "#fff"; ctx.fillText(username, player.x, player.y - player.r - 10); ctx.restore();

      for (const p of particles) { ctx.save(); ctx.globalAlpha = Math.max(0, p.life / 0.9); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); ctx.restore(); }
      ctx.save(); ctx.strokeStyle = "#fff"; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(mouse.x - 8, mouse.y); ctx.lineTo(mouse.x + 8, mouse.y); ctx.moveTo(mouse.x, mouse.y - 8); ctx.lineTo(mouse.x, mouse.y + 8); ctx.stroke(); ctx.restore();

      gameLoopRef.current = requestAnimationFrame(loop);
    };
    gameLoopRef.current = requestAnimationFrame(loop);

    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); canvas.removeEventListener("mousemove", handleMouseMove); canvas.removeEventListener("mousedown", handleMouseDown); canvas.removeEventListener("mouseup", handleMouseUp); if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
  }, [unlockedWeapons, playerSkin]);

  return (
    <div className="relative">
      <div className="fixed left-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-2">
        <div className="font-bold text-lg">🦠 Infection Mode</div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Avoid the infected!</div>
          <div>Shoot infected to stun them</div>
          <div><span className="text-primary font-mono">WASD</span> move</div>
          <div><span className="text-primary font-mono">LMB</span> shoot</div>
          <div><span className="text-primary font-mono">R</span> reload</div>
        </div>
      </div>
      <div className="fixed right-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-3 min-w-[180px]">
        <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Health</span><span className="font-bold text-lg">{Math.round(health)}</span></div>
        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden"><div className="bg-gradient-to-r from-red-500 to-green-500 h-full transition-all duration-300" style={{ width: `${(health / maxHealth) * 100}%` }} /></div>
        {spawnImmunity && <div className="flex items-center gap-2 text-yellow-500 text-sm"><Shield className="w-4 h-4" /><span>Spawn Protection</span></div>}
        {playerInfected && <div className="text-green-500 font-bold animate-pulse">🦠 YOU ARE INFECTED</div>}
        <div className="flex justify-between"><span className="text-sm text-green-500">Infected</span><span className="font-bold text-green-500">{infected}</span></div>
        <div className="flex justify-between"><span className="text-sm text-blue-400">Survivors</span><span className="font-bold text-blue-400">{survivors}</span></div>
        <div className="flex justify-between"><span className="text-sm text-muted-foreground">Weapon</span><span className="font-bold" style={{ color: WEAPONS[currentWeapon].color }}>{WEAPONS[currentWeapon].name}</span></div>
        {!WEAPONS[currentWeapon].isMelee && <div className="flex justify-between"><span className="text-sm text-muted-foreground">Ammo</span><span className="font-bold">{ammo}/{maxAmmo}</span></div>}
        <div className="pt-2 border-t border-border"><div className="flex justify-between"><span className="text-sm text-muted-foreground">Score</span><span className="font-bold text-primary">{score}</span></div></div>
      </div>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 flex gap-2">
        {unlockedWeapons.map((weapon, index) => (
          <div key={weapon} className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${currentWeapon === weapon ? "bg-primary text-primary-foreground ring-2 ring-primary" : "bg-secondary hover:bg-secondary/80"}`}
            onClick={() => { if (playerRef.current) { playerRef.current.weapon = weapon; const wc = WEAPONS[weapon]; playerRef.current.ammo = wc.ammo; playerRef.current.maxAmmo = wc.maxAmmo; setCurrentWeapon(weapon); setAmmo(wc.ammo); setMaxAmmo(wc.maxAmmo); } }}>
            <span className="text-xs opacity-70">{index + 1}</span><span className="text-xs font-medium text-center">{WEAPONS[weapon].name}</span>
          </div>
        ))}
      </div>
      <canvas ref={canvasRef} width={960} height={640} className="border-2 border-border rounded-lg shadow-2xl" />
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={() => { if (score > 0) saveProgress(score); onBack(); }}><ArrowLeft className="w-4 h-4 mr-2" /> Back to Menu</Button>
        <Button variant="outline" onClick={() => setChatOpen(!chatOpen)}><MessageSquare className="w-4 h-4 mr-2" /> Console</Button>
      </div>
      <AdminChat open={chatOpen} onOpenChange={setChatOpen} onCommand={handleCommand} onShowOnlinePlayers={() => {}} />
      {touchscreenMode && <TouchControls onMove={handleTouchMove} onAim={handleTouchAim} onShoot={handleTouchShoot} onReload={handleTouchReload} canvasWidth={960} canvasHeight={640} />}
    </div>
  );
};
