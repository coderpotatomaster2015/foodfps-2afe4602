import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Shield } from "lucide-react";
import { AdminChat } from "./AdminChat";
import { TouchControls } from "./TouchControls";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SurvivalModeProps {
  username: string;
  onBack: () => void;
  adminAbuseEvents?: { event_type: string; expires_at: string }[];
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

export const SurvivalMode = ({ username, onBack, adminAbuseEvents = [], touchscreenMode = false, playerSkin = "#FFF3D6" }: SurvivalModeProps) => {
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
  const [wave, setWave] = useState(1);
  const [hasPermission, setHasPermission] = useState(false);

  const adminStateRef = useRef({ active: false, godMode: false, speedMultiplier: 1, infiniteAmmo: false });
  const gameStateRef = useRef<any>({ enemies: [], pickups: [], W: 960, H: 640, mapBoundsMultiplier: 1 });
  const playerRef = useRef<any>(null);
  const spawnImmunityRef = useRef(true);
  const gameLoopRef = useRef<number | null>(null);
  const specialPowerRef = useRef<string | null>(null);
  const teleportCooldownRef = useRef(0);
  const waveRef = useRef(1);

  const touchMoveRef = useRef({ x: 0, y: 0 });
  const touchAimRef = useRef({ x: 480, y: 320 });
  const touchShootingRef = useRef(false);

  // Load special power
  useEffect(() => {
    try {
      const customSkinData = localStorage.getItem("selectedCustomSkin");
      if (customSkinData) {
        const parsed = JSON.parse(customSkinData);
        if (parsed.specialPower) specialPowerRef.current = parsed.specialPower;
      }
      const equippedPower = localStorage.getItem("equippedPower");
      if (equippedPower) specialPowerRef.current = equippedPower;
      if (specialPowerRef.current === "shield" && playerRef.current) {
        playerRef.current.hp = 125;
        playerRef.current.maxHp = 125;
        setHealth(125);
      }
    } catch (e) { console.error("Error loading special power:", e); }
  }, []);

  // Apply admin abuse events
  useEffect(() => {
    const now = new Date();
    for (const event of adminAbuseEvents) {
      if (new Date(event.expires_at) > now) {
        if (event.event_type === "godmode") adminStateRef.current.godMode = true;
        else if (event.event_type === "all_weapons") setUnlockedWeapons([...WEAPON_ORDER]);
      }
    }
  }, [adminAbuseEvents]);

  useEffect(() => { checkPermissions(); loadWeapons(); }, []);

  const checkPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
    if (roleData) { setHasPermission(true); adminStateRef.current.active = true; return; }
    const { data: permData } = await supabase.from("chat_permissions").select("can_use_commands").eq("user_id", user.id).single();
    if (permData?.can_use_commands) { setHasPermission(true); adminStateRef.current.active = true; }
  };

  const loadWeapons = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setUnlockedWeapons(["pistol"]); return; }
      const { data: loadout } = await supabase.from("equipped_loadout").select("*").eq("user_id", user.id).maybeSingle();
      if (loadout) {
        const equippedWeapons = [loadout.slot_1, loadout.slot_2, loadout.slot_3, loadout.slot_4, loadout.slot_5].filter(Boolean) as Weapon[];
        setUnlockedWeapons(equippedWeapons.length > 0 ? equippedWeapons : ["pistol"]);
        if (loadout.equipped_power) { specialPowerRef.current = loadout.equipped_power; localStorage.setItem("equippedPower", loadout.equipped_power); }
      } else {
        const savedWeapons = localStorage.getItem("equippedWeapons");
        if (savedWeapons) { try { const parsed = JSON.parse(savedWeapons) as Weapon[]; setUnlockedWeapons(parsed.length > 0 ? parsed : ["pistol"]); } catch { setUnlockedWeapons(["pistol"]); } }
        else setUnlockedWeapons(["pistol"]);
      }
    } catch (error) { console.error("Error loading weapons:", error); setUnlockedWeapons(["pistol"]); }
  };

  const saveProgress = async (newScore: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || newScore <= 0) return;
      const { data: currentProfile } = await supabase.from("profiles").select("total_score").eq("user_id", user.id).single();
      const currentTotal = currentProfile?.total_score || 0;
      const newTotal = currentTotal + newScore;
      await supabase.from("profiles").update({ total_score: newTotal }).eq("user_id", user.id);
    } catch (error) { console.error("Error saving progress:", error); }
  };

  const addCurrency = async (coins: number, gems: number, gold: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.rpc("add_player_currency", { _user_id: user.id, _coins: coins, _gems: gems, _gold: gold });
  };

  const handleTouchMove = useCallback((dx: number, dy: number) => { touchMoveRef.current = { x: dx, y: dy }; }, []);
  const handleTouchAim = useCallback((x: number, y: number) => { touchAimRef.current = { x, y }; }, []);
  const handleTouchShoot = useCallback((shooting: boolean) => { touchShootingRef.current = shooting; }, []);
  const handleTouchReload = useCallback(() => {
    if (playerRef.current) { const weaponConfig = WEAPONS[playerRef.current.weapon as Weapon]; playerRef.current.ammo = weaponConfig.maxAmmo; setAmmo(weaponConfig.maxAmmo); }
  }, []);

  const handleCommand = useCallback((cmd: string) => {
    if (!hasPermission && !adminStateRef.current.active) return;
    if (cmd.startsWith("/godmode")) { adminStateRef.current.godMode = !adminStateRef.current.godMode; if (adminStateRef.current.godMode && playerRef.current) { playerRef.current.hp = 100; playerRef.current.ammo = 999; setHealth(100); setAmmo(999); } }
    else if (cmd.startsWith("/nuke")) { gameStateRef.current.enemies.length = 0; }
    else if (cmd.startsWith("/heal")) { if (playerRef.current) { playerRef.current.hp = Math.min(100, playerRef.current.hp + 100); setHealth(playerRef.current.hp); } }
  }, [hasPermission]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = canvas.width;
    let H = canvas.height;
    gameStateRef.current.W = W;
    gameStateRef.current.H = H;

    spawnImmunityRef.current = true;
    setSpawnImmunity(true);
    setTimeout(() => { spawnImmunityRef.current = false; setSpawnImmunity(false); }, 5000);

    let keys: Record<string, boolean> = {};
    let mouse = { x: W / 2, y: H / 2, down: false };

    const player = {
      x: W / 2, y: H / 2, r: 14, speed: 180, angle: 0,
      weapon: "pistol" as Weapon, lastShot: -1, lastMelee: -1,
      hp: 100, maxHp: 100, score: 0, ammo: 10, maxAmmo: 10,
    };
    playerRef.current = player;

    let bullets: any[] = [];
    let enemyBullets: any[] = [];
    let enemies: any[] = [];
    let pickups: any[] = [];
    let particles: any[] = [];
    let time = 0;
    let lastSpawn = 0;
    // SURVIVAL: faster spawning, gets faster each wave
    let enemySpawnInterval = 1.5;
    let waveEnemiesKilled = 0;
    let waveEnemiesNeeded = 10;

    gameStateRef.current.enemies = enemies;
    gameStateRef.current.pickups = pickups;

    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    const expandMap = () => { gameStateRef.current.mapBoundsMultiplier += 0.1; };

    const spawnEnemy = () => {
      const mult = gameStateRef.current.mapBoundsMultiplier;
      const side = Math.floor(rand(0, 4));
      let x, y;
      if (side === 0) { x = rand(-40 * mult, W * mult + 40); y = -30 * mult; }
      else if (side === 1) { x = rand(-40 * mult, W * mult + 40); y = H * mult + 30; }
      else if (side === 2) { x = -30 * mult; y = rand(-40 * mult, H * mult + 40); }
      else { x = W * mult + 30; y = rand(-40 * mult, H * mult + 40); }
      const enemyId = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      // SURVIVAL: enemies get tougher each wave
      const currentWave = waveRef.current;
      const hpMult = 1 + (currentWave - 1) * 0.3;
      const speedMult = 1 + (currentWave - 1) * 0.1;
      enemies.push({
        id: enemyId, x, y, r: 16,
        speed: rand(40, 80) * speedMult,
        hp: 60 * hpMult,
        maxHp: 60 * hpMult,
        color: currentWave >= 5 ? "#FF3333" : currentWave >= 3 ? "#FF5555" : "#FF6B6B",
        stun: 0, lastHit: 0, lastShot: -1,
      });
    };

    const spawnPickup = () => { pickups.push({ x: rand(80, W - 80), y: rand(80, H - 80), r: 10, amt: 3, ttl: 20 }); };

    const spawnParticles = (x: number, y: number, color: string, count = 10) => {
      for (let i = 0; i < count; i++) particles.push({ x, y, vx: rand(-120, 120), vy: rand(-120, 120), life: rand(0.3, 0.9), color });
    };

    const tryShoot = (t: number) => {
      const weapon = WEAPONS[player.weapon];
      if (weapon.isMelee) {
        if (mouse.down && t - player.lastMelee >= weapon.fireRate) {
          player.lastMelee = t;
          const meleeRange = 50;
          spawnParticles(player.x + Math.cos(player.angle) * meleeRange, player.y + Math.sin(player.angle) * meleeRange, weapon.color, 10);
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            const dx = e.x - player.x, dy = e.y - player.y;
            const dist = Math.hypot(dx, dy);
            const angleToEnemy = Math.atan2(dy, dx);
            const angleDiff = Math.abs(angleToEnemy - player.angle);
            if (dist <= meleeRange && angleDiff < 0.5) {
              const damageMultiplier = specialPowerRef.current === "double_damage" ? 2 : 1;
              e.hp -= weapon.damage * damageMultiplier;
              e.stun = 0.6;
              spawnParticles(e.x, e.y, weapon.color, 12);
              if (e.hp <= 0) {
                spawnParticles(e.x, e.y, "#FF6B6B", 20);
                setScore(prev => { const ns = prev + 10; player.score = ns; return ns; });
                setKills(prev => prev + 1);
                waveEnemiesKilled++;
                if (Math.random() < 0.35) pickups.push({ x: e.x, y: e.y, r: 10, amt: 2, ttl: 18 });
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
        if (!hasInfiniteAmmo) { player.ammo--; setAmmo(player.ammo); }
        const bulletsToFire = player.weapon === "shotgun" ? 5 : 1;
        for (let i = 0; i < bulletsToFire; i++) {
          const ang = player.angle;
          const spread = weapon.spread * (Math.PI / 180);
          const finalAngle = ang + rand(-spread, spread);
          const damageMultiplier = specialPowerRef.current === "double_damage" ? 2 : 1;
          bullets.push({
            x: player.x + Math.cos(ang) * player.r * 1.6, y: player.y + Math.sin(ang) * player.r * 1.6,
            vx: Math.cos(finalAngle) * weapon.bulletSpeed, vy: Math.sin(finalAngle) * weapon.bulletSpeed,
            r: player.weapon === "sniper" ? 6 : 8, life: 2.5, dmg: weapon.damage * damageMultiplier, color: weapon.color,
          });
        }
        spawnParticles(player.x + Math.cos(player.angle) * player.r * 1.6, player.y + Math.sin(player.angle) * player.r * 1.6, weapon.color, 6);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === "r" && player.ammo < player.maxAmmo && !WEAPONS[player.weapon].isMelee) {
        player.ammo = player.maxAmmo; setAmmo(player.ammo);
      }
      if (e.key.toLowerCase() === "shift" && specialPowerRef.current === "teleport") {
        const now = performance.now();
        if (now - teleportCooldownRef.current >= 3000) {
          teleportCooldownRef.current = now;
          const teleportDist = 150;
          const mult = gameStateRef.current.mapBoundsMultiplier;
          player.x = Math.max(20, Math.min(W * mult - 20, player.x + Math.cos(player.angle) * teleportDist));
          player.y = Math.max(20, Math.min(H * mult - 20, player.y + Math.sin(player.angle) * teleportDist));
          spawnParticles(player.x, player.y, "#00FFFF", 20);
        }
      }
      // Health pack - H key
      if (e.key.toLowerCase() === "h") {
        try {
          const pendingPacks = JSON.parse(localStorage.getItem("pendingHealthPacks") || "[]");
          if (pendingPacks.length > 0) {
            if (player.hp >= (player.maxHp || 100)) { toast.info("Already at full HP!"); }
            else { const pack = pendingPacks.shift(); localStorage.setItem("pendingHealthPacks", JSON.stringify(pendingPacks)); player.hp = Math.min(player.maxHp || 100, player.hp + (pack.healAmount || 25)); setHealth(player.hp); toast.success(`+${pack.healAmount || 25} HP!`); spawnParticles(player.x, player.y, "#22c55e", 15); }
          } else {
            const equipped = JSON.parse(localStorage.getItem("equippedHealthPacks") || "[]");
            if (equipped.length > 0) {
              if (player.hp >= (player.maxHp || 100)) { toast.info("Already at full HP!"); }
              else {
                const packId = equipped[0];
                const healAmounts: Record<string, number> = { small_health: 25, medium_health: 50, large_health: 100 };
                const healAmount = healAmounts[packId] || 25;
                player.hp = Math.min(player.maxHp || 100, player.hp + healAmount); setHealth(player.hp);
                toast.success(`+${healAmount} HP!`); spawnParticles(player.x, player.y, "#22c55e", 15);
                (async () => { try { const { data: { user: cu } } = await supabase.auth.getUser(); if (!cu) return; const { data: inv } = await supabase.from("player_inventory").select("*").eq("user_id", cu.id).eq("item_id", packId).eq("item_type", "health_pack").maybeSingle(); if (inv) { if (inv.quantity <= 1) { await supabase.from("player_inventory").delete().eq("user_id", cu.id).eq("item_id", packId); const ue = equipped.filter((id: string) => id !== packId); localStorage.setItem("equippedHealthPacks", JSON.stringify(ue)); } else { await supabase.from("player_inventory").update({ quantity: inv.quantity - 1 }).eq("user_id", cu.id).eq("item_id", packId); } } } catch (err) { console.error("Error consuming health pack:", err); } })();
              }
            } else { toast.error("No health packs! Equip them in Inventory or buy from Shop."); }
          }
        } catch (err) { console.error("Error using health pack:", err); }
      }
      const keyNum = parseInt(e.key);
      if (keyNum >= 1 && keyNum <= unlockedWeapons.length) {
        const wpn = unlockedWeapons[keyNum - 1];
        if (wpn) { player.weapon = wpn; const wc = WEAPONS[wpn]; player.ammo = wc.ammo; player.maxAmmo = wc.maxAmmo; setCurrentWeapon(wpn); setAmmo(player.ammo); setMaxAmmo(player.maxAmmo); }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    const handleMouseMove = (e: MouseEvent) => { const rect = canvas.getBoundingClientRect(); mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width); mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height); };
    const handleMouseDown = (e: MouseEvent) => { if (e.button === 0) mouse.down = true; };
    const handleMouseUp = (e: MouseEvent) => { if (e.button === 0) mouse.down = false; };

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
        if (!gameOver) { setGameOver(true); saveProgress(score); }
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff"; ctx.font = "48px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("SURVIVAL OVER", W / 2, H / 2 - 20);
        ctx.font = "24px sans-serif";
        ctx.fillText(`Wave: ${waveRef.current} | Kills: ${kills}`, W / 2, H / 2 + 30);
        ctx.fillText(`Score: ${score}`, W / 2, H / 2 + 65);
        ctx.restore();
        gameLoopRef.current = requestAnimationFrame(loop);
        return;
      }

      // SURVIVAL: Check wave completion
      if (waveEnemiesKilled >= waveEnemiesNeeded) {
        waveRef.current++;
        setWave(waveRef.current);
        waveEnemiesKilled = 0;
        waveEnemiesNeeded = 10 + waveRef.current * 5;
        enemySpawnInterval = Math.max(0.3, 1.5 - waveRef.current * 0.1);
        toast.success(`Wave ${waveRef.current}! Enemies are stronger!`);
        // Bonus ammo pickup
        for (let i = 0; i < 3; i++) spawnPickup();
      }

      let dx = 0, dy = 0;
      if (touchscreenMode) { dx = touchMoveRef.current.x; dy = touchMoveRef.current.y; mouse.x = touchAimRef.current.x; mouse.y = touchAimRef.current.y; mouse.down = touchShootingRef.current; }
      else { if (keys["w"] || keys["arrowup"]) dy -= 1; if (keys["s"] || keys["arrowdown"]) dy += 1; if (keys["a"] || keys["arrowleft"]) dx -= 1; if (keys["d"] || keys["arrowright"]) dx += 1; }
      player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy); dx /= len; dy /= len;
        let speedMultiplier = adminStateRef.current.speedMultiplier;
        if (specialPowerRef.current === "speed") speedMultiplier *= 1.3;
        const newX = player.x + dx * player.speed * speedMultiplier * dt;
        const newY = player.y + dy * player.speed * speedMultiplier * dt;
        const mult = gameStateRef.current.mapBoundsMultiplier;
        if (newX < 20 || newX > W * mult - 20 || newY < 20 || newY > H * mult - 20) expandMap();
        player.x = Math.max(20, Math.min(W * mult - 20, newX));
        player.y = Math.max(20, Math.min(H * mult - 20, newY));
      }

      tryShoot(time);

      // Update bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) { bullets.splice(i, 1); continue; }
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j]; const edx = b.x - e.x, edy = b.y - e.y;
          if (edx * edx + edy * edy <= (b.r + e.r) * (b.r + e.r)) {
            e.hp -= b.dmg; e.stun = 0.6; spawnParticles(b.x, b.y, "#FFF3D6", 8);
            if (e.hp <= 0) {
              spawnParticles(e.x, e.y, "#FF6B6B", 16);
              setScore(prev => { const ns = prev + 10; player.score = ns; return ns; });
              setKills(prev => prev + 1);
              waveEnemiesKilled++;
              if (Math.random() < 0.35) pickups.push({ x: e.x, y: e.y, r: 10, amt: 2, ttl: 18 });
              enemies.splice(j, 1);
            }
            bullets.splice(i, 1); break;
          }
        }
      }

      // Update enemy bullets
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

      // Update enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.stun > 0) { e.stun = Math.max(0, e.stun - dt); continue; }
        const vx = player.x - e.x, vy = player.y - e.y; const d = Math.hypot(vx, vy);
        let enemySpeedMod = 1;
        if (specialPowerRef.current === "slow_motion" && d < 200) enemySpeedMod = 0.5;
        if (d > 0) { e.x += (vx / d) * e.speed * enemySpeedMod * dt; e.y += (vy / d) * e.speed * enemySpeedMod * dt; }
        if (d < player.r + e.r) { if (!adminStateRef.current.godMode && !isImmune) { player.hp -= 5 * dt; setHealth(Math.max(0, player.hp)); } }
        if (d < 350 && time - e.lastShot >= 3.5) {
          e.lastShot = time;
          const ang = Math.atan2(player.y - e.y, player.x - e.x);
          enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, r: 6, life: 3, dmg: 10, color: "#FF4444" });
        }
      }

      // Update pickups
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i]; p.ttl -= dt;
        if (p.ttl <= 0) { pickups.splice(i, 1); continue; }
        if ((player.x - p.x) ** 2 + (player.y - p.y) ** 2 <= (player.r + p.r) ** 2) {
          if (!WEAPONS[player.weapon].isMelee) { player.ammo = Math.min(player.maxAmmo, player.ammo + p.amt); setAmmo(player.ammo); }
          spawnParticles(p.x, p.y, "#A6FFB3", 10); pickups.splice(i, 1);
        }
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.vy *= 0.98; p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Spawn enemies
      if (time - lastSpawn > enemySpawnInterval) { lastSpawn = time; spawnEnemy(); }

      gameStateRef.current.enemies = enemies;
      gameStateRef.current.pickups = pickups;

      // === DRAW ===
      ctx.clearRect(0, 0, W, H);
      // Background
      ctx.save(); ctx.globalAlpha = 0.06; ctx.strokeStyle = "#1b3444";
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();

      // Wave indicator
      ctx.save(); ctx.fillStyle = "#FFD700"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`WAVE ${waveRef.current}`, W / 2, 30);
      ctx.font = "14px sans-serif"; ctx.fillStyle = "#aaa";
      ctx.fillText(`${waveEnemiesKilled}/${waveEnemiesNeeded} kills to next wave`, W / 2, 50);
      ctx.restore();

      // Pickups
      for (const p of pickups) { ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = "#A6FFB3"; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#073"; ctx.font = "10px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("+" + p.amt, 0, 0); ctx.restore(); }
      // Bullets
      for (const b of bullets) { ctx.save(); ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      // Enemy bullets
      for (const b of enemyBullets) { ctx.save(); ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      // Enemies
      for (const e of enemies) {
        ctx.save(); ctx.translate(e.x, e.y); ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill();
        const hpW = 28; ctx.fillStyle = "#333"; ctx.fillRect(-hpW / 2, -e.r - 12, hpW, 6); ctx.fillStyle = "#FF6B6B"; ctx.fillRect(-hpW / 2, -e.r - 12, hpW * Math.max(0, e.hp / (e.maxHp || 60)), 6); ctx.restore();
      }
      // Player shadow
      ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(player.x, player.y + player.r * 0.8, player.r * 1.1, player.r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      // Player
      ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle);
      if (isImmune) { ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, player.r + 5, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = playerSkin; ctx.beginPath(); ctx.arc(0, 0, player.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2b2b2b"; ctx.beginPath(); ctx.arc(player.r * 0.45, -4, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = WEAPONS[player.weapon].color;
      if (WEAPONS[player.weapon].isMelee) ctx.fillRect(player.r - 2, -3, 25, 6); else ctx.fillRect(player.r - 2, -6, 18, 12);
      ctx.restore();
      // Particles
      for (const p of particles) { ctx.save(); ctx.globalAlpha = Math.max(0, p.life / 0.9); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); ctx.restore(); }
      // Crosshair
      ctx.save(); ctx.strokeStyle = "#fff"; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(mouse.x - 8, mouse.y); ctx.lineTo(mouse.x + 8, mouse.y); ctx.moveTo(mouse.x, mouse.y - 8); ctx.lineTo(mouse.x, mouse.y + 8); ctx.stroke(); ctx.restore();

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    for (let i = 0; i < 3; i++) spawnEnemy();
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
  }, [unlockedWeapons, playerSkin]);

  return (
    <div className="relative">
      <div className="fixed left-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-2">
        <div className="font-bold text-lg">🏔️ Survival Mode</div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div><span className="text-primary font-mono">WASD</span> move</div>
          <div><span className="text-primary font-mono">Mouse</span> aim</div>
          <div><span className="text-primary font-mono">LMB</span> shoot</div>
          {!WEAPONS[currentWeapon].isMelee && <div><span className="text-primary font-mono">R</span> reload</div>}
          <div><span className="text-primary font-mono">1-{unlockedWeapons.length}</span> weapons</div>
          <div><span className="text-primary font-mono">H</span> health pack</div>
        </div>
      </div>

      <div className="fixed right-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-3 min-w-[180px]">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Health</span>
          <span className="font-bold text-lg">{Math.round(health)}</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-green-500 h-full transition-all duration-300" style={{ width: `${(health / maxHealth) * 100}%` }} />
        </div>
        {spawnImmunity && (<div className="flex items-center gap-2 text-yellow-500 text-sm"><Shield className="w-4 h-4" /><span>Spawn Protection</span></div>)}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Wave</span>
          <span className="font-bold text-lg text-yellow-500">{wave}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Weapon</span>
          <span className="font-bold" style={{ color: WEAPONS[currentWeapon].color }}>{WEAPONS[currentWeapon].name}</span>
        </div>
        {!WEAPONS[currentWeapon].isMelee && (
          <>
            <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Ammo</span><span className="font-bold text-lg">{ammo}/{maxAmmo}</span></div>
            <div className="w-full bg-secondary rounded-full h-2"><div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${(ammo / maxAmmo) * 100}%` }} /></div>
          </>
        )}
        <div className="pt-2 border-t border-border">
          <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Score</span><span className="font-bold text-lg text-primary">{score}</span></div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>Kills: {kills}</span></div>
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 flex gap-2">
        {unlockedWeapons.map((weapon, index) => (
          <div key={weapon} className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${currentWeapon === weapon ? "bg-primary text-primary-foreground ring-2 ring-primary" : "bg-secondary hover:bg-secondary/80"}`}
            onClick={() => { if (playerRef.current) { playerRef.current.weapon = weapon; const wc = WEAPONS[weapon]; playerRef.current.ammo = wc.ammo; playerRef.current.maxAmmo = wc.maxAmmo; setCurrentWeapon(weapon); setAmmo(wc.ammo); setMaxAmmo(wc.maxAmmo); } }}>
            <span className="text-xs opacity-70">{index + 1}</span>
            <span className="text-xs font-medium text-center">{WEAPONS[weapon].name}</span>
          </div>
        ))}
      </div>

      <canvas ref={canvasRef} width={960} height={640} className="border-2 border-border rounded-lg shadow-2xl" />

      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={() => { if (score > 0) saveProgress(score); onBack(); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Menu
        </Button>
        <Button variant="outline" onClick={() => setChatOpen(!chatOpen)}>
          <MessageSquare className="w-4 h-4 mr-2" /> Console
        </Button>
      </div>

      <AdminChat open={chatOpen} onOpenChange={setChatOpen} onCommand={handleCommand} onShowOnlinePlayers={() => {}} />

      {touchscreenMode && (
        <TouchControls onMove={handleTouchMove} onAim={handleTouchAim} onShoot={handleTouchShoot} onReload={handleTouchReload} canvasWidth={960} canvasHeight={640} />
      )}
    </div>
  );
};
