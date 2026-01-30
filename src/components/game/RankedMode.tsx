import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Swords, Heart, Trophy, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TouchControls } from "./TouchControls";

interface RankedModeProps {
  username: string;
  onBack: () => void;
  touchscreenMode: boolean;
  playerSkin: string;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  type: "normal" | "fast" | "tank" | "elite";
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  angle: number;
  isPlayer: boolean;
}

const WAVE_CONFIG = [
  { count: 8, types: ["normal"], spawnDelay: 1000 },
  { count: 12, types: ["normal", "fast"], spawnDelay: 800 },
  { count: 15, types: ["normal", "fast", "tank"], spawnDelay: 600 },
  { count: 18, types: ["normal", "fast", "tank"], spawnDelay: 500 },
  { count: 20, types: ["fast", "tank", "elite"], spawnDelay: 400 },
  { count: 25, types: ["fast", "tank", "elite"], spawnDelay: 350 },
  { count: 30, types: ["tank", "elite"], spawnDelay: 300 },
];

const RANK_THRESHOLDS = [
  { rank: "bronze", minWaves: 1 },
  { rank: "gold", minWaves: 3 },
  { rank: "diamond", minWaves: 5 },
  { rank: "pro", minWaves: 7 },
];

export const RankedMode = ({ username, onBack, touchscreenMode, playerSkin }: RankedModeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"ready" | "playing" | "waveComplete" | "victory" | "defeat">("ready");
  const [currentWave, setCurrentWave] = useState(1);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [enemiesKilled, setEnemiesKilled] = useState(0);
  const [totalEnemiesInWave, setTotalEnemiesInWave] = useState(0);
  const [earnedRank, setEarnedRank] = useState<string | null>(null);
  const [earnedTier, setEarnedTier] = useState<number | null>(null);

  const playerRef = useRef({ x: 480, y: 320, angle: 0 });
  const bulletsRef = useRef<Bullet[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const lastShotRef = useRef(0);
  const enemyIdRef = useRef(0);
  const bulletIdRef = useRef(0);
  const spawnedCountRef = useRef(0);
  const animationFrameRef = useRef<number>();

  const getEnemyStats = (type: Enemy["type"], wave: number) => {
    const waveMultiplier = 1 + (wave - 1) * 0.15;
    switch (type) {
      case "fast":
        return { health: Math.floor(40 * waveMultiplier), speed: 3.5, damage: 8, color: "#00FF00" };
      case "tank":
        return { health: Math.floor(150 * waveMultiplier), speed: 1, damage: 20, color: "#0000FF" };
      case "elite":
        return { health: Math.floor(100 * waveMultiplier), speed: 2.5, damage: 15, color: "#FF00FF" };
      default:
        return { health: Math.floor(60 * waveMultiplier), speed: 2, damage: 10, color: "#FF0000" };
    }
  };

  const spawnEnemy = useCallback(() => {
    const waveConfig = WAVE_CONFIG[currentWave - 1];
    if (!waveConfig || spawnedCountRef.current >= waveConfig.count) return;

    const types = waveConfig.types as Enemy["type"][];
    const type = types[Math.floor(Math.random() * types.length)];
    const stats = getEnemyStats(type, currentWave);

    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    switch (side) {
      case 0: x = Math.random() * 960; y = -30; break;
      case 1: x = 990; y = Math.random() * 640; break;
      case 2: x = Math.random() * 960; y = 670; break;
      case 3: x = -30; y = Math.random() * 640; break;
    }

    const newEnemy: Enemy = {
      id: enemyIdRef.current++,
      x,
      y,
      health: stats.health,
      maxHealth: stats.health,
      type,
    };

    setEnemies(prev => [...prev, newEnemy]);
    spawnedCountRef.current++;
  }, [currentWave]);

  const startWave = useCallback(() => {
    const waveConfig = WAVE_CONFIG[currentWave - 1];
    if (!waveConfig) return;

    setGameState("playing");
    setEnemies([]);
    setEnemiesKilled(0);
    setTotalEnemiesInWave(waveConfig.count);
    spawnedCountRef.current = 0;
    playerRef.current = { x: 480, y: 320, angle: 0 };

    // Spawn enemies over time
    const spawnInterval = setInterval(() => {
      if (spawnedCountRef.current < waveConfig.count) {
        spawnEnemy();
      } else {
        clearInterval(spawnInterval);
      }
    }, waveConfig.spawnDelay);

    return () => clearInterval(spawnInterval);
  }, [currentWave, spawnEnemy]);

  const calculateRank = (wavesCompleted: number): { rank: string; tier: number } | null => {
    if (wavesCompleted === 0) return null;

    let bestRank = RANK_THRESHOLDS[0];
    for (const threshold of RANK_THRESHOLDS) {
      if (wavesCompleted >= threshold.minWaves) {
        bestRank = threshold;
      }
    }

    // Calculate tier (1-5) based on performance within rank
    let tier = 1;
    if (bestRank.rank === "pro") {
      tier = 1; // Pro is single tier
    } else {
      const nextRankIndex = RANK_THRESHOLDS.findIndex(t => t.rank === bestRank.rank) + 1;
      if (nextRankIndex < RANK_THRESHOLDS.length) {
        const nextThreshold = RANK_THRESHOLDS[nextRankIndex];
        const progress = (wavesCompleted - bestRank.minWaves) / (nextThreshold.minWaves - bestRank.minWaves);
        tier = Math.min(5, Math.floor(progress * 5) + 1);
      } else {
        tier = 5;
      }
    }

    return { rank: bestRank.rank, tier };
  };

  const endMatch = async (victory: boolean) => {
    const wavesCompleted = victory ? 7 : currentWave - 1;
    const rankResult = calculateRank(wavesCompleted);

    if (rankResult) {
      setEarnedRank(rankResult.rank);
      setEarnedTier(rankResult.tier);
    }

    setGameState(victory ? "victory" : "defeat");

    // Save to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Save match history
        await supabase.from("ranked_matches").insert({
          user_id: user.id,
          waves_completed: wavesCompleted,
          enemies_killed: enemiesKilled,
          victory,
          rank_earned: rankResult?.rank || null,
          tier_earned: rankResult?.tier || null,
        });

        // Update profile rank if better
        if (rankResult) {
          const { data: currentProfile } = await supabase
            .from("profiles")
            .select("ranked_rank, ranked_tier")
            .eq("user_id", user.id)
            .single();

          const rankOrder = ["bronze", "gold", "diamond", "pro"];
          const currentRankIndex = currentProfile?.ranked_rank ? rankOrder.indexOf(currentProfile.ranked_rank) : -1;
          const newRankIndex = rankOrder.indexOf(rankResult.rank);

          const shouldUpdate = newRankIndex > currentRankIndex ||
            (newRankIndex === currentRankIndex && (rankResult.tier || 0) > (currentProfile?.ranked_tier || 0));

          if (shouldUpdate) {
            await supabase
              .from("profiles")
              .update({
                ranked_rank: rankResult.rank,
                ranked_tier: rankResult.tier,
              })
              .eq("user_id", user.id);

            toast.success(`New rank achieved: ${rankResult.rank.toUpperCase()} ${rankResult.tier}!`);
          }
        }
      }
    } catch (error) {
      console.error("Error saving ranked match:", error);
    }
  };

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = () => {
      const player = playerRef.current;
      const speed = 5;

      // Movement
      if (keysRef.current.has("w") || keysRef.current.has("arrowup")) player.y -= speed;
      if (keysRef.current.has("s") || keysRef.current.has("arrowdown")) player.y += speed;
      if (keysRef.current.has("a") || keysRef.current.has("arrowleft")) player.x -= speed;
      if (keysRef.current.has("d") || keysRef.current.has("arrowright")) player.x += speed;

      player.x = Math.max(20, Math.min(940, player.x));
      player.y = Math.max(20, Math.min(620, player.y));

      // Update bullets
      bulletsRef.current = bulletsRef.current.filter(bullet => {
        bullet.x += Math.cos(bullet.angle) * 10;
        bullet.y += Math.sin(bullet.angle) * 10;
        return bullet.x > 0 && bullet.x < 960 && bullet.y > 0 && bullet.y < 640;
      });

      // Update enemies and check collisions
      setEnemies(prevEnemies => {
        let newEnemies = [...prevEnemies];
        let newHealth = playerHealth;
        let killed = 0;

        newEnemies = newEnemies.map(enemy => {
          const stats = getEnemyStats(enemy.type, currentWave);
          const dx = player.x - enemy.x;
          const dy = player.y - enemy.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Move toward player
          if (dist > 30) {
            enemy.x += (dx / dist) * stats.speed;
            enemy.y += (dy / dist) * stats.speed;
          } else {
            // Damage player
            newHealth -= stats.damage * 0.02;
          }

          // Check bullet collisions
          bulletsRef.current.forEach((bullet, bIdx) => {
            if (bullet.isPlayer) {
              const bDist = Math.sqrt((bullet.x - enemy.x) ** 2 + (bullet.y - enemy.y) ** 2);
              if (bDist < 25) {
                enemy.health -= 20;
                bulletsRef.current.splice(bIdx, 1);
              }
            }
          });

          return enemy;
        });

        // Remove dead enemies
        const aliveEnemies = newEnemies.filter(e => e.health > 0);
        killed = newEnemies.length - aliveEnemies.length;

        if (killed > 0) {
          setEnemiesKilled(prev => prev + killed);
        }

        if (newHealth !== playerHealth) {
          setPlayerHealth(Math.max(0, newHealth));
        }

        return aliveEnemies;
      });

      // Check win/lose conditions
      if (playerHealth <= 0) {
        endMatch(false);
        return;
      }

      // Draw
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, 960, 640);

      // Grid
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      for (let i = 0; i < 960; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 640);
        ctx.stroke();
      }
      for (let i = 0; i < 640; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(960, i);
        ctx.stroke();
      }

      // Draw enemies
      enemies.forEach(enemy => {
        const stats = getEnemyStats(enemy.type, currentWave);
        ctx.fillStyle = stats.color;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.type === "tank" ? 25 : 20, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const healthPercent = enemy.health / enemy.maxHealth;
        ctx.fillStyle = "#333";
        ctx.fillRect(enemy.x - 20, enemy.y - 35, 40, 6);
        ctx.fillStyle = healthPercent > 0.5 ? "#00FF00" : healthPercent > 0.25 ? "#FFFF00" : "#FF0000";
        ctx.fillRect(enemy.x - 20, enemy.y - 35, 40 * healthPercent, 6);
      });

      // Draw bullets
      bulletsRef.current.forEach(bullet => {
        ctx.fillStyle = bullet.isPlayer ? "#FFD700" : "#FF4444";
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw player
      ctx.fillStyle = playerSkin;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, enemies, playerHealth, currentWave, playerSkin]);

  // Check wave complete
  useEffect(() => {
    if (gameState === "playing" && spawnedCountRef.current >= totalEnemiesInWave && enemies.length === 0 && totalEnemiesInWave > 0) {
      if (currentWave >= 7) {
        endMatch(true);
      } else {
        setGameState("waveComplete");
      }
    }
  }, [enemies, gameState, currentWave, totalEnemiesInWave]);

  // Input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());

      if (e.key === " " && gameState === "playing") {
        const now = Date.now();
        if (now - lastShotRef.current > 200) {
          lastShotRef.current = now;
          const player = playerRef.current;
          bulletsRef.current.push({
            id: bulletIdRef.current++,
            x: player.x,
            y: player.y,
            angle: player.angle,
            isPlayer: true,
          });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const player = playerRef.current;
      player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    };

    const handleClick = () => {
      if (gameState !== "playing") return;
      const now = Date.now();
      if (now - lastShotRef.current > 200) {
        lastShotRef.current = now;
        const player = playerRef.current;
        bulletsRef.current.push({
          id: bulletIdRef.current++,
          x: player.x,
          y: player.y,
          angle: player.angle,
          isPlayer: true,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick);
    };
  }, [gameState]);

  const nextWave = () => {
    setCurrentWave(prev => prev + 1);
    setPlayerHealth(Math.min(100, playerHealth + 25));
    startWave();
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case "bronze": return "text-orange-600";
      case "gold": return "text-yellow-500";
      case "diamond": return "text-blue-400";
      case "pro": return "text-purple-500";
      default: return "text-foreground";
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Exit
        </Button>

        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-lg px-4 py-1">
            <Swords className="w-4 h-4 mr-2" />
            Wave {currentWave}/7
          </Badge>
          <div className="flex items-center gap-2 bg-card px-3 py-1 rounded-lg">
            <Heart className="w-4 h-4 text-red-500" />
            <Progress value={playerHealth} className="w-24 h-2" />
          </div>
        </div>
      </div>

      {/* Ready Screen */}
      {gameState === "ready" && (
        <Card className="p-8 text-center space-y-6 max-w-md">
          <div>
            <Medal className="w-16 h-16 mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-bold">Ranked Mode</h2>
            <p className="text-muted-foreground mt-2">
              Survive 7 waves of increasingly difficult enemies to earn your rank!
            </p>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>🥉 Bronze: Complete 1 wave</p>
            <p>🥇 Gold: Complete 3 waves</p>
            <p>💎 Diamond: Complete 5 waves</p>
            <p>👑 Pro: Complete all 7 waves</p>
          </div>

          <Button size="lg" onClick={startWave}>
            <Swords className="w-5 h-5 mr-2" />
            Start Ranked Match
          </Button>
        </Card>
      )}

      {/* Playing */}
      {gameState === "playing" && (
        <>
          <canvas
            ref={canvasRef}
            width={960}
            height={640}
            className="border border-border rounded-lg shadow-lg"
          />
          {touchscreenMode && (
            <TouchControls
              onMove={(dx, dy) => {
                playerRef.current.x += dx * 5;
                playerRef.current.y += dy * 5;
              }}
              onAim={(x, y) => {
                const player = playerRef.current;
                player.angle = Math.atan2(y - player.y, x - player.x);
              }}
              onShoot={(shooting) => {
                if (shooting) {
                  const now = Date.now();
                  if (now - lastShotRef.current > 200) {
                    lastShotRef.current = now;
                    const player = playerRef.current;
                    bulletsRef.current.push({
                      id: bulletIdRef.current++,
                      x: player.x,
                      y: player.y,
                      angle: player.angle,
                      isPlayer: true,
                    });
                  }
                }
              }}
              onReload={() => {}}
              canvasWidth={960}
              canvasHeight={640}
            />
          )}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <Badge>Enemies: {enemiesKilled}/{totalEnemiesInWave}</Badge>
          </div>
        </>
      )}

      {/* Wave Complete */}
      {gameState === "waveComplete" && (
        <Card className="p-8 text-center space-y-4">
          <Trophy className="w-12 h-12 mx-auto text-yellow-500" />
          <h2 className="text-2xl font-bold">Wave {currentWave} Complete!</h2>
          <p className="text-muted-foreground">Enemies killed: {enemiesKilled}</p>
          <p className="text-sm text-green-500">+25 HP restored</p>
          <Button onClick={nextWave}>
            Continue to Wave {currentWave + 1}
          </Button>
        </Card>
      )}

      {/* Victory/Defeat */}
      {(gameState === "victory" || gameState === "defeat") && (
        <Card className="p-8 text-center space-y-4">
          {gameState === "victory" ? (
            <Trophy className="w-16 h-16 mx-auto text-yellow-500" />
          ) : (
            <Swords className="w-16 h-16 mx-auto text-red-500" />
          )}
          <h2 className="text-2xl font-bold">
            {gameState === "victory" ? "Victory!" : "Defeat"}
          </h2>
          <p className="text-muted-foreground">
            Waves completed: {gameState === "victory" ? 7 : currentWave - 1}
          </p>
          {earnedRank && (
            <div className="space-y-2">
              <p className="text-sm">Rank Earned:</p>
              <Badge className={`text-lg ${getRankColor(earnedRank)}`}>
                <Medal className="w-4 h-4 mr-2" />
                {earnedRank.toUpperCase()} {earnedRank !== "pro" && earnedTier}
              </Badge>
            </div>
          )}
          <Button onClick={onBack}>Return to Menu</Button>
        </Card>
      )}
    </div>
  );
};
