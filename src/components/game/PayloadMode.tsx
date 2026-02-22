import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Shield } from "lucide-react";
import { AdminChat } from "./AdminChat";
import { TouchControls } from "./TouchControls";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PayloadModeProps {
  username: string;
  onBack: () => void;
  adminAbuseEvents?: { event_type: string; expires_at: string }[];
  touchscreenMode?: boolean;
  playerSkin?: string;
}

type Weapon = "pistol" | "shotgun" | "minigun" | "sniper" | "sword" | "knife" | "axe" | "rifle" | "smg" | "rpg" | "flamethrower" | "railgun" | "crossbow" | "laser_pistol" | "grenade_launcher" | "katana" | "dual_pistols" | "plasma_rifle" | "boomerang" | "whip" | "freeze_ray" | "harpoon_gun";
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
const WEAPON_ORDER: Weapon[] = ["pistol","shotgun","sword","rifle","sniper","smg","knife","rpg","axe","flamethrower","minigun","railgun","crossbow","laser_pistol","grenade_launcher","katana","dual_pistols","plasma_rifle","boomerang","whip","freeze_ray","harpoon_gun"];

export const PayloadMode = ({ username, onBack, adminAbuseEvents = [], touchscreenMode = false, playerSkin = "#FFF3D6" }: PayloadModeProps) => {
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
  const [payloadProgress, setPayloadProgress] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);

  const adminStateRef = useRef({ active: false, godMode: false, speedMultiplier: 1, infiniteAmmo: false });
  const gameStateRef = useRef<any>({ enemies: [], pickups: [], W: 960, H: 640 });
  const playerRef = useRef<any>(null);
  const spawnImmunityRef = useRef(true);
  const gameLoopRef = useRef<number | null>(null);
  const touchMoveRef = useRef({ x: 0, y: 0 });
  const touchAimRef = useRef({ x: 480, y: 320 });
  const touchShootingRef = useRef(false);

  useEffect(() => { checkPermissions(); loadUserProgress(); }, []);
  useEffect(() => {
    const now = new Date();
    for (const event of adminAbuseEvents) {
      if (new Date(event.expires_at) > now) {
        if (event.event_type === "godmode") adminStateRef.current.godMode = true;
        else if (event.event_type === "all_weapons") setUnlockedWeapons([...WEAPON_ORDER]);
      }
    }
  }, [adminAbuseEvents]);

  const checkPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
    if (roleData) { setHasPermission(true); adminStateRef.current.active = true; return; }
    const { data: permData } = await supabase.from("chat_permissions").select("can_use_commands").eq("user_id", user.id).single();
    if (permData?.can_use_commands) { setHasPermission(true); adminStateRef.current.active = true; }
  };

  const loadUserProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setUnlockedWeapons(["pistol"]); return; }
      const { data: loadout } = await supabase.from("equipped_loadout").select("*").eq("user_id", user.id).maybeSingle();
      if (loadout) {
        const equipped = [loadout.slot_1, loadout.slot_2, loadout.slot_3, loadout.slot_4, loadout.slot_5].filter(Boolean) as Weapon[];
        setUnlockedWeapons(equipped.length > 0 ? equipped : ["pistol"]);
      }
    } catch { setUnlockedWeapons(["pistol"]); }
  };

  const saveProgress = async (newScore: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || newScore <= 0) return;
      const { data: currentProfile } = await supabase.from("profiles").select("total_score").eq("user_id", user.id).single();
      const currentTotal = currentProfile?.total_score || 0;
      await supabase.from("profiles").update({ total_score: currentTotal + newScore }).eq("user_id", user.id);
    } catch (error) { console.error("Error saving progress:", error); }
  };

  const revivePlayer = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.hp = 100; setHealth(100); setGameOver(false);
      spawnImmunityRef.current = true; setSpawnImmunity(true);
      setTimeout(() => { spawnImmunityRef.current = false; setSpawnImmunity(false); }, 5000);
      toast.success("Player revived!");
    }
  }, []);

  const handleCommand = useCallback((cmd: string) => {
    if (!hasPermission && !adminStateRef.current.active) return;
    if (cmd.startsWith("/godmode")) { adminStateRef.current.godMode = !adminStateRef.current.godMode; if (adminStateRef.current.godMode && playerRef.current) { playerRef.current.hp = 100; playerRef.current.ammo = 999; setHealth(100); setAmmo(999); setMaxAmmo(999); } }
    else if (cmd.startsWith("/nuke")) { gameStateRef.current.enemies.length = 0; }
    else if (cmd.startsWith("/revive")) { revivePlayer(); }
    else if (cmd.startsWith("/give")) { setUnlockedWeapons([...WEAPON_ORDER]); toast.success("All weapons unlocked!"); }
    else if (cmd.startsWith("/heal")) { if (playerRef.current) { playerRef.current.hp = Math.min(100, playerRef.current.hp + 100); setHealth(playerRef.current.hp); } }
    else if (cmd.startsWith("/infiniteammo")) { adminStateRef.current.infiniteAmmo = !adminStateRef.current.infiniteAmmo; }
  }, [hasPermission, revivePlayer]);

  const handleTouchMove = useCallback((dx: number, dy: number) => { touchMoveRef.current = { x: dx, y: dy }; }, []);
  const handleTouchAim = useCallback((x: number, y: number) => { touchAimRef.current = { x, y }; }, []);
  const handleTouchShoot = useCallback((shooting: boolean) => { touchShootingRef.current = shooting; }, []);
  const handleTouchReload = useCallback(() => { if (playerRef.current) { const wc = WEAPONS[playerRef.current.weapon as Weapon]; playerRef.current.ammo = wc.maxAmmo; setAmmo(wc.maxAmmo); } }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    gameStateRef.current.W = W; gameStateRef.current.H = H;
    spawnImmunityRef.current = true; setSpawnImmunity(true);
    setTimeout(() => { spawnImmunityRef.current = false; setSpawnImmunity(false); }, 5000);

    let keys: Record<string, boolean> = {};
    let mouse = { x: W / 2, y: H / 2, down: false };
    const player = { x: W / 2, y: H / 2, r: 14, speed: 180, angle: 0, weapon: "pistol" as Weapon, lastShot: -1, lastMelee: -1, hp: 100, maxHp: 100, score: 0, ammo: 10, maxAmmo: 10 };
    playerRef.current = player;

    let bullets: any[] = [], enemyBullets: any[] = [], enemies: any[] = [], pickups: any[] = [], particles: any[] = [];
    let time = 0, lastSpawn = 0, enemySpawnInterval = 1.8;
    let payloadX = 80, payloadY = H / 2;
    const payloadTarget = W - 80;
    let payloadHp = 200;
    const payloadMaxHp = 200;
    let modeWon = false;
    let last = performance.now();
    gameStateRef.current.enemies = enemies; gameStateRef.current.pickups = pickups;
    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    const spawnEnemy = () => {
      const side = Math.floor(rand(0, 4));
      let x, y;
      if (side === 0) { x = rand(50, W - 50); y = -30; }
      else if (side === 1) { x = rand(50, W - 50); y = H + 30; }
      else if (side === 2) { x = -30; y = rand(50, H - 50); }
      else { x = W + 30; y = rand(50, H - 50); }
      enemies.push({ id: `e_${Date.now()}_${Math.random().toString(36).substr(2,6)}`, x, y, r: 16, speed: rand(50, 90), hp: 70, maxHp: 70, color: "#D946EF", stun: 0, lastShot: -1 });
    };
    const spawnPickup = () => { pickups.push({ x: rand(80, W - 80), y: rand(80, H - 80), r: 10, amt: 3, ttl: 20 }); };
    const spawnParticles = (x: number, y: number, color: string, count = 10) => { for (let i = 0; i < count; i++) particles.push({ x, y, vx: rand(-120, 120), vy: rand(-120, 120), life: rand(0.3, 0.9), color }); };

    const tryShoot = (t: number) => {
      const weapon = WEAPONS[player.weapon];
      if (weapon.isMelee) {
        if (mouse.down && t - player.lastMelee >= weapon.fireRate) {
          player.lastMelee = t;
          spawnParticles(player.x + Math.cos(player.angle) * 50, player.y + Math.sin(player.angle) * 50, weapon.color, 10);
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i], dx = e.x - player.x, dy = e.y - player.y, dist = Math.hypot(dx, dy);
            if (dist <= 50 && Math.abs(Math.atan2(dy, dx) - player.angle) < 0.5) {
              e.hp -= weapon.damage; e.stun = 0.6; spawnParticles(e.x, e.y, weapon.color, 12);
              if (e.hp <= 0) { spawnParticles(e.x, e.y, e.color, 20); setScore(p => { const ns = p + 10; player.score = ns; return ns; }); setKills(p => p + 1); if (Math.random() < 0.35) pickups.push({ x: e.x, y: e.y, r: 10, amt: 3, ttl: 18 }); enemies.splice(i, 1); }
            }
          }
        }
        return;
      }
      const fireRate = adminStateRef.current.godMode ? 0 : weapon.fireRate;
      const hasInfinite = adminStateRef.current.godMode || adminStateRef.current.infiniteAmmo;
      if (mouse.down && t - player.lastShot >= fireRate && (hasInfinite || player.ammo > 0)) {
        player.lastShot = t;
        if (!hasInfinite) { player.ammo--; setAmmo(player.ammo); }
        const count = player.weapon === "shotgun" ? 5 : 1;
        for (let i = 0; i < count; i++) {
          const spread = weapon.spread * (Math.PI / 180);
          const ang = player.angle + rand(-spread, spread);
          bullets.push({ x: player.x + Math.cos(player.angle) * player.r * 1.6, y: player.y + Math.sin(player.angle) * player.r * 1.6, vx: Math.cos(ang) * weapon.bulletSpeed, vy: Math.sin(ang) * weapon.bulletSpeed, r: player.weapon === "sniper" ? 6 : 8, life: 2.5, dmg: weapon.damage, color: weapon.color });
        }
        spawnParticles(player.x + Math.cos(player.angle) * player.r * 1.6, player.y + Math.sin(player.angle) * player.r * 1.6, weapon.color, 6);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === "r" && player.ammo < player.maxAmmo && !WEAPONS[player.weapon].isMelee) { player.ammo = player.maxAmmo; setAmmo(player.ammo); }
      const keyNum = parseInt(e.key);
      if (keyNum >= 1 && keyNum <= unlockedWeapons.length) { const w = unlockedWeapons[keyNum - 1]; if (w) { player.weapon = w; const wc = WEAPONS[w]; player.ammo = wc.ammo; player.maxAmmo = wc.maxAmmo; setCurrentWeapon(w); setAmmo(player.ammo); setMaxAmmo(player.maxAmmo); } }
    };
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
        ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#D946EF"; ctx.font = "bold 48px sans-serif"; ctx.textAlign = "center"; ctx.fillText("PAYLOAD LOST", W / 2, H / 2 - 30);
        ctx.fillStyle = "#fff"; ctx.font = "24px sans-serif"; ctx.fillText(`Score: ${score} • Kills: ${kills}`, W / 2, H / 2 + 20);
        ctx.font = "14px sans-serif"; ctx.fillStyle = "#aaa"; ctx.fillText("Use /revive or press Back to Menu", W / 2, H / 2 + 60);
        gameLoopRef.current = requestAnimationFrame(loop); return;
      }

      // Payload destroyed
      if (payloadHp <= 0 && !modeWon) {
        if (!gameOver) { setGameOver(true); saveProgress(score); toast.error("💥 The payload was destroyed!"); }
        ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#EF4444"; ctx.font = "bold 48px sans-serif"; ctx.textAlign = "center"; ctx.fillText("PAYLOAD DESTROYED", W / 2, H / 2 - 30);
        ctx.fillStyle = "#fff"; ctx.font = "24px sans-serif"; ctx.fillText(`Score: ${score} • Kills: ${kills}`, W / 2, H / 2 + 20);
        gameLoopRef.current = requestAnimationFrame(loop); return;
      }

      let dx = 0, dy = 0;
      if (touchscreenMode) { dx = touchMoveRef.current.x; dy = touchMoveRef.current.y; mouse.x = touchAimRef.current.x; mouse.y = touchAimRef.current.y; mouse.down = touchShootingRef.current; }
      else { if (keys["w"] || keys["arrowup"]) dy -= 1; if (keys["s"] || keys["arrowdown"]) dy += 1; if (keys["a"] || keys["arrowleft"]) dx -= 1; if (keys["d"] || keys["arrowright"]) dx += 1; }
      player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
      if (dx !== 0 || dy !== 0) { const len = Math.hypot(dx, dy); dx /= len; dy /= len; const spd = player.speed * adminStateRef.current.speedMultiplier; player.x = Math.max(20, Math.min(W - 20, player.x + dx * spd * dt)); player.y = Math.max(20, Math.min(H - 20, player.y + dy * spd * dt)); }

      tryShoot(time);

      // Payload moves when player is nearby
      const distToPayload = Math.hypot(player.x - payloadX, player.y - payloadY);
      if (distToPayload < 80 && !modeWon) {
        payloadX += 30 * dt;
        if (payloadX >= payloadTarget) { modeWon = true; saveProgress(score + 200); toast.success("🏆 Payload delivered! +200 bonus score!"); setScore(p => p + 200); }
        setPayloadProgress(Math.min(100, ((payloadX - 80) / (payloadTarget - 80)) * 100));
      }

      // Bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) { bullets.splice(i, 1); continue; }
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 <= (b.r + e.r) ** 2) {
            e.hp -= b.dmg; e.stun = 0.6; spawnParticles(b.x, b.y, "#FFF3D6", 8);
            if (e.hp <= 0) { spawnParticles(e.x, e.y, e.color, 16); setScore(p => { const ns = p + 10; player.score = ns; return ns; }); setKills(p => p + 1); if (Math.random() < 0.35) pickups.push({ x: e.x, y: e.y, r: 10, amt: 3, ttl: 18 }); enemies.splice(j, 1); }
            bullets.splice(i, 1); break;
          }
        }
      }

      // Enemy bullets
      const isImmune = spawnImmunityRef.current;
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) { enemyBullets.splice(i, 1); continue; }
        if ((b.x - player.x) ** 2 + (b.y - player.y) ** 2 <= (b.r + player.r) ** 2) {
          if (!adminStateRef.current.godMode && !isImmune) { player.hp -= b.dmg; setHealth(Math.max(0, player.hp)); spawnParticles(b.x, b.y, "#FF6B6B", 8); }
          enemyBullets.splice(i, 1);
        }
      }

      // Enemies - some target payload, some target player
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.stun > 0) { e.stun -= dt; continue; }
        // 60% target payload, 40% target player
        const targetX = (i % 5 < 3) ? payloadX : player.x;
        const targetY = (i % 5 < 3) ? payloadY : player.y;
        const vx = targetX - e.x, vy = targetY - e.y, d = Math.hypot(vx, vy);
        if (d > 0) { e.x += (vx / d) * e.speed * dt; e.y += (vy / d) * e.speed * dt; }
        // Damage player on contact
        const dpPlayer = Math.hypot(player.x - e.x, player.y - e.y);
        if (dpPlayer < player.r + e.r && !adminStateRef.current.godMode && !isImmune) { player.hp -= 5 * dt; setHealth(Math.max(0, player.hp)); }
        // Damage payload on contact
        const dpPayload = Math.hypot(payloadX - e.x, payloadY - e.y);
        if (dpPayload < 25 + e.r) { payloadHp -= 8 * dt; }
        // Shoot at player
        if (dpPlayer < 350 && time - e.lastShot >= 3.5) {
          e.lastShot = time;
          const ang = Math.atan2(player.y - e.y, player.x - e.x);
          enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, r: 6, life: 3, dmg: 10, color: "#FF44FF" });
        }
      }

      // Pickups
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i]; p.ttl -= dt;
        if (p.ttl <= 0) { pickups.splice(i, 1); continue; }
        if ((player.x - p.x) ** 2 + (player.y - p.y) ** 2 <= (player.r + p.r) ** 2) {
          if (!WEAPONS[player.weapon].isMelee) { player.ammo = Math.min(player.maxAmmo, player.ammo + p.amt); setAmmo(player.ammo); }
          spawnParticles(p.x, p.y, "#A6FFB3", 10); pickups.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.vy *= 0.98; p.life -= dt; if (p.life <= 0) particles.splice(i, 1); }

      if (!modeWon && time - lastSpawn > enemySpawnInterval) { lastSpawn = time; spawnEnemy(); if (enemySpawnInterval > 0.8) enemySpawnInterval *= 0.995; }

      // ===== DRAW =====
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#120520"); bg.addColorStop(1, "#1a0830");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.save(); ctx.globalAlpha = 0.06; ctx.strokeStyle = "#D946EF";
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();

      // Payload track (rail line)
      ctx.save(); ctx.strokeStyle = "#D946EF44"; ctx.lineWidth = 4; ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(80, H / 2); ctx.lineTo(payloadTarget, H / 2); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();

      // Payload
      ctx.save();
      ctx.fillStyle = modeWon ? "#22C55E" : "#D946EF";
      ctx.shadowColor = "#D946EF"; ctx.shadowBlur = 20;
      ctx.fillRect(payloadX - 20, payloadY - 15, 40, 30);
      ctx.shadowBlur = 0;
      // Payload HP bar
      ctx.fillStyle = "#333"; ctx.fillRect(payloadX - 25, payloadY - 25, 50, 6);
      ctx.fillStyle = payloadHp > 100 ? "#22C55E" : payloadHp > 50 ? "#EAB308" : "#EF4444";
      ctx.fillRect(payloadX - 25, payloadY - 25, 50 * (payloadHp / payloadMaxHp), 6);
      ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"; ctx.fillText("📦", payloadX, payloadY + 4);
      ctx.restore();

      // Destination marker
      ctx.save(); ctx.fillStyle = "#22C55E33"; ctx.beginPath(); ctx.arc(payloadTarget, H / 2, 25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#22C55E"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center"; ctx.fillText("🏁", payloadTarget, H / 2 + 5); ctx.restore();

      // Progress bar on canvas
      ctx.save();
      ctx.fillStyle = "rgba(217,70,239,0.2)"; ctx.fillRect(W / 2 - 120, 8, 240, 30);
      ctx.strokeStyle = "#D946EF"; ctx.lineWidth = 1; ctx.strokeRect(W / 2 - 120, 8, 240, 30);
      ctx.fillStyle = "#D946EF"; ctx.fillRect(W / 2 - 118, 10, 236 * ((payloadX - 80) / (payloadTarget - 80)), 26);
      ctx.fillStyle = "#fff"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(modeWon ? "🏆 DELIVERED!" : `📦 Payload: ${Math.round(payloadProgress)}%`, W / 2, 28);
      ctx.restore();

      // Pickups
      for (const p of pickups) { ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = "#A6FFB3"; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#073"; ctx.font = "10px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("+" + p.amt, 0, 0); ctx.restore(); }
      for (const b of bullets) { ctx.save(); ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      for (const b of enemyBullets) { ctx.save(); ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      for (const e of enemies) { ctx.save(); ctx.translate(e.x, e.y); ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill(); const hpW = 28; ctx.fillStyle = "#333"; ctx.fillRect(-hpW / 2, -e.r - 12, hpW, 6); ctx.fillStyle = "#D946EF"; ctx.fillRect(-hpW / 2, -e.r - 12, hpW * Math.max(0, e.hp / e.maxHp), 6); ctx.restore(); }

      // Player
      ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(player.x, player.y + player.r * 0.8, player.r * 1.1, player.r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle);
      if (isImmune) { ctx.strokeStyle = "#D946EF"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, player.r + 5, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = playerSkin; ctx.beginPath(); ctx.arc(0, 0, player.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2b2b2b"; ctx.beginPath(); ctx.arc(player.r * 0.45, -4, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = WEAPONS[player.weapon].color;
      if (WEAPONS[player.weapon].isMelee) ctx.fillRect(player.r - 2, -3, 25, 6); else ctx.fillRect(player.r - 2, -6, 18, 12);
      ctx.restore();

      for (const p of particles) { ctx.save(); ctx.globalAlpha = Math.max(0, p.life / 0.9); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); ctx.restore(); }
      ctx.save(); ctx.strokeStyle = "#D946EF"; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mouse.x - 10, mouse.y); ctx.lineTo(mouse.x + 10, mouse.y); ctx.moveTo(mouse.x, mouse.y - 10); ctx.lineTo(mouse.x, mouse.y + 10); ctx.stroke(); ctx.restore();

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    for (let i = 0; i < 3; i++) spawnEnemy();
    for (let i = 0; i < 2; i++) spawnPickup();
    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousemove", handleMouseMove); canvas.removeEventListener("mousedown", handleMouseDown); canvas.removeEventListener("mouseup", handleMouseUp);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [unlockedWeapons, playerSkin, touchscreenMode]);

  return (
    <div className="relative">
      <div className="fixed left-4 top-4 bg-card/80 backdrop-blur-sm border border-purple-500/30 rounded-lg p-4 space-y-2">
        <div className="font-bold text-lg text-purple-400">📦 Payload</div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div><span className="text-purple-400 font-mono">WASD</span> move</div>
          <div><span className="text-purple-400 font-mono">Mouse</span> aim</div>
          <div><span className="text-purple-400 font-mono">LMB</span> shoot</div>
          {!WEAPONS[currentWeapon].isMelee && <div><span className="text-purple-400 font-mono">R</span> reload</div>}
          <div><span className="text-purple-400 font-mono">1-{unlockedWeapons.length}</span> weapons</div>
          <div className="text-purple-300 text-xs mt-2">Stay near the payload to push it!</div>
        </div>
      </div>

      <div className="fixed right-4 top-4 bg-card/80 backdrop-blur-sm border border-purple-500/30 rounded-lg p-4 space-y-3 min-w-[180px]">
        <div className="text-center text-purple-400 font-bold">Payload: {Math.round(payloadProgress)}%</div>
        <div className="w-full bg-secondary rounded-full h-2"><div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${payloadProgress}%` }} /></div>
        <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Health</span><span className="font-bold text-lg">{Math.round(health)}</span></div>
        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden"><div className="bg-gradient-to-r from-red-500 to-purple-400 h-full transition-all duration-300" style={{ width: `${(health / maxHealth) * 100}%` }} /></div>
        {spawnImmunity && <div className="flex items-center gap-2 text-purple-400 text-sm"><Shield className="w-4 h-4" /><span>Spawn Protection</span></div>}
        <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Weapon</span><span className="font-bold" style={{ color: WEAPONS[currentWeapon].color }}>{WEAPONS[currentWeapon].name}</span></div>
        {!WEAPONS[currentWeapon].isMelee && (
          <>
            <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Ammo</span><span className="font-bold text-lg">{ammo}/{maxAmmo}</span></div>
            <div className="w-full bg-secondary rounded-full h-2"><div className="bg-purple-400 h-full rounded-full transition-all" style={{ width: `${(ammo / maxAmmo) * 100}%` }} /></div>
          </>
        )}
        <div className="pt-2 border-t border-purple-500/20">
          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Score</span><span className="font-bold text-lg text-purple-400">{score}</span></div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>Kills: {kills}</span></div>
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border border-purple-500/30 rounded-lg p-2 flex gap-2">
        {unlockedWeapons.map((weapon, index) => (
          <div key={weapon} className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${currentWeapon === weapon ? "bg-purple-500 text-white ring-2 ring-purple-400" : "bg-secondary hover:bg-secondary/80"}`}
            onClick={() => { if (playerRef.current) { playerRef.current.weapon = weapon; const wc = WEAPONS[weapon]; playerRef.current.ammo = wc.ammo; playerRef.current.maxAmmo = wc.maxAmmo; setCurrentWeapon(weapon); setAmmo(wc.ammo); setMaxAmmo(wc.maxAmmo); } }}>
            <span className="text-xs opacity-70">{index + 1}</span>
            <span className="text-xs font-medium text-center">{WEAPONS[weapon].name}</span>
          </div>
        ))}
      </div>

      <canvas ref={canvasRef} width={960} height={640} className="border-2 border-purple-500/30 rounded-lg shadow-2xl" />
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={() => { if (score > 0) saveProgress(score); onBack(); }}><ArrowLeft className="w-4 h-4 mr-2" />Back to Menu</Button>
        <Button variant="outline" onClick={() => setChatOpen(!chatOpen)}><MessageSquare className="w-4 h-4 mr-2" />Console</Button>
      </div>
      <AdminChat open={chatOpen} onOpenChange={setChatOpen} onCommand={handleCommand} onShowOnlinePlayers={() => {}} />
      {touchscreenMode && <TouchControls onMove={handleTouchMove} onAim={handleTouchAim} onShoot={handleTouchShoot} onReload={handleTouchReload} canvasWidth={960} canvasHeight={640} />}
    </div>
  );
};
