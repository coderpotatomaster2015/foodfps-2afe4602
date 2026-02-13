import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Shield } from "lucide-react";
import { AdminChat } from "./AdminChat";
import { TouchControls } from "./TouchControls";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ArenaDeathmatchProps {
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

const KILL_LIMIT = 25;

export const ArenaDeathmatch = ({ username, onBack, adminAbuseEvents = [], touchscreenMode = false, playerSkin = "#FFF3D6" }: ArenaDeathmatchProps) => {
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
  const [gameOver, setGameOver] = useState(false);
  const [kills, setKills] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [victory, setVictory] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const adminStateRef = useRef({ active: false, godMode: false, speedMultiplier: 1, infiniteAmmo: false });
  const gameStateRef = useRef<any>({ enemies: [], pickups: [], W: 960, H: 640, mapBoundsMultiplier: 1 });
  const playerRef = useRef<any>(null);
  const spawnImmunityRef = useRef(true);
  const gameLoopRef = useRef<number | null>(null);
  const specialPowerRef = useRef<string | null>(null);
  const teleportCooldownRef = useRef(0);
  const killsRef = useRef(0);
  const touchMoveRef = useRef({ x: 0, y: 0 });
  const touchAimRef = useRef({ x: 480, y: 320 });
  const touchShootingRef = useRef(false);

  useEffect(() => {
    try {
      const customSkinData = localStorage.getItem("selectedCustomSkin");
      if (customSkinData) { const parsed = JSON.parse(customSkinData); if (parsed.specialPower) specialPowerRef.current = parsed.specialPower; }
      const equippedPower = localStorage.getItem("equippedPower");
      if (equippedPower) specialPowerRef.current = equippedPower;
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    const now = new Date();
    for (const event of adminAbuseEvents) { if (new Date(event.expires_at) > now) { if (event.event_type === "godmode") adminStateRef.current.godMode = true; else if (event.event_type === "all_weapons") setUnlockedWeapons([...WEAPON_ORDER]); } }
  }, [adminAbuseEvents]);

  useEffect(() => { checkPermissions(); loadWeapons(); }, []);

  const checkPermissions = async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) return; const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single(); if (data) { setHasPermission(true); adminStateRef.current.active = true; } };

  const loadWeapons = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setUnlockedWeapons(["pistol"]); return; }
      const { data: loadout } = await supabase.from("equipped_loadout").select("*").eq("user_id", user.id).maybeSingle();
      if (loadout) {
        const ew = [loadout.slot_1, loadout.slot_2, loadout.slot_3, loadout.slot_4, loadout.slot_5].filter(Boolean) as Weapon[];
        setUnlockedWeapons(ew.length > 0 ? ew : ["pistol"]);
        if (loadout.equipped_power) { specialPowerRef.current = loadout.equipped_power; localStorage.setItem("equippedPower", loadout.equipped_power); }
      } else { const sw = localStorage.getItem("equippedWeapons"); if (sw) { try { const p = JSON.parse(sw) as Weapon[]; setUnlockedWeapons(p.length > 0 ? p : ["pistol"]); } catch { setUnlockedWeapons(["pistol"]); } } else setUnlockedWeapons(["pistol"]); }
    } catch { setUnlockedWeapons(["pistol"]); }
  };

  const saveProgress = async (newScore: number) => { try { const { data: { user } } = await supabase.auth.getUser(); if (!user || newScore <= 0) return; const { data: cp } = await supabase.from("profiles").select("total_score").eq("user_id", user.id).single(); await supabase.from("profiles").update({ total_score: (cp?.total_score || 0) + newScore }).eq("user_id", user.id); } catch {} };

  const handleTouchMove = useCallback((dx: number, dy: number) => { touchMoveRef.current = { x: dx, y: dy }; }, []);
  const handleTouchAim = useCallback((x: number, y: number) => { touchAimRef.current = { x, y }; }, []);
  const handleTouchShoot = useCallback((shooting: boolean) => { touchShootingRef.current = shooting; }, []);
  const handleTouchReload = useCallback(() => { if (playerRef.current) { const wc = WEAPONS[playerRef.current.weapon as Weapon]; playerRef.current.ammo = wc.maxAmmo; setAmmo(wc.maxAmmo); } }, []);
  const handleCommand = useCallback((cmd: string) => { if (!hasPermission) return; if (cmd.startsWith("/godmode")) adminStateRef.current.godMode = !adminStateRef.current.godMode; else if (cmd.startsWith("/nuke")) gameStateRef.current.enemies.length = 0; }, [hasPermission]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let W = canvas.width, H = canvas.height;
    gameStateRef.current.W = W; gameStateRef.current.H = H;
    spawnImmunityRef.current = true; setSpawnImmunity(true);
    setTimeout(() => { spawnImmunityRef.current = false; setSpawnImmunity(false); }, 3000);

    let keys: Record<string, boolean> = {};
    let mouse = { x: W / 2, y: H / 2, down: false };
    const player = { x: W / 2, y: H / 2, r: 14, speed: 180, angle: 0, weapon: "pistol" as Weapon, lastShot: -1, lastMelee: -1, hp: 100, maxHp: 100, score: 0, ammo: 10, maxAmmo: 10 };
    playerRef.current = player;

    let bullets: any[] = [], enemyBullets: any[] = [], enemies: any[] = [], pickups: any[] = [], particles: any[] = [];
    let time = 0;

    gameStateRef.current.enemies = enemies; gameStateRef.current.pickups = pickups;
    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    // ARENA: Spawn bot fighters that move around and shoot
    const BOT_COLORS = ["#FF6B6B", "#6B8AFF", "#FFD700", "#FF69B4", "#00CED1"];
    const BOT_NAMES = ["Alpha", "Bravo", "Charlie", "Delta", "Echo"];
    const spawnBot = (index: number) => {
      const x = rand(50, W - 50), y = rand(50, H - 50);
      enemies.push({
        id: `bot_${index}_${Date.now()}`, x, y, r: 14,
        speed: rand(80, 140), hp: 100, maxHp: 100,
        color: BOT_COLORS[index % BOT_COLORS.length],
        stun: 0, lastHit: 0, lastShot: -1,
        botName: BOT_NAMES[index % BOT_NAMES.length],
        isBot: true, targetX: rand(50, W - 50), targetY: rand(50, H - 50),
        changeTargetTime: time + rand(2, 5),
      });
    };

    // Spawn 4 bots
    for (let i = 0; i < 4; i++) spawnBot(i);
    for (let i = 0; i < 3; i++) pickups.push({ x: rand(80, W - 80), y: rand(80, H - 80), r: 10, amt: 3, ttl: 30 });

    const spawnParticles = (x: number, y: number, color: string, count = 10) => { for (let i = 0; i < count; i++) particles.push({ x, y, vx: rand(-120, 120), vy: rand(-120, 120), life: rand(0.3, 0.9), color }); };

    const tryShoot = (t: number) => {
      const weapon = WEAPONS[player.weapon];
      if (weapon.isMelee) {
        if (mouse.down && t - player.lastMelee >= weapon.fireRate) {
          player.lastMelee = t; const meleeRange = 50;
          spawnParticles(player.x + Math.cos(player.angle) * meleeRange, player.y + Math.sin(player.angle) * meleeRange, weapon.color, 10);
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i]; const dx = e.x - player.x, dy = e.y - player.y; const dist = Math.hypot(dx, dy);
            const angleToEnemy = Math.atan2(dy, dx); const angleDiff = Math.abs(angleToEnemy - player.angle);
            if (dist <= meleeRange && angleDiff < 0.5) {
              const dmgMul = specialPowerRef.current === "double_damage" ? 2 : 1;
              e.hp -= weapon.damage * dmgMul; e.stun = 0.6; spawnParticles(e.x, e.y, weapon.color, 12);
              if (e.hp <= 0) {
                spawnParticles(e.x, e.y, e.color, 20);
                setScore(prev => { const ns = prev + 10; player.score = ns; return ns; });
                killsRef.current++; setKills(killsRef.current);
                if (killsRef.current >= KILL_LIMIT) { setVictory(true); saveProgress(score + 10); toast.success("🏆 VICTORY! You won the Arena!"); return; }
                // Respawn bot after 3s
                const botIndex = enemies.indexOf(e);
                const respawnIndex = i;
                enemies.splice(i, 1);
                setTimeout(() => { spawnBot(respawnIndex); }, 3000);
              }
            }
          }
        }
        return;
      }
      const fireRate = adminStateRef.current.godMode ? 0 : weapon.fireRate;
      const hasInfiniteAmmo = adminStateRef.current.godMode || adminStateRef.current.infiniteAmmo;
      if (mouse.down && t - player.lastShot >= fireRate && (hasInfiniteAmmo || player.ammo > 0)) {
        player.lastShot = t; if (!hasInfiniteAmmo) { player.ammo--; setAmmo(player.ammo); }
        const bulletsToFire = player.weapon === "shotgun" ? 5 : 1;
        for (let i = 0; i < bulletsToFire; i++) {
          const ang = player.angle; const spread = weapon.spread * (Math.PI / 180); const finalAngle = ang + rand(-spread, spread);
          const dmgMul = specialPowerRef.current === "double_damage" ? 2 : 1;
          bullets.push({ x: player.x + Math.cos(ang) * player.r * 1.6, y: player.y + Math.sin(ang) * player.r * 1.6, vx: Math.cos(finalAngle) * weapon.bulletSpeed, vy: Math.sin(finalAngle) * weapon.bulletSpeed, r: 8, life: 2.5, dmg: weapon.damage * dmgMul, color: weapon.color });
        }
        spawnParticles(player.x + Math.cos(player.angle) * player.r * 1.6, player.y + Math.sin(player.angle) * player.r * 1.6, weapon.color, 6);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === "r" && player.ammo < player.maxAmmo && !WEAPONS[player.weapon].isMelee) { player.ammo = player.maxAmmo; setAmmo(player.ammo); }
      if (e.key.toLowerCase() === "shift" && specialPowerRef.current === "teleport") { const now = performance.now(); if (now - teleportCooldownRef.current >= 3000) { teleportCooldownRef.current = now; player.x = Math.max(20, Math.min(W - 20, player.x + Math.cos(player.angle) * 150)); player.y = Math.max(20, Math.min(H - 20, player.y + Math.sin(player.angle) * 150)); spawnParticles(player.x, player.y, "#00FFFF", 20); } }
      if (e.key.toLowerCase() === "h") {
        try {
          const pendingPacks = JSON.parse(localStorage.getItem("pendingHealthPacks") || "[]");
          if (pendingPacks.length > 0) { if (player.hp >= 100) { toast.info("Full HP!"); } else { const pack = pendingPacks.shift(); localStorage.setItem("pendingHealthPacks", JSON.stringify(pendingPacks)); player.hp = Math.min(100, player.hp + (pack.healAmount || 25)); setHealth(player.hp); toast.success(`+${pack.healAmount || 25} HP!`); } }
          else { const eq = JSON.parse(localStorage.getItem("equippedHealthPacks") || "[]"); if (eq.length > 0 && player.hp < 100) { const pid = eq[0]; const ha: Record<string, number> = { small_health: 25, medium_health: 50, large_health: 100 }; player.hp = Math.min(100, player.hp + (ha[pid] || 25)); setHealth(player.hp); toast.success(`+${ha[pid] || 25} HP!`); (async () => { try { const { data: { user: cu } } = await supabase.auth.getUser(); if (!cu) return; const { data: inv } = await supabase.from("player_inventory").select("*").eq("user_id", cu.id).eq("item_id", pid).eq("item_type", "health_pack").maybeSingle(); if (inv) { if (inv.quantity <= 1) { await supabase.from("player_inventory").delete().eq("user_id", cu.id).eq("item_id", pid); const ue = eq.filter((id: string) => id !== pid); localStorage.setItem("equippedHealthPacks", JSON.stringify(ue)); } else { await supabase.from("player_inventory").update({ quantity: inv.quantity - 1 }).eq("user_id", cu.id).eq("item_id", pid); } } } catch {} })(); } else if (eq.length === 0) toast.error("No health packs!"); }
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

      // Victory check
      if (victory) {
        ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#FFD700"; ctx.font = "48px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("🏆 VICTORY!", W / 2, H / 2 - 20);
        ctx.fillStyle = "#fff"; ctx.font = "24px sans-serif";
        ctx.fillText(`${killsRef.current} kills | ${deaths} deaths`, W / 2, H / 2 + 30);
        ctx.restore(); gameLoopRef.current = requestAnimationFrame(loop); return;
      }

      if (player.hp <= 0 && !adminStateRef.current.godMode) {
        // ARENA: Respawn after death
        setDeaths(prev => prev + 1);
        player.hp = 100; setHealth(100);
        player.x = rand(50, W - 50); player.y = rand(50, H - 50);
        spawnImmunityRef.current = true; setSpawnImmunity(true);
        setTimeout(() => { spawnImmunityRef.current = false; setSpawnImmunity(false); }, 3000);
        toast.info("Respawning...");
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

      // Update bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) { bullets.splice(i, 1); continue; }
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j]; const edx = b.x - e.x, edy = b.y - e.y;
          if (edx * edx + edy * edy <= (b.r + e.r) * (b.r + e.r)) {
            e.hp -= b.dmg; e.stun = 0.4; spawnParticles(b.x, b.y, "#FFF3D6", 8);
            if (e.hp <= 0) {
              spawnParticles(e.x, e.y, e.color, 16);
              setScore(prev => { const ns = prev + 10; player.score = ns; return ns; });
              killsRef.current++; setKills(killsRef.current);
              if (killsRef.current >= KILL_LIMIT) { setVictory(true); saveProgress(score + 10); toast.success("🏆 VICTORY!"); }
              const idx = j;
              enemies.splice(j, 1);
              setTimeout(() => { spawnBot(idx); }, 3000);
            }
            bullets.splice(i, 1); break;
          }
        }
      }

      // Update enemy (bot) bullets
      const isImmune = spawnImmunityRef.current;
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) { enemyBullets.splice(i, 1); continue; }
        const bx = b.x - player.x, by = b.y - player.y;
        if (bx * bx + by * by <= (b.r + player.r) * (b.r + player.r)) {
          if (!adminStateRef.current.godMode && !isImmune) { player.hp -= b.dmg; setHealth(Math.max(0, player.hp)); spawnParticles(b.x, b.y, "#FF6B6B", 8); }
          enemyBullets.splice(i, 1);
        }
      }

      // ARENA: Bots move to random targets and shoot at player
      for (const e of enemies) {
        if (e.stun > 0) { e.stun = Math.max(0, e.stun - dt); continue; }
        // Move toward target point
        if (time > e.changeTargetTime) { e.targetX = rand(50, W - 50); e.targetY = rand(50, H - 50); e.changeTargetTime = time + rand(2, 5); }
        const tvx = e.targetX - e.x, tvy = e.targetY - e.y; const td = Math.hypot(tvx, tvy);
        if (td > 10) { e.x += (tvx / td) * e.speed * dt; e.y += (tvy / td) * e.speed * dt; }
        // Shoot at player
        const dist = Math.hypot(player.x - e.x, player.y - e.y);
        if (dist < 400 && time - e.lastShot >= 1.5) {
          e.lastShot = time;
          const ang = Math.atan2(player.y - e.y, player.x - e.x) + rand(-0.15, 0.15);
          enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 280, vy: Math.sin(ang) * 280, r: 6, life: 2.5, dmg: 12, color: e.color });
        }
      }

      // Pickups
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i]; p.ttl -= dt; if (p.ttl <= 0) { pickups.splice(i, 1); pickups.push({ x: rand(80, W - 80), y: rand(80, H - 80), r: 10, amt: 3, ttl: 30 }); continue; }
        if ((player.x - p.x) ** 2 + (player.y - p.y) ** 2 <= (player.r + p.r) ** 2) { if (!WEAPONS[player.weapon].isMelee) { player.ammo = Math.min(player.maxAmmo, player.ammo + p.amt); setAmmo(player.ammo); } spawnParticles(p.x, p.y, "#A6FFB3", 10); pickups.splice(i, 1); pickups.push({ x: rand(80, W - 80), y: rand(80, H - 80), r: 10, amt: 3, ttl: 30 }); }
      }
      for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.vy *= 0.98; p.life -= dt; if (p.life <= 0) particles.splice(i, 1); }

      gameStateRef.current.enemies = enemies; gameStateRef.current.pickups = pickups;

      // === DRAW ===
      ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = 0.06; ctx.strokeStyle = "#1b3444";
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();

      // Kill progress
      ctx.save(); ctx.fillStyle = "#FFD700"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`⚔️ ARENA DEATHMATCH - ${killsRef.current}/${KILL_LIMIT} kills`, W / 2, 28); ctx.restore();

      for (const p of pickups) { ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = "#A6FFB3"; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#073"; ctx.font = "10px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("+" + p.amt, 0, 0); ctx.restore(); }
      for (const b of bullets) { ctx.save(); ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      for (const b of enemyBullets) { ctx.save(); ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      // Draw bots with names
      for (const e of enemies) {
        ctx.save(); ctx.translate(e.x, e.y); ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill();
        // HP bar
        const hpW = 28; ctx.fillStyle = "#333"; ctx.fillRect(-hpW / 2, -e.r - 18, hpW, 4); ctx.fillStyle = e.color; ctx.fillRect(-hpW / 2, -e.r - 18, hpW * Math.max(0, e.hp / (e.maxHp || 100)), 4);
        // Name
        ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"; ctx.fillText(e.botName || "Bot", 0, -e.r - 22);
        // Eye
        const ang = Math.atan2(player.y - e.y, player.x - e.x);
        ctx.rotate(ang); ctx.fillStyle = "#2b2b2b"; ctx.beginPath(); ctx.arc(e.r * 0.45, -4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#FFB84D"; ctx.fillRect(e.r - 2, -5, 14, 10);
        ctx.restore();
      }
      // Player
      ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(player.x, player.y + player.r * 0.8, player.r * 1.1, player.r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle);
      if (isImmune) { ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, player.r + 5, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = playerSkin; ctx.beginPath(); ctx.arc(0, 0, player.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2b2b2b"; ctx.beginPath(); ctx.arc(player.r * 0.45, -4, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = WEAPONS[player.weapon].color;
      if (WEAPONS[player.weapon].isMelee) ctx.fillRect(player.r - 2, -3, 25, 6); else ctx.fillRect(player.r - 2, -6, 18, 12);
      ctx.restore();
      // Username
      ctx.save(); ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.fillText(username, player.x, player.y - player.r - 10); ctx.restore();

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
        <div className="font-bold text-lg">⚔️ Arena Deathmatch</div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>First to {KILL_LIMIT} kills wins!</div>
          <div><span className="text-primary font-mono">WASD</span> move</div>
          <div><span className="text-primary font-mono">LMB</span> shoot</div>
          <div><span className="text-primary font-mono">R</span> reload</div>
          <div><span className="text-primary font-mono">1-{unlockedWeapons.length}</span> weapons</div>
        </div>
      </div>
      <div className="fixed right-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-3 min-w-[180px]">
        <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Health</span><span className="font-bold text-lg">{Math.round(health)}</span></div>
        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden"><div className="bg-gradient-to-r from-red-500 to-green-500 h-full transition-all duration-300" style={{ width: `${(health / maxHealth) * 100}%` }} /></div>
        {spawnImmunity && <div className="flex items-center gap-2 text-yellow-500 text-sm"><Shield className="w-4 h-4" /><span>Spawn Protection</span></div>}
        <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Kills</span><span className="font-bold text-lg text-yellow-500">{kills}/{KILL_LIMIT}</span></div>
        <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Deaths</span><span className="font-bold">{deaths}</span></div>
        <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Weapon</span><span className="font-bold" style={{ color: WEAPONS[currentWeapon].color }}>{WEAPONS[currentWeapon].name}</span></div>
        {!WEAPONS[currentWeapon].isMelee && (<><div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Ammo</span><span className="font-bold">{ammo}/{maxAmmo}</span></div></>)}
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
