import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, MessageSquare, Shield, Flame, Droplets, Mountain, Wind } from "lucide-react";
import { AdminChat } from "./AdminChat";
import { TouchControls } from "./TouchControls";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SchoolModeProps {
  username: string;
  onBack: () => void;
  touchscreenMode?: boolean;
  playerSkin?: string;
}

type ElementalPower = "fire" | "water" | "earth" | "air";

interface PowerConfig {
  name: string;
  damage: number;
  cooldown: number;
  color: string;
  particleColor: string;
  icon: React.ReactNode;
  effectRadius: number;
  description: string;
}

const ELEMENTAL_POWERS: Record<ElementalPower, PowerConfig> = {
  fire: {
    name: "Fire",
    damage: 35,
    cooldown: 0.5,
    color: "#FF4500",
    particleColor: "#FFD700",
    icon: <Flame className="w-4 h-4" />,
    effectRadius: 80,
    description: "Burst of flames that burns enemies"
  },
  water: {
    name: "Water",
    damage: 25,
    cooldown: 0.3,
    color: "#00BFFF",
    particleColor: "#87CEEB",
    icon: <Droplets className="w-4 h-4" />,
    effectRadius: 100,
    description: "Wave of water that pushes and damages"
  },
  earth: {
    name: "Earth",
    damage: 50,
    cooldown: 1.0,
    color: "#8B4513",
    particleColor: "#CD853F",
    icon: <Mountain className="w-4 h-4" />,
    effectRadius: 60,
    description: "Summon rocks that deal heavy damage"
  },
  air: {
    name: "Air",
    damage: 20,
    cooldown: 0.2,
    color: "#E0FFFF",
    particleColor: "#FFFFFF",
    icon: <Wind className="w-4 h-4" />,
    effectRadius: 120,
    description: "Fast wind slashes with wide area"
  }
};

const POWER_ORDER: ElementalPower[] = ["fire", "water", "earth", "air"];

interface Enemy {
  id: string;
  x: number;
  y: number;
  r: number;
  speed: number;
  hp: number;
  maxHp: number;
  color: string;
  stun: number;
  lastShot: number;
}

export const SchoolMode = ({ username, onBack, touchscreenMode = false, playerSkin = "#FFF3D6" }: SchoolModeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [gameState, setGameState] = useState<"ready" | "playing" | "gameover">("ready");
  const [health, setHealth] = useState(100);
  const [score, setScore] = useState(0);
  const [currentPower, setCurrentPower] = useState<ElementalPower>("fire");
  const [cooldowns, setCooldowns] = useState<Record<ElementalPower, number>>({
    fire: 0, water: 0, earth: 0, air: 0
  });
  const [spawnImmunity, setSpawnImmunity] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  const playerRef = useRef<any>(null);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<any[]>([]);
  const enemyProjectilesRef = useRef<any[]>([]);
  const particlesRef = useRef<any[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const mouseRef = useRef({ x: 480, y: 320, down: false });
  const animationFrameRef = useRef<number>();
  const spawnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const spawnImmunityRef = useRef(true);
  const lastShotRef = useRef<Record<ElementalPower, number>>({
    fire: 0, water: 0, earth: 0, air: 0
  });

  const touchMoveRef = useRef({ x: 0, y: 0 });
  const touchAimRef = useRef({ x: 480, y: 320 });
  const touchShootingRef = useRef(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "owner", "teacher"]);

    if (roleData && roleData.length > 0) {
      setHasPermission(true);
    }
  };

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setGameState("playing");
    enemiesRef.current = [];
    projectilesRef.current = [];
    enemyProjectilesRef.current = [];
    particlesRef.current = [];

    playerRef.current = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      r: 14,
      speed: 180,
      angle: 0,
      hp: 100,
    };

    setHealth(100);
    setScore(0);
    setCurrentPower("fire");

    spawnImmunityRef.current = true;
    setSpawnImmunity(true);
    setTimeout(() => {
      spawnImmunityRef.current = false;
      setSpawnImmunity(false);
    }, 3000);

    // Spawn enemies periodically
    spawnIntervalRef.current = setInterval(() => {
      spawnEnemy();
    }, 2000);
  }, []);

  const spawnEnemy = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    switch (side) {
      case 0: x = Math.random() * 960; y = -30; break;
      case 1: x = 990; y = Math.random() * 640; break;
      case 2: x = Math.random() * 960; y = 670; break;
      case 3: x = -30; y = Math.random() * 640; break;
    }

    const enemy: Enemy = {
      id: `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x, y,
      r: 16,
      speed: 40 + Math.random() * 30,
      hp: 60,
      maxHp: 60,
      color: "#FF6B6B",
      stun: 0,
      lastShot: -1,
    };

    enemiesRef.current.push(enemy);
  };

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
    // Cycle through powers
    const currentIndex = POWER_ORDER.indexOf(currentPower);
    const nextIndex = (currentIndex + 1) % POWER_ORDER.length;
    setCurrentPower(POWER_ORDER[nextIndex]);
  }, [currentPower]);

  const handleCommand = useCallback((cmd: string) => {
    if (!hasPermission) return;

    if (cmd.startsWith("/heal")) {
      if (playerRef.current) {
        playerRef.current.hp = 100;
        setHealth(100);
        toast.success("Healed!");
      }
    } else if (cmd.startsWith("/nuke")) {
      enemiesRef.current.length = 0;
      toast.success("All enemies destroyed!");
    }
  }, [hasPermission]);

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
        particlesRef.current.push({
          x, y,
          vx: rand(-120, 120),
          vy: rand(-120, 120),
          life: rand(0.3, 0.8),
          color,
          size: rand(3, 8)
        });
      }
    };

    const spawnElementalEffect = (x: number, y: number, power: ElementalPower, angle: number) => {
      const config = ELEMENTAL_POWERS[power];
      
      // Create visual particles based on element
      for (let i = 0; i < 15; i++) {
        const spread = rand(-0.5, 0.5);
        particlesRef.current.push({
          x: x + Math.cos(angle) * 20,
          y: y + Math.sin(angle) * 20,
          vx: Math.cos(angle + spread) * rand(100, 200),
          vy: Math.sin(angle + spread) * rand(100, 200),
          life: rand(0.3, 0.6),
          color: config.particleColor,
          size: rand(4, 10),
          elemental: power
        });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;

      // Switch powers with number keys
      if (e.key >= "1" && e.key <= "4") {
        const index = parseInt(e.key) - 1;
        if (POWER_ORDER[index]) {
          setCurrentPower(POWER_ORDER[index]);
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
      if (!player) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const enemies = enemiesRef.current;
      const projectiles = projectilesRef.current;
      const enemyProjectiles = enemyProjectilesRef.current;
      const particles = particlesRef.current;

      // Check game over
      if (player.hp <= 0) {
        setGameState("gameover");
        if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
        return;
      }

      // Handle movement
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

      // Handle power attacks
      const power = ELEMENTAL_POWERS[currentPower];
      if (mouseRef.current.down && time - lastShotRef.current[currentPower] >= power.cooldown) {
        lastShotRef.current[currentPower] = time;

        // Create projectile based on element type
        const projCount = currentPower === "water" ? 3 : currentPower === "air" ? 5 : 1;
        
        for (let i = 0; i < projCount; i++) {
          const spreadAngle = currentPower === "water" ? (i - 1) * 0.2 : 
                             currentPower === "air" ? (i - 2) * 0.15 : 0;
          
          projectiles.push({
            x: player.x + Math.cos(player.angle) * player.r * 1.5,
            y: player.y + Math.sin(player.angle) * player.r * 1.5,
            vx: Math.cos(player.angle + spreadAngle) * 400,
            vy: Math.sin(player.angle + spreadAngle) * 400,
            r: currentPower === "earth" ? 12 : 8,
            life: 1.5,
            dmg: power.damage,
            color: power.color,
            element: currentPower,
            trail: []
          });
        }

        spawnElementalEffect(player.x, player.y, currentPower, player.angle);
      }

      // Update projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;

        // Add trail
        p.trail.push({ x: p.x, y: p.y, life: 0.2 });
        if (p.trail.length > 10) p.trail.shift();
        p.trail.forEach((t: any) => t.life -= dt);
        p.trail = p.trail.filter((t: any) => t.life > 0);

        if (p.life <= 0 || p.x < -50 || p.x > W + 50 || p.y < -50 || p.y > H + 50) {
          projectiles.splice(i, 1);
          continue;
        }

        // Check enemy collision
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          const dist = Math.hypot(p.x - e.x, p.y - e.y);
          if (dist < p.r + e.r) {
            e.hp -= p.dmg;
            e.stun = 0.2;
            spawnParticles(p.x, p.y, p.color, 8);

            // Earth creates explosion
            if (p.element === "earth") {
              for (let k = enemies.length - 1; k >= 0; k--) {
                const nearbyE = enemies[k];
                if (Math.hypot(p.x - nearbyE.x, p.y - nearbyE.y) < 60) {
                  nearbyE.hp -= p.dmg * 0.5;
                  spawnParticles(nearbyE.x, nearbyE.y, p.color, 5);
                }
              }
            }

            // Water pushes enemies back
            if (p.element === "water") {
              const pushAngle = Math.atan2(e.y - player.y, e.x - player.x);
              e.x += Math.cos(pushAngle) * 50;
              e.y += Math.sin(pushAngle) * 50;
            }

            if (e.hp <= 0) {
              spawnParticles(e.x, e.y, e.color, 15);
              enemies.splice(j, 1);
              setScore(prev => prev + 10);
            }

            projectiles.splice(i, 1);
            break;
          }
        }
      }

      // Update enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        
        if (e.stun > 0) {
          e.stun -= dt;
        } else {
          const angle = Math.atan2(player.y - e.y, player.x - e.x);
          e.x += Math.cos(angle) * e.speed * dt;
          e.y += Math.sin(angle) * e.speed * dt;
        }

        // Enemy shooting
        if (time - e.lastShot > 2.5) {
          e.lastShot = time;
          const angle = Math.atan2(player.y - e.y, player.x - e.x);
          enemyProjectiles.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(angle) * 200,
            vy: Math.sin(angle) * 200,
            r: 6,
            life: 3,
            dmg: 15,
            color: "#FF0000"
          });
        }

        // Enemy-player collision
        const dist = Math.hypot(e.x - player.x, e.y - player.y);
        if (dist < e.r + player.r && !spawnImmunityRef.current) {
          player.hp -= 20;
          setHealth(Math.max(0, player.hp));
          e.x += (e.x - player.x) * 2;
          e.y += (e.y - player.y) * 2;
        }
      }

      // Update enemy projectiles
      for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const p = enemyProjectiles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;

        if (p.life <= 0 || p.x < -50 || p.x > W + 50 || p.y < -50 || p.y > H + 50) {
          enemyProjectiles.splice(i, 1);
          continue;
        }

        // Check player collision
        const dist = Math.hypot(p.x - player.x, p.y - player.y);
        if (dist < p.r + player.r && !spawnImmunityRef.current) {
          player.hp -= p.dmg;
          setHealth(Math.max(0, player.hp));
          spawnParticles(p.x, p.y, "#FF0000", 8);
          enemyProjectiles.splice(i, 1);
        }
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Draw
      ctx.clearRect(0, 0, W, H);

      // Draw background with elemental theme
      const gradient = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W/2);
      gradient.addColorStop(0, "rgba(20, 30, 40, 1)");
      gradient.addColorStop(1, "rgba(10, 15, 20, 1)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);

      // Draw grid
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = ELEMENTAL_POWERS[currentPower].color;
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

      // Draw particles
      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size || 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw projectiles with trails
      for (const p of projectiles) {
        // Draw trail
        for (let i = 0; i < p.trail.length; i++) {
          const t = p.trail[i];
          ctx.save();
          ctx.globalAlpha = t.life * 0.5;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(t.x, t.y, p.r * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Draw projectile
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw enemy projectiles
      for (const p of enemyProjectiles) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw enemies with health bars
      for (const e of enemies) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = e.color;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const barWidth = e.r * 2;
        const hpRatio = e.hp / e.maxHp;
        ctx.fillStyle = "#333";
        ctx.fillRect(e.x - barWidth/2, e.y - e.r - 10, barWidth, 4);
        ctx.fillStyle = hpRatio > 0.5 ? "#00FF00" : hpRatio > 0.25 ? "#FFFF00" : "#FF0000";
        ctx.fillRect(e.x - barWidth/2, e.y - e.r - 10, barWidth * hpRatio, 4);
        ctx.restore();
      }

      // Draw player
      ctx.save();
      if (spawnImmunityRef.current) {
        ctx.globalAlpha = 0.5 + Math.sin(time * 10) * 0.3;
      }
      ctx.shadowBlur = 20;
      ctx.shadowColor = ELEMENTAL_POWERS[currentPower].color;
      ctx.fillStyle = playerSkin;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
      ctx.fill();

      // Elemental aura
      ctx.strokeStyle = ELEMENTAL_POWERS[currentPower].color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r + 4 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
      ctx.stroke();

      // Aim line
      ctx.strokeStyle = ELEMENTAL_POWERS[currentPower].color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(
        player.x + Math.cos(player.angle) * 40,
        player.y + Math.sin(player.angle) * 40
      );
      ctx.stroke();
      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [gameState, currentPower, touchscreenMode, playerSkin]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-background p-4">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            Score: {score}
          </Badge>
          {hasPermission && (
            <Button variant="ghost" size="sm" onClick={() => setChatOpen(!chatOpen)}>
              <MessageSquare className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Game states */}
      {gameState === "ready" && (
        <Card className="p-8 text-center space-y-4 max-w-md">
          <h2 className="text-2xl font-bold">School Mode</h2>
          <p className="text-muted-foreground">
            Master the elements! Use Fire, Water, Earth, and Air powers to defeat enemies.
            No weapons - only elemental magic!
          </p>
          <div className="grid grid-cols-2 gap-2">
            {POWER_ORDER.map((power, i) => (
              <div key={power} className="flex items-center gap-2 p-2 bg-secondary rounded-lg">
                <span style={{ color: ELEMENTAL_POWERS[power].color }}>
                  {ELEMENTAL_POWERS[power].icon}
                </span>
                <span className="text-sm">{i + 1}. {ELEMENTAL_POWERS[power].name}</span>
              </div>
            ))}
          </div>
          <Button onClick={startGame} variant="gaming" className="w-full">
            Start Game
          </Button>
        </Card>
      )}

      {gameState === "gameover" && (
        <Card className="p-8 text-center space-y-4 max-w-md">
          <h2 className="text-2xl font-bold text-destructive">Game Over</h2>
          <p className="text-lg">Final Score: {score}</p>
          <div className="flex gap-2">
            <Button onClick={startGame} variant="gaming" className="flex-1">
              Play Again
            </Button>
            <Button onClick={onBack} variant="outline" className="flex-1">
              Exit
            </Button>
          </div>
        </Card>
      )}

      {gameState === "playing" && (
        <>
          <canvas
            ref={canvasRef}
            width={960}
            height={640}
            className="border border-border rounded-lg shadow-2xl max-w-full max-h-[70vh]"
            style={{ aspectRatio: "960/640" }}
          />

          {/* HUD */}
          <div className="absolute bottom-20 left-4 space-y-2">
            {/* Health */}
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              <Progress value={health} className="w-32 h-3" />
              <span className="text-sm">{health}/100</span>
            </div>

            {/* Spawn immunity indicator */}
            {spawnImmunity && (
              <Badge variant="secondary" className="animate-pulse">
                Spawn Protection Active
              </Badge>
            )}
          </div>

          {/* Elemental Powers */}
          <div className="absolute bottom-20 right-4 flex gap-2">
            {POWER_ORDER.map((power, i) => {
              const config = ELEMENTAL_POWERS[power];
              const isActive = power === currentPower;
              return (
                <button
                  key={power}
                  onClick={() => setCurrentPower(power)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isActive 
                      ? "border-white bg-secondary scale-110" 
                      : "border-transparent bg-secondary/50 hover:bg-secondary"
                  }`}
                  style={{ 
                    boxShadow: isActive ? `0 0 15px ${config.color}` : "none" 
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span style={{ color: config.color }}>{config.icon}</span>
                    <span className="text-xs">{i + 1}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Touch controls */}
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
        </>
      )}

      {/* Admin Chat */}
      {chatOpen && hasPermission && (
        <AdminChat 
          open={chatOpen}
          onOpenChange={setChatOpen}
          onCommand={handleCommand} 
        />
      )}
    </div>
  );
};