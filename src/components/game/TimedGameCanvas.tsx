import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Timer, Trophy, Swords, ArrowLeft } from "lucide-react";
import { TouchControls } from "./TouchControls";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMultiplayer } from "@/hooks/useMultiplayer";

interface TimedGameCanvasProps {
  username: string;
  roomCode: string;
  timedMinutes: number;
  onBack: () => void;
  touchscreenMode?: boolean;
  playerSkin?: string;
}

interface GameResult {
  username: string;
  kills: number;
  score: number;
  isWinner: boolean;
}

type Weapon = "pistol" | "shotgun" | "minigun" | "sniper" | "sword";

const WEAPONS: Record<Weapon, { name: string; fireRate: number; damage: number; ammo: number; maxAmmo: number; spread: number; bulletSpeed: number; color: string; isMelee: boolean }> = {
  pistol: { name: "Pistol", fireRate: 0.18, damage: 40, ammo: 10, maxAmmo: 10, spread: 10, bulletSpeed: 420, color: "#FFB84D", isMelee: false },
  shotgun: { name: "Shotgun", fireRate: 0.5, damage: 25, ammo: 6, maxAmmo: 6, spread: 40, bulletSpeed: 380, color: "#FF6B6B", isMelee: false },
  sword: { name: "Sword", fireRate: 0.4, damage: 80, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 0, color: "#C0C0C0", isMelee: true },
  sniper: { name: "Sniper", fireRate: 1.0, damage: 120, ammo: 5, maxAmmo: 5, spread: 0, bulletSpeed: 800, color: "#A6FFB3", isMelee: false },
  minigun: { name: "Minigun", fireRate: 0.05, damage: 20, ammo: 100, maxAmmo: 100, spread: 20, bulletSpeed: 500, color: "#6BAFFF", isMelee: false },
};

const WEAPON_ORDER: Weapon[] = ["pistol", "shotgun", "sword", "sniper", "minigun"];

export const TimedGameCanvas = ({ 
  username, 
  roomCode, 
  timedMinutes, 
  onBack, 
  touchscreenMode = false, 
  playerSkin = "#FFF3D6" 
}: TimedGameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeRemaining, setTimeRemaining] = useState(timedMinutes * 60);
  const [kills, setKills] = useState(0);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [ammo, setAmmo] = useState(10);
  const [maxAmmo, setMaxAmmo] = useState(10);
  const [currentWeapon, setCurrentWeapon] = useState<Weapon>("pistol");
  const [gameOver, setGameOver] = useState(false);
  const [results, setResults] = useState<GameResult[]>([]);
  const [isWinner, setIsWinner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const touchMoveRef = useRef({ x: 0, y: 0 });
  const touchAimRef = useRef({ x: 480, y: 320 });
  const touchShootingRef = useRef(false);
  const gameStateRef = useRef<any>({ enemies: [], pickups: [], bullets: [], W: 960, H: 640 });
  const playerRef = useRef<any>(null);
  const gameLoopRef = useRef<number | null>(null);
  const killsRef = useRef(0);
  const scoreRef = useRef(0);
  
  const { players, broadcastBullet } = useMultiplayer("host", roomCode, username);

  useEffect(() => {
    setIsMobile('ontouchstart' in window);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (gameOver) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameOver]);

  const endGame = async () => {
    setGameOver(true);
    
    // Broadcast final score
    const channel = supabase.channel(`timed-game-${roomCode}`);
    await channel.subscribe();
    
    channel.send({
      type: 'broadcast',
      event: 'final_score',
      payload: { username, kills: killsRef.current, score: scoreRef.current }
    });

    // Wait for other players' scores
    const allResults: GameResult[] = [{ username, kills: killsRef.current, score: scoreRef.current, isWinner: false }];
    
    channel.on('broadcast', { event: 'final_score' }, (payload) => {
      if (payload.payload.username !== username) {
        allResults.push({ ...payload.payload, isWinner: false });
      }
    });

    // Wait 3 seconds for all scores
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Determine winner
    allResults.sort((a, b) => {
      if (b.kills !== a.kills) return b.kills - a.kills;
      return b.score - a.score;
    });
    
    if (allResults.length > 0) {
      allResults[0].isWinner = true;
    }
    
    const imWinner = allResults[0]?.username === username;
    setIsWinner(imWinner);
    setResults(allResults);
    
    // Award currency if winner
    if (imWinner) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.rpc("add_player_currency", {
            _user_id: user.id,
            _coins: 5,
            _gems: 5,
            _gold: 5
          });
          toast.success("🎉 You won! +5 coins, +5 gems, +5 gold!");
        }
      } catch (error) {
        console.error("Error awarding currency:", error);
      }
    }
    
    supabase.removeChannel(channel);
  };

  // Game initialization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 960, H = 640;
    gameStateRef.current.W = W;
    gameStateRef.current.H = H;

    const player = {
      x: W / 2,
      y: H / 2,
      r: 20,
      hp: 100,
      angle: 0,
      speed: 200,
      weaponIndex: 0,
      ammo: WEAPONS.pistol.ammo,
      maxAmmo: WEAPONS.pistol.maxAmmo,
      lastShot: 0,
    };
    playerRef.current = player;

    const keys: Record<string, boolean> = {};
    let mouse = { x: W / 2, y: H / 2 };
    let shooting = false;

    const handleKeyDown = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleMouseDown = () => { shooting = true; };
    const handleMouseUp = () => { shooting = false; };
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      player.weaponIndex = (player.weaponIndex + (e.deltaY > 0 ? 1 : WEAPON_ORDER.length - 1)) % WEAPON_ORDER.length;
      const newWeapon = WEAPON_ORDER[player.weaponIndex];
      player.ammo = WEAPONS[newWeapon].ammo;
      player.maxAmmo = WEAPONS[newWeapon].maxAmmo;
      setCurrentWeapon(newWeapon);
      setAmmo(player.ammo);
      setMaxAmmo(player.maxAmmo);
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    const spawnEnemy = () => {
      const side = Math.floor(Math.random() * 4);
      let x, y;
      if (side === 0) { x = rand(0, W); y = -30; }
      else if (side === 1) { x = rand(0, W); y = H + 30; }
      else if (side === 2) { x = -30; y = rand(0, H); }
      else { x = W + 30; y = rand(0, H); }
      
      gameStateRef.current.enemies.push({
        x, y, r: 20, hp: 60, maxHp: 60, speed: 80 + Math.random() * 40,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
      });
    };

    let lastTime = performance.now();
    let spawnTimer = 0;

    const gameLoop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Update player position
      let dx = 0, dy = 0;
      if (touchscreenMode && (isMobile || touchMoveRef.current.x !== 0 || touchMoveRef.current.y !== 0)) {
        dx = touchMoveRef.current.x * player.speed;
        dy = touchMoveRef.current.y * player.speed;
        mouse = touchAimRef.current;
        shooting = touchShootingRef.current;
      } else {
        if (keys["w"] || keys["arrowup"]) dy -= player.speed;
        if (keys["s"] || keys["arrowdown"]) dy += player.speed;
        if (keys["a"] || keys["arrowleft"]) dx -= player.speed;
        if (keys["d"] || keys["arrowright"]) dx += player.speed;
      }

      player.x = Math.max(player.r, Math.min(W - player.r, player.x + dx * dt));
      player.y = Math.max(player.r, Math.min(H - player.r, player.y + dy * dt));
      player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

      // Spawn enemies
      spawnTimer += dt;
      if (spawnTimer > 1.5) {
        spawnEnemy();
        spawnTimer = 0;
      }

      // Shooting
      const weapon = WEAPONS[WEAPON_ORDER[player.weaponIndex]];
      if (shooting && time - player.lastShot > weapon.fireRate * 1000 && player.ammo > 0) {
        if (weapon.isMelee) {
          // Melee attack
          gameStateRef.current.enemies.forEach((e: any) => {
            const dist = Math.hypot(e.x - player.x, e.y - player.y);
            if (dist < 60) {
              e.hp -= weapon.damage;
            }
          });
        } else {
          const spreadCount = WEAPON_ORDER[player.weaponIndex] === "shotgun" ? 5 : 1;
          for (let i = 0; i < spreadCount; i++) {
            const spreadAngle = player.angle + (Math.random() - 0.5) * (weapon.spread * Math.PI / 180);
            gameStateRef.current.bullets.push({
              x: player.x,
              y: player.y,
              vx: Math.cos(spreadAngle) * weapon.bulletSpeed,
              vy: Math.sin(spreadAngle) * weapon.bulletSpeed,
              damage: weapon.damage,
              color: weapon.color,
              r: 4,
            });
          }
        }
        player.ammo--;
        player.lastShot = time;
        setAmmo(player.ammo);
      }

      // Reload
      if (keys["r"] && player.ammo < player.maxAmmo) {
        player.ammo = player.maxAmmo;
        setAmmo(player.ammo);
      }

      // Update bullets
      gameStateRef.current.bullets = gameStateRef.current.bullets.filter((b: any) => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        
        // Check enemy hits
        for (let i = gameStateRef.current.enemies.length - 1; i >= 0; i--) {
          const e = gameStateRef.current.enemies[i];
          if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + b.r) {
            e.hp -= b.damage;
            return false;
          }
        }
        
        return b.x > 0 && b.x < W && b.y > 0 && b.y < H;
      });

      // Update enemies
      gameStateRef.current.enemies = gameStateRef.current.enemies.filter((e: any) => {
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(angle) * e.speed * dt;
        e.y += Math.sin(angle) * e.speed * dt;
        
        // Check collision with player
        if (Math.hypot(e.x - player.x, e.y - player.y) < e.r + player.r) {
          player.hp -= 10;
          setHealth(Math.max(0, player.hp));
          if (player.hp <= 0) {
            player.hp = 100;
            setHealth(100);
          }
          return false;
        }
        
        // Check if dead
        if (e.hp <= 0) {
          killsRef.current++;
          scoreRef.current += 10;
          setKills(killsRef.current);
          setScore(scoreRef.current);
          return false;
        }
        
        return true;
      });

      // Draw
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, W, H);

      // Draw grid
      ctx.strokeStyle = "#2a2a4e";
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

      // Draw enemies
      gameStateRef.current.enemies.forEach((e: any) => {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
        
        // Health bar
        ctx.fillStyle = "#333";
        ctx.fillRect(e.x - 15, e.y - e.r - 8, 30, 4);
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(e.x - 15, e.y - e.r - 8, 30 * (e.hp / e.maxHp), 4);
      });

      // Draw bullets
      gameStateRef.current.bullets.forEach((b: any) => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw player
      ctx.fillStyle = playerSkin;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
      ctx.fill();
      
      // Player direction
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(player.x + Math.cos(player.angle) * 30, player.y + Math.sin(player.angle) * 30);
      ctx.stroke();

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [username, playerSkin, touchscreenMode, isMobile]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (gameOver) {
    return (
      <div className="fixed inset-0 bg-background/95 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-lg p-8 space-y-6">
          <div className="text-center space-y-4">
            {isWinner ? (
              <>
                <Trophy className="w-16 h-16 mx-auto text-yellow-500" />
                <h2 className="text-3xl font-bold text-yellow-500">You Won!</h2>
                <p className="text-muted-foreground">+5 coins, +5 gems, +5 gold awarded!</p>
              </>
            ) : (
              <>
                <Swords className="w-16 h-16 mx-auto text-muted-foreground" />
                <h2 className="text-3xl font-bold">Match Over</h2>
              </>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-center">Results</h3>
            {results.map((result, index) => (
              <div 
                key={result.username}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  result.isWinner ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-secondary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">{index + 1}.</span>
                  <span className="font-medium">{result.username}</span>
                  {result.isWinner && <Trophy className="w-4 h-4 text-yellow-500" />}
                </div>
                <div className="text-right">
                  <p className="font-bold">{result.kills} kills</p>
                  <p className="text-xs text-muted-foreground">{result.score} pts</p>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={onBack} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Menu
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center">
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
        <div className="flex gap-4">
          <Card className="px-4 py-2 flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            <span className={`font-mono text-xl font-bold ${timeRemaining < 30 ? 'text-red-500' : ''}`}>
              {formatTime(timeRemaining)}
            </span>
          </Card>
          <Card className="px-4 py-2">
            <span className="font-medium">Kills: {kills}</span>
          </Card>
          <Card className="px-4 py-2">
            <span className="font-medium">Score: {score}</span>
          </Card>
        </div>
        <Card className="px-4 py-2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{WEAPONS[currentWeapon].name}</span>
          <span className="font-mono">{ammo}/{maxAmmo}</span>
        </Card>
      </div>

      {/* Health bar */}
      <div className="absolute bottom-4 left-4 w-48 z-10">
        <div className="bg-secondary rounded-full h-4 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all"
            style={{ width: `${health}%` }}
          />
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={960}
        height={640}
        className="border border-border rounded-lg shadow-xl"
      />

      {touchscreenMode && (isMobile || true) && (
        <TouchControls
          onMove={(x, y) => { touchMoveRef.current = { x, y }; }}
          onAim={(x, y) => { touchAimRef.current = { x, y }; }}
          onShoot={(shooting) => { touchShootingRef.current = shooting; }}
          onReload={() => { if (playerRef.current) { playerRef.current.ammo = playerRef.current.maxAmmo; setAmmo(playerRef.current.maxAmmo); } }}
          canvasWidth={960}
          canvasHeight={640}
        />
      )}
    </div>
  );
};