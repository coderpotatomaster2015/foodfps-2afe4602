import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { AdminChat } from "./AdminChat";
import { OnlinePlayersModal } from "./OnlinePlayersModal";
import type { GameMode } from "@/pages/Index";

interface GameCanvasProps {
  mode: Exclude<GameMode, null>;
  username: string;
  roomCode: string;
  onBack: () => void;
}

interface AdminState {
  active: boolean;
  godMode: boolean;
  speedMultiplier: number;
}

type Weapon = "pistol" | "shotgun" | "minigun" | "sniper";

interface WeaponConfig {
  name: string;
  fireRate: number;
  damage: number;
  ammo: number;
  maxAmmo: number;
  spread: number;
  bulletSpeed: number;
  color: string;
}

const WEAPONS: Record<Weapon, WeaponConfig> = {
  pistol: { name: "Pistol", fireRate: 0.18, damage: 40, ammo: 10, maxAmmo: 10, spread: 10, bulletSpeed: 420, color: "#FFB84D" },
  shotgun: { name: "Shotgun", fireRate: 0.5, damage: 25, ammo: 6, maxAmmo: 6, spread: 40, bulletSpeed: 380, color: "#FF6B6B" },
  minigun: { name: "Minigun", fireRate: 0.05, damage: 20, ammo: 100, maxAmmo: 100, spread: 20, bulletSpeed: 500, color: "#6BAFFF" },
  sniper: { name: "Sniper", fireRate: 1.0, damage: 120, ammo: 5, maxAmmo: 5, spread: 0, bulletSpeed: 800, color: "#A6FFB3" },
};

export const GameCanvas = ({ mode, username, onBack }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [onlinePlayersOpen, setOnlinePlayersOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [ammo, setAmmo] = useState(10);
  const [maxAmmo, setMaxAmmo] = useState(10);
  const [currentWeapon, setCurrentWeapon] = useState<Weapon>("pistol");
  const [health, setHealth] = useState(100);
  const [maxHealth] = useState(100);
  const adminStateRef = useRef<AdminState>({ active: false, godMode: false, speedMultiplier: 1 });
  const gameStateRef = useRef<any>({ enemies: [], pickups: [], W: 960, H: 640 });
  const playerRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    gameStateRef.current.W = W;
    gameStateRef.current.H = H;

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

    const spawnEnemy = () => {
      const side = Math.floor(rand(0, 4));
      let x, y;
      if (side === 0) { x = rand(-40, W + 40); y = -30; }
      else if (side === 1) { x = rand(-40, W + 40); y = H + 30; }
      else if (side === 2) { x = -30; y = rand(-40, H + 40); }
      else { x = W + 30; y = rand(-40, H + 40); }
      enemies.push({ x, y, r: 16, speed: rand(40, 80), hp: 60, color: "#FF6B6B", stun: 0, lastHit: 0, lastShot: -1 });
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
      const fireRate = adminStateRef.current.active && adminStateRef.current.godMode ? 0 : weapon.fireRate;
      if (mouse.down && t - player.lastShot >= fireRate && player.ammo > 0) {
        player.lastShot = t;
        player.ammo--;
        setAmmo(player.ammo);

        const bulletsToFire = player.weapon === "shotgun" ? 5 : 1;
        for (let i = 0; i < bulletsToFire; i++) {
          const ang = player.angle;
          const spread = weapon.spread * (Math.PI / 180);
          const finalAngle = ang + rand(-spread, spread);
          const speed = weapon.bulletSpeed;
          bullets.push({
            x: player.x + Math.cos(ang) * player.r * 1.6,
            y: player.y + Math.sin(ang) * player.r * 1.6,
            vx: Math.cos(finalAngle) * speed,
            vy: Math.sin(finalAngle) * speed,
            r: player.weapon === "sniper" ? 6 : 8,
            life: 2.5,
            dmg: weapon.damage,
            color: weapon.color,
          });
        }
        spawnParticles(player.x + Math.cos(player.angle) * player.r * 1.6, player.y + Math.sin(player.angle) * player.r * 1.6, weapon.color, 6);
      }
    };

    // Event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === "r" && player.ammo < player.maxAmmo) {
        player.ammo = player.maxAmmo;
        setAmmo(player.ammo);
      }
      // Weapon switching
      if (e.key === "1") { 
        player.weapon = "pistol"; 
        player.ammo = WEAPONS.pistol.ammo; 
        player.maxAmmo = WEAPONS.pistol.maxAmmo;
        setCurrentWeapon("pistol"); 
        setAmmo(player.ammo); 
        setMaxAmmo(player.maxAmmo); 
      }
      if (e.key === "2") { 
        player.weapon = "shotgun"; 
        player.ammo = WEAPONS.shotgun.ammo; 
        player.maxAmmo = WEAPONS.shotgun.maxAmmo;
        setCurrentWeapon("shotgun"); 
        setAmmo(player.ammo); 
        setMaxAmmo(player.maxAmmo); 
      }
      if (e.key === "3") { 
        player.weapon = "minigun"; 
        player.ammo = WEAPONS.minigun.ammo; 
        player.maxAmmo = WEAPONS.minigun.maxAmmo;
        setCurrentWeapon("minigun"); 
        setAmmo(player.ammo); 
        setMaxAmmo(player.maxAmmo); 
      }
      if (e.key === "4") { 
        player.weapon = "sniper"; 
        player.ammo = WEAPONS.sniper.ammo; 
        player.maxAmmo = WEAPONS.sniper.maxAmmo;
        setCurrentWeapon("sniper"); 
        setAmmo(player.ammo); 
        setMaxAmmo(player.maxAmmo); 
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

    // Game loop
    let last = performance.now();
    let animationId: number;

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      time += dt;

      // Update
      player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

      let dx = 0, dy = 0;
      if (keys["w"] || keys["arrowup"]) dy -= 1;
      if (keys["s"] || keys["arrowdown"]) dy += 1;
      if (keys["a"] || keys["arrowleft"]) dx -= 1;
      if (keys["d"] || keys["arrowright"]) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
        const speedMultiplier = adminStateRef.current.speedMultiplier;
        player.x += dx * player.speed * speedMultiplier * dt;
        player.y += dy * player.speed * speedMultiplier * dt;
        player.x = Math.max(20, Math.min(W - 20, player.x));
        player.y = Math.max(20, Math.min(H - 20, player.y));
      }

      tryShoot(time);

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

        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          const dx = b.x - e.x, dy = b.y - e.y;
          if (dx * dx + dy * dy <= (b.r + e.r) * (b.r + e.r)) {
            e.hp -= b.dmg;
            e.stun = 0.6;
            spawnParticles(b.x, b.y, "#FFF3D6", 8);
            if (e.hp <= 0) {
              spawnParticles(e.x, e.y, "#FF6B6B", 16);
              setScore(prev => prev + 10);
              player.score += 10;
              if (Math.random() < 0.35) pickups.push({ x: e.x, y: e.y, r: 10, amt: 2, ttl: 18 });
              enemies.splice(j, 1);
            }
            bullets.splice(i, 1);
            break;
          }
        }
      }

      // Update enemy bullets
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
          enemyBullets.splice(i, 1);
          continue;
        }

        const dx = b.x - player.x, dy = b.y - player.y;
        if (dx * dx + dy * dy <= (b.r + player.r) * (b.r + player.r)) {
          if (!adminStateRef.current.godMode) {
            player.hp -= b.dmg;
            setHealth(prev => Math.max(0, prev - b.dmg));
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

      // Enemy shooting (slower rate)
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
          player.ammo = Math.min(player.maxAmmo, player.ammo + p.amt);
          setAmmo(player.ammo);
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

      // Spawn enemies
      if (time - lastSpawn > enemySpawnInterval) {
        lastSpawn = time;
        spawnEnemy();
        if (enemySpawnInterval > 0.6) enemySpawnInterval *= 0.993;
      }

      // Update game state refs
      gameStateRef.current.enemies = enemies;
      gameStateRef.current.pickups = pickups;

      // Game over check
      if (player.hp <= 0 && !adminStateRef.current.godMode) {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.font = "48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 20);
        ctx.font = "24px sans-serif";
        ctx.fillText("Score: " + score, W / 2, H / 2 + 30);
        ctx.restore();
        return;
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
      ctx.fillStyle = "#FFF3D6";
      ctx.beginPath();
      ctx.arc(0, 0, player.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b2b2b";
      ctx.beginPath();
      ctx.arc(player.r * 0.45, -4, 3.5, 0, Math.PI * 2);
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

      animationId = requestAnimationFrame(loop);
    };

    // Initialize
    for (let i = 0; i < 3; i++) spawnEnemy();
    for (let i = 0; i < 2; i++) spawnPickup();

    animationId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="relative">
      <div className="fixed left-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-2">
        <div className="font-bold text-lg">Food FPS</div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div><span className="text-primary font-mono">WASD</span> move</div>
          <div><span className="text-primary font-mono">Mouse</span> aim</div>
          <div><span className="text-primary font-mono">LMB</span> shoot</div>
          <div><span className="text-primary font-mono">R</span> reload</div>
          <div><span className="text-primary font-mono">1-4</span> weapons</div>
        </div>
      </div>

      <div className="fixed right-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 min-w-[200px]">
        <div className="space-y-3">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Health</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden border border-border">
                <div 
                  className="h-full bg-destructive transition-all duration-300"
                  style={{ width: `${(health / maxHealth) * 100}%` }}
                />
              </div>
              <div className="text-sm font-bold text-destructive min-w-[50px]">{health}/{maxHealth}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Weapon</div>
            <div className="text-lg font-bold text-primary">{WEAPONS[currentWeapon].name}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Ammo</div>
            <div className="text-2xl font-bold">{ammo}/{maxAmmo}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Score</div>
            <div className="text-2xl font-bold text-accent">{score}</div>
          </div>
        </div>
      </div>

      <div className="fixed left-4 bottom-4 flex gap-2">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => setChatOpen(!chatOpen)}>
          <MessageSquare className="w-4 h-4" />
        </Button>
      </div>

      <canvas
        ref={canvasRef}
        width={960}
        height={640}
        className="rounded-lg shadow-2xl border border-border"
      />

      <AdminChat 
        open={chatOpen} 
        onOpenChange={setChatOpen}
        onShowOnlinePlayers={() => setOnlinePlayersOpen(true)}
        onCommand={(cmd) => {
          if (cmd.startsWith("/activate auth 1082698")) {
            adminStateRef.current.active = true;
          } else if (cmd.startsWith("/deactivate auth 1082698")) {
            adminStateRef.current.active = false;
            adminStateRef.current.godMode = false;
            adminStateRef.current.speedMultiplier = 1;
          } else if (adminStateRef.current.active) {
            if (cmd.startsWith("/godmode auth 1082698")) {
              adminStateRef.current.godMode = !adminStateRef.current.godMode;
              if (playerRef.current) {
                playerRef.current.hp = 100;
                playerRef.current.ammo = 999;
                playerRef.current.maxAmmo = 999;
              }
              setHealth(100);
              setAmmo(999);
              setMaxAmmo(999);
            } else if (cmd.startsWith("/speed")) {
              const parts = cmd.split(" ");
              const value = parseFloat(parts[1]);
              if (!isNaN(value) && cmd.includes("auth 1082698")) {
                adminStateRef.current.speedMultiplier = value;
              }
            } else if (cmd.startsWith("/score")) {
              const parts = cmd.split(" ");
              const value = parseInt(parts[1]);
              if (!isNaN(value) && cmd.includes("auth 1082698")) {
                setScore(value);
              }
            } else if (cmd.startsWith("/nuke auth 1082698")) {
              gameStateRef.current.enemies.length = 0;
            } else if (cmd.startsWith("/rain ammo auth 1082698")) {
              const W = gameStateRef.current.W;
              const H = gameStateRef.current.H;
              for (let i = 0; i < 20; i++) {
                const rand = (min: number, max: number) => Math.random() * (max - min) + min;
                gameStateRef.current.pickups.push({ x: rand(80, W - 80), y: rand(80, H - 80), r: 10, amt: 10, ttl: 30 });
              }
            }
          }
        }}
      />

      <OnlinePlayersModal
        open={onlinePlayersOpen}
        onOpenChange={setOnlinePlayersOpen}
        currentUsername={username}
        onJoinGame={(targetUsername, roomCode) => {
          console.log(`Joining ${targetUsername}'s game with room code: ${roomCode}`);
          setOnlinePlayersOpen(false);
        }}
      />
    </div>
  );
};
