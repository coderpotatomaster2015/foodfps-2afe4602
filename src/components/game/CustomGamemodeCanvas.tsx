import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

interface CustomGamemodeConfig {
  name: string;
  enemy_health: number;
  player_health: number;
  allowed_weapons: string[];
  show_score: boolean;
  show_health_gui: boolean;
  enemy_speed_mult: number;
  player_speed_mult: number;
  spawn_interval: number;
  score_multiplier: number;
  enemy_color: string;
  bg_color_top: string;
  bg_color_bottom: string;
  max_enemies: number;
  pickup_chance: number;
}

interface CustomGamemodeCanvasProps {
  config: CustomGamemodeConfig;
  username: string;
  onBack: () => void;
  playerSkin?: string;
}

type Weapon = "pistol" | "shotgun" | "minigun" | "sniper" | "sword" | "knife" | "axe" | "rifle" | "smg" | "rpg" | "flamethrower" | "railgun" | "crossbow" | "laser_pistol" | "grenade_launcher" | "katana" | "dual_pistols" | "plasma_rifle" | "boomerang" | "whip" | "freeze_ray" | "harpoon_gun";

const WEAPONS: Record<string, { name: string; fireRate: number; damage: number; ammo: number; maxAmmo: number; spread: number; bulletSpeed: number; color: string; isMelee: boolean }> = {
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
  crossbow: { name: "Crossbow", fireRate: 0.8, damage: 90, ammo: 8, maxAmmo: 8, spread: 2, bulletSpeed: 700, color: "#A0522D", isMelee: false },
  laser_pistol: { name: "Laser Pistol", fireRate: 0.15, damage: 45, ammo: 15, maxAmmo: 15, spread: 3, bulletSpeed: 900, color: "#FF1493", isMelee: false },
  grenade_launcher: { name: "Grenade Launcher", fireRate: 1.5, damage: 180, ammo: 4, maxAmmo: 4, spread: 8, bulletSpeed: 250, color: "#228B22", isMelee: false },
  katana: { name: "Katana", fireRate: 0.3, damage: 110, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 0, color: "#DC143C", isMelee: true },
  dual_pistols: { name: "Dual Pistols", fireRate: 0.1, damage: 30, ammo: 20, maxAmmo: 20, spread: 18, bulletSpeed: 420, color: "#DAA520", isMelee: false },
  plasma_rifle: { name: "Plasma Rifle", fireRate: 0.2, damage: 55, ammo: 25, maxAmmo: 25, spread: 6, bulletSpeed: 650, color: "#7B68EE", isMelee: false },
  boomerang: { name: "Boomerang", fireRate: 0.7, damage: 70, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 350, color: "#FF8C00", isMelee: false },
  whip: { name: "Whip", fireRate: 0.35, damage: 65, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 0, color: "#8B0000", isMelee: true },
  freeze_ray: { name: "Freeze Ray", fireRate: 0.12, damage: 20, ammo: 30, maxAmmo: 30, spread: 12, bulletSpeed: 400, color: "#ADD8E6", isMelee: false },
  harpoon_gun: { name: "Harpoon Gun", fireRate: 1.2, damage: 160, ammo: 3, maxAmmo: 3, spread: 0, bulletSpeed: 550, color: "#4682B4", isMelee: false },
};

export const CustomGamemodeCanvas = ({ config, username, onBack, playerSkin = "#FFF3D6" }: CustomGamemodeCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(config.player_health);
  const [kills, setKills] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [currentWeapon, setCurrentWeapon] = useState<string>(config.allowed_weapons[0] || "pistol");
  const [ammo, setAmmo] = useState(WEAPONS[config.allowed_weapons[0] || "pistol"]?.ammo || 10);
  const [maxAmmo, setMaxAmmo] = useState(WEAPONS[config.allowed_weapons[0] || "pistol"]?.maxAmmo || 10);
  const [spawnImmunity, setSpawnImmunity] = useState(true);

  const keysRef = useRef<Record<string, boolean>>({});
  const mouseRef = useRef({ x: 480, y: 320 });
  const shootingRef = useRef(false);
  const playerRef = useRef<any>(null);
  const gameLoopRef = useRef<number | null>(null);

  const W = 960, H = 640;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize player
    keysRef.current = {};
    playerRef.current = {
      x: W / 2, y: H / 2, radius: 14, hp: config.player_health, maxHp: config.player_health,
      weapon: config.allowed_weapons[0] || "pistol",
      ammo: WEAPONS[config.allowed_weapons[0] || "pistol"]?.ammo || 10,
      maxAmmo: WEAPONS[config.allowed_weapons[0] || "pistol"]?.maxAmmo || 10,
      lastShot: 0, speed: 180 * config.player_speed_mult,
    };

    let enemies: any[] = [];
    let bullets: any[] = [];
    let pickups: any[] = [];
    let localScore = 0;
    let localKills = 0;
    let localDeaths = 0;
    let lastSpawn = 0;
    let lastTime = performance.now();
    let spawnImmunityTime = 3;

    const spawnEnemy = () => {
      if (enemies.length >= config.max_enemies) return;
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (side === 0) { x = Math.random() * W; y = -20; }
      else if (side === 1) { x = W + 20; y = Math.random() * H; }
      else if (side === 2) { x = Math.random() * W; y = H + 20; }
      else { x = -20; y = Math.random() * H; }
      enemies.push({ x, y, hp: config.enemy_health, maxHp: config.enemy_health, radius: 15, speed: 80 * config.enemy_speed_mult });
    };

    const gameLoop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const p = playerRef.current;
      if (!p || p.hp <= 0) { gameLoopRef.current = requestAnimationFrame(gameLoop); return; }

      // Spawn immunity
      if (spawnImmunityTime > 0) {
        spawnImmunityTime -= dt;
        if (spawnImmunityTime <= 0) setSpawnImmunity(false);
      }

      // Movement
      let dx = 0, dy = 0;
      if (keysRef.current["w"] || keysRef.current["arrowup"]) dy -= 1;
      if (keysRef.current["s"] || keysRef.current["arrowdown"]) dy += 1;
      if (keysRef.current["a"] || keysRef.current["arrowleft"]) dx -= 1;
      if (keysRef.current["d"] || keysRef.current["arrowright"]) dx += 1;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > 0) { p.x += (dx / mag) * p.speed * dt; p.y += (dy / mag) * p.speed * dt; }
      p.x = Math.max(p.radius, Math.min(W - p.radius, p.x));
      p.y = Math.max(p.radius, Math.min(H - p.radius, p.y));

      // Shooting
      const wConf = WEAPONS[p.weapon];
      if (shootingRef.current && wConf && now / 1000 - p.lastShot >= wConf.fireRate && p.ammo > 0) {
        p.lastShot = now / 1000;
        const angle = Math.atan2(mouseRef.current.y - p.y, mouseRef.current.x - p.x);
        if (wConf.isMelee) {
          enemies.forEach(e => {
            const dist = Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2);
            if (dist < 60) e.hp -= wConf.damage;
          });
        } else {
          p.ammo--;
          setAmmo(p.ammo);
          const spread = ((Math.random() - 0.5) * wConf.spread * Math.PI) / 180;
          bullets.push({ x: p.x, y: p.y, vx: Math.cos(angle + spread) * wConf.bulletSpeed, vy: Math.sin(angle + spread) * wConf.bulletSpeed, damage: wConf.damage, color: wConf.color, life: 2 });
        }
      }

      // Reload
      if (keysRef.current["r"] && wConf && !wConf.isMelee && p.ammo < p.maxAmmo) {
        p.ammo = p.maxAmmo;
        setAmmo(p.maxAmmo);
      }

      // Update bullets
      bullets = bullets.filter(b => {
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50 || b.life <= 0) return false;
        // Hit enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i];
          if (Math.sqrt((b.x - e.x) ** 2 + (b.y - e.y) ** 2) < e.radius + 4) {
            e.hp -= b.damage;
            if (e.hp <= 0) {
              localScore += Math.round(10 * config.score_multiplier);
              localKills++;
              setScore(localScore); setKills(localKills);
              // Pickup chance
              if (Math.random() < config.pickup_chance) {
                pickups.push({ x: e.x, y: e.y, type: Math.random() > 0.5 ? "health" : "ammo", life: 10 });
              }
              enemies.splice(i, 1);
            }
            return false;
          }
        }
        return true;
      });

      // Spawn enemies
      lastSpawn += dt;
      if (lastSpawn >= config.spawn_interval) { spawnEnemy(); lastSpawn = 0; }

      // Update enemies
      enemies.forEach(e => {
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        e.x += Math.cos(angle) * e.speed * dt;
        e.y += Math.sin(angle) * e.speed * dt;
        // Damage player
        if (spawnImmunityTime <= 0 && Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2) < p.radius + e.radius) {
          p.hp -= 10 * dt;
          setHealth(Math.max(0, Math.round(p.hp)));
          if (p.hp <= 0) {
            localDeaths++;
            setDeaths(localDeaths);
            setGameOver(true);
            p.hp = 0;
          }
        }
      });
      enemies = enemies.filter(e => e.hp > 0);

      // Update pickups
      pickups = pickups.filter(pk => {
        pk.life -= dt;
        if (pk.life <= 0) return false;
        if (Math.sqrt((pk.x - p.x) ** 2 + (pk.y - p.y) ** 2) < 30) {
          if (pk.type === "health") { p.hp = Math.min(p.maxHp, p.hp + 25); setHealth(Math.round(p.hp)); }
          else { p.ammo = Math.min(p.maxAmmo, p.ammo + Math.ceil(p.maxAmmo / 2)); setAmmo(p.ammo); }
          return false;
        }
        return true;
      });

      // Draw
      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, config.bg_color_top);
      gradient.addColorStop(1, config.bg_color_bottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);

      // Draw pickups
      pickups.forEach(pk => {
        ctx.fillStyle = pk.type === "health" ? "#22c55e" : "#eab308";
        ctx.beginPath(); ctx.arc(pk.x, pk.y, 8, 0, Math.PI * 2); ctx.fill();
      });

      // Draw enemies
      enemies.forEach(e => {
        ctx.fillStyle = config.enemy_color;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
        // HP bar
        const hpPct = e.hp / e.maxHp;
        ctx.fillStyle = "#333"; ctx.fillRect(e.x - 15, e.y - e.radius - 8, 30, 4);
        ctx.fillStyle = hpPct > 0.5 ? "#22c55e" : hpPct > 0.25 ? "#eab308" : "#ef4444";
        ctx.fillRect(e.x - 15, e.y - e.radius - 8, 30 * hpPct, 4);
      });

      // Draw bullets
      bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
      });

      // Draw player
      ctx.fillStyle = playerSkin;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#ffffff40"; ctx.lineWidth = 2; ctx.stroke();

      // Spawn immunity visual
      if (spawnImmunityTime > 0) {
        ctx.strokeStyle = "#fbbf2480"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 6, 0, Math.PI * 2); ctx.stroke();
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    const onKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMouseDown = () => { shootingRef.current = true; };
    const onMouseUp = () => { shootingRef.current = false; };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
    };
  }, [config]);

  const respawn = () => {
    if (!playerRef.current) return;
    playerRef.current.hp = config.player_health;
    playerRef.current.x = W / 2;
    playerRef.current.y = H / 2;
    setHealth(config.player_health);
    setGameOver(false);
    setSpawnImmunity(true);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* HUD */}
      {config.show_health_gui && (
        <div className="fixed right-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-3 min-w-[180px]">
          <div className="text-xs font-bold text-primary uppercase">{config.name}</div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Health</span>
            <span className="font-bold text-lg">{health}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-green-500 h-full transition-all duration-300"
              style={{ width: `${(health / config.player_health) * 100}%` }} />
          </div>
          {spawnImmunity && (
            <div className="flex items-center gap-2 text-yellow-500 text-sm">
              <Shield className="w-4 h-4" /><span>Spawn Protection</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Weapon</span>
            <span className="font-bold" style={{ color: WEAPONS[currentWeapon]?.color }}>{WEAPONS[currentWeapon]?.name}</span>
          </div>
          {!WEAPONS[currentWeapon]?.isMelee && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Ammo</span>
              <span className="font-bold">{ammo}/{maxAmmo}</span>
            </div>
          )}
          {config.show_score && (
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Score</span>
                <span className="font-bold text-lg text-primary">{score}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>K: {kills} | D: {deaths}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {gameOver && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-card p-8 rounded-lg text-center space-y-4">
            <h2 className="text-2xl font-bold text-destructive">Game Over</h2>
            <p>Score: {score} | Kills: {kills}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={respawn}>Respawn</Button>
              <Button variant="outline" onClick={onBack}>Back to Menu</Button>
            </div>
          </div>
        </div>
      )}

      {/* Hotbar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 flex gap-2">
        {config.allowed_weapons.map((weapon, i) => (
          <div key={weapon}
            className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${
              currentWeapon === weapon ? "bg-primary text-primary-foreground ring-2 ring-primary" : "bg-secondary hover:bg-secondary/80"
            }`}
            onClick={() => {
              if (playerRef.current) {
                playerRef.current.weapon = weapon;
                const wConf = WEAPONS[weapon];
                if (wConf) {
                  playerRef.current.ammo = wConf.ammo;
                  playerRef.current.maxAmmo = wConf.maxAmmo;
                  setCurrentWeapon(weapon);
                  setAmmo(wConf.ammo);
                  setMaxAmmo(wConf.maxAmmo);
                }
              }
            }}
          >
            <span className="text-xs opacity-70">{i + 1}</span>
            <span className="text-[10px] font-medium text-center">{WEAPONS[weapon]?.name}</span>
          </div>
        ))}
      </div>

      <canvas ref={canvasRef} width={W} height={H} className="border-2 border-border rounded-lg shadow-2xl" />

      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />Back to Menu
      </Button>
    </div>
  );
};
