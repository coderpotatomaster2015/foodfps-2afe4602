import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, User, Wifi, WifiOff, Skull, Timer, Trophy, Swords, Bot, GraduationCap, Lock, Heart, Biohazard, Target, Flag, Shield, Mountain, Crosshair, UserCheck, Zap, Circle, Gauge, Crown, Ghost, FlipHorizontal, Orbit, Sparkles, Droplets, Snowflake, Dumbbell } from "lucide-react";
import type { GameMode } from "@/pages/Index";
import { openOfflineGame } from "@/utils/offlineGame";
import { toast } from "sonner";

interface GameModeSelectorProps {
  username: string;
  onModeSelect: (mode: GameMode, roomCode?: string, timedMinutes?: number) => void;
  soloDisabled?: boolean;
  multiplayerDisabled?: boolean;
  bossDisabled?: boolean;
  isClassMode?: boolean;
}

export const GameModeSelector = ({ 
  username, 
  onModeSelect, 
  soloDisabled = false,
  multiplayerDisabled = false,
  bossDisabled = false,
  isClassMode = false
}: GameModeSelectorProps) => {
  const [joinCode, setJoinCode] = useState("");
  const [showHostOptions, setShowHostOptions] = useState(false);

  const handleJoinGame = () => {
    if (joinCode.length === 5) {
      onModeSelect("join", joinCode);
    }
  };

  const handleHostTimed = (minutes: number) => {
    onModeSelect("host", undefined, minutes);
    setShowHostOptions(false);
  };

  // If class mode, show only School Mode
  if (isClassMode) {
    return (
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center justify-center gap-2">
            <GraduationCap className="w-8 h-8" />
            School Mode
          </h1>
          <p className="text-muted-foreground">Welcome, <span className="text-primary font-semibold">{username}</span></p>
          <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
            You joined via class code. Only School Mode is available.
          </p>
        </div>

        <Card 
          className="p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50 hover:border-green-400 cursor-pointer group transition-all hover:scale-105"
          onClick={() => onModeSelect("school")}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-green-500/30 flex items-center justify-center transition-all group-hover:bg-green-500 group-hover:scale-110">
              <GraduationCap className="w-7 h-7 text-green-400 group-hover:text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Play School Mode</h3>
              <p className="text-sm text-muted-foreground">
                Use elemental powers: Fire, Water, Earth, Air
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-2">
          <p className="text-xs text-center text-muted-foreground">Other modes are locked for class members</p>
          <div className="flex flex-wrap gap-2 justify-center opacity-50">
            <div className="flex items-center gap-1 text-xs bg-secondary/30 rounded px-2 py-1">
              <Lock className="w-3 h-3" /> Solo
            </div>
            <div className="flex items-center gap-1 text-xs bg-secondary/30 rounded px-2 py-1">
              <Lock className="w-3 h-3" /> Boss
            </div>
            <div className="flex items-center gap-1 text-xs bg-secondary/30 rounded px-2 py-1">
              <Lock className="w-3 h-3" /> Ranked
            </div>
            <div className="flex items-center gap-1 text-xs bg-secondary/30 rounded px-2 py-1">
              <Lock className="w-3 h-3" /> You vs Me
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl space-y-4">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Food FPS
        </h1>
        <p className="text-muted-foreground">Welcome, <span className="text-primary font-semibold">{username}</span></p>
      </div>

      {/* Main Game Modes - 2x3 Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card 
          className={`p-4 bg-card border-border transition-colors ${soloDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary cursor-pointer group'}`}
          onClick={() => !soloDisabled && onModeSelect("solo")}
        >
          <div className="space-y-3">
            <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all ${!soloDisabled && 'group-hover:bg-primary group-hover:glow-primary'}`}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Solo</h3>
              <p className="text-xs text-muted-foreground">
                {soloDisabled ? "Disabled" : "Endless waves"}
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-4 bg-card border-border transition-colors ${bossDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-destructive cursor-pointer group'}`}
          onClick={() => !bossDisabled && onModeSelect("boss")}
        >
          <div className="space-y-3">
            <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all ${!bossDisabled && 'group-hover:bg-destructive'}`}>
              <Skull className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Boss</h3>
              <p className="text-xs text-muted-foreground">
                {bossDisabled ? "Disabled" : "Fight bosses"}
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 bg-card border-border hover:border-primary cursor-pointer group"
          onClick={() => onModeSelect("ranked")}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-primary">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Ranked</h3>
              <p className="text-xs text-muted-foreground">
                7 waves, ranks
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 bg-card border-border hover:border-accent cursor-pointer group"
          onClick={() => onModeSelect("youvsme")}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-accent">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">You vs Me</h3>
              <p className="text-xs text-muted-foreground">
                1v1 AI duel
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 bg-card border-border hover:border-green-500 cursor-pointer group"
          onClick={() => onModeSelect("school")}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-green-500">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">School</h3>
              <p className="text-xs text-muted-foreground">
                Elemental powers
              </p>
            </div>
          </div>
        </Card>

        {/* New Game Modes Row */}
        <Card 
          className="p-4 bg-card border-border hover:border-orange-500 cursor-pointer group"
          onClick={() => onModeSelect("survival")}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-orange-500">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Survival</h3>
              <p className="text-xs text-muted-foreground">
                Wave-based
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 bg-card border-border hover:border-emerald-500 cursor-pointer group"
          onClick={() => onModeSelect("zombie")}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-emerald-500">
              <Biohazard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Zombie</h3>
              <p className="text-xs text-muted-foreground">
                Horde mode
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 bg-card border-border hover:border-red-500 cursor-pointer group"
          onClick={() => onModeSelect("arena")}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-red-500">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Arena</h3>
              <p className="text-xs text-muted-foreground">
                25-kill win
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 bg-card border-border hover:border-purple-500 cursor-pointer group"
          onClick={() => onModeSelect("infection")}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-purple-500">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Infection</h3>
              <p className="text-xs text-muted-foreground">
                Survive infected
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 bg-card border-border hover:border-cyan-500 cursor-pointer group"
          onClick={() => onModeSelect("ctf")}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-cyan-500">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">CTF</h3>
              <p className="text-xs text-muted-foreground">
                Capture 3 flags
              </p>
            </div>
          </div>
        </Card>

        {/* New Game Modes Row 2 */}
        <Card 
          className="p-4 bg-card border-border hover:border-amber-600 cursor-pointer group"
          onClick={() => onModeSelect("koth")}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-amber-600">
              <Mountain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">King of Hill</h3>
              <p className="text-xs text-muted-foreground">
                Hold the zone
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 bg-card border-border hover:border-yellow-500 cursor-pointer group"
          onClick={() => onModeSelect("gungame")}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-yellow-500">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Gun Game</h3>
              <p className="text-xs text-muted-foreground">
                Cycle weapons
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 bg-card border-border hover:border-blue-500 cursor-pointer group"
          onClick={() => onModeSelect("vip")}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-blue-500">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Protect VIP</h3>
              <p className="text-xs text-muted-foreground">
                Guard the VIP
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 bg-card border-border hover:border-rose-500 cursor-pointer group"
          onClick={() => onModeSelect("lms")}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-rose-500">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Last Man</h3>
              <p className="text-xs text-muted-foreground">
                No respawns
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 bg-card border-border hover:border-lime-500 cursor-pointer group"
          onClick={() => onModeSelect("dodgeball")}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-lime-500">
              <Circle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Dodgeball</h3>
              <p className="text-xs text-muted-foreground">
                Dodge & throw
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border hover:border-indigo-500 cursor-pointer group" onClick={() => onModeSelect("blitz")}>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-indigo-500">
              <Gauge className="w-5 h-5" />
            </div>
            <div><h3 className="text-lg font-bold">Blitz Rush</h3><p className="text-xs text-muted-foreground">Fast, short bursts</p></div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border hover:border-amber-500 cursor-pointer group" onClick={() => onModeSelect("juggernaut")}>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-amber-500"><Crown className="w-5 h-5" /></div>
            <div><h3 className="text-lg font-bold">Juggernaut</h3><p className="text-xs text-muted-foreground">Tank build survival</p></div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border hover:border-violet-500 cursor-pointer group" onClick={() => onModeSelect("stealth")}>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-violet-500"><Ghost className="w-5 h-5" /></div>
            <div><h3 className="text-lg font-bold">Stealth Ops</h3><p className="text-xs text-muted-foreground">Hard hits, low profile</p></div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border hover:border-sky-500 cursor-pointer group" onClick={() => onModeSelect("mirror")}>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-sky-500"><FlipHorizontal className="w-5 h-5" /></div>
            <div><h3 className="text-lg font-bold">Mirror Shift</h3><p className="text-xs text-muted-foreground">Flipped controls</p></div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border hover:border-cyan-600 cursor-pointer group" onClick={() => onModeSelect("lowgrav")}>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-cyan-600"><Orbit className="w-5 h-5" /></div>
            <div><h3 className="text-lg font-bold">Low Gravity</h3><p className="text-xs text-muted-foreground">Wide movement arcs</p></div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border hover:border-fuchsia-500 cursor-pointer group" onClick={() => onModeSelect("chaos")}>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-fuchsia-500"><Sparkles className="w-5 h-5" /></div>
            <div><h3 className="text-lg font-bold">Chaos Lab</h3><p className="text-xs text-muted-foreground">Unpredictable waves</p></div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border hover:border-red-600 cursor-pointer group" onClick={() => onModeSelect("headhunter")}>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-red-600"><Crosshair className="w-5 h-5" /></div>
            <div><h3 className="text-lg font-bold">Headhunter</h3><p className="text-xs text-muted-foreground">Precision damage bonus</p></div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border hover:border-rose-600 cursor-pointer group" onClick={() => onModeSelect("vampire")}>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-rose-600"><Droplets className="w-5 h-5" /></div>
            <div><h3 className="text-lg font-bold">Vampire</h3><p className="text-xs text-muted-foreground">Drain health on kills</p></div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border hover:border-blue-300 cursor-pointer group" onClick={() => onModeSelect("frostbite")}>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-blue-300"><Snowflake className="w-5 h-5" /></div>
            <div><h3 className="text-lg font-bold">Frostbite</h3><p className="text-xs text-muted-foreground">Slow enemies</p></div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border hover:border-slate-500 cursor-pointer group" onClick={() => onModeSelect("titan")}>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all group-hover:bg-slate-500"><Dumbbell className="w-5 h-5" /></div>
            <div><h3 className="text-lg font-bold">Titan Arena</h3><p className="text-xs text-muted-foreground">Big units, big hits</p></div>
          </div>
        </Card>
      </div>

      {/* Multiplayer Section */}
      <Card className={`p-4 bg-card border-border ${multiplayerDisabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold">Multiplayer</h3>
              <p className="text-xs text-muted-foreground">Compete for kills</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="gaming" 
              size="sm"
              onClick={() => !multiplayerDisabled && setShowHostOptions(true)}
              disabled={multiplayerDisabled}
            >
              <Wifi className="w-4 h-4 mr-1" />
              Host
            </Button>
            <div className="flex gap-1">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))}
                placeholder="CODE"
                className="w-20 text-center text-sm font-mono"
                maxLength={5}
                disabled={multiplayerDisabled}
              />
              <Button 
                onClick={handleJoinGame} 
                variant="accent"
                size="sm"
                disabled={joinCode.length !== 5 || multiplayerDisabled}
              >
                Join
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Host Options Modal */}
      {showHostOptions && (
        <Card className="p-4 border-primary/30 animate-in fade-in slide-in-from-bottom-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Timer className="w-5 h-5 text-primary" />
                Match Duration
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowHostOptions(false)}>
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              <Trophy className="w-3 h-3 inline mr-1" />
              Winner gets 5 coins, 5 gems, and 5 gold!
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="gaming" 
                onClick={() => handleHostTimed(5)}
                className="h-14 flex-col gap-0.5"
              >
                <Timer className="w-5 h-5" />
                <span className="font-bold">5 Min</span>
              </Button>
              <Button 
                variant="gaming" 
                onClick={() => handleHostTimed(10)}
                className="h-14 flex-col gap-0.5"
              >
                <Timer className="w-5 h-5" />
                <span className="font-bold">10 Min</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Offline Mode */}
      <Card className="p-3 bg-card border-border hover:border-accent transition-colors cursor-pointer"
        onClick={() => {
          openOfflineGame(username);
          toast.success("Offline game opened!");
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Play Offline</span>
          </div>
          <Button variant="outline" size="sm">
            Launch
          </Button>
        </div>
      </Card>
    </div>
  );
};
