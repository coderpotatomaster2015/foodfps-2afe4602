import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, User, Wifi, WifiOff, Skull, Timer, Trophy, Swords, Bot, GraduationCap, Lock } from "lucide-react";
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

  return (
    <div className="w-full max-w-3xl space-y-4">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Food FPS
        </h1>
        <p className="text-muted-foreground">Welcome, <span className="text-primary font-semibold">{username}</span></p>
      </div>

      {/* Main Game Modes - 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card 
          className={`p-4 bg-card border-border transition-colors ${soloDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary cursor-pointer group'}`}
          onClick={() => !soloDisabled && onModeSelect("solo")}
        >
          <div className="space-y-3">
            <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all ${!soloDisabled && 'group-hover:bg-primary group-hover:glow-primary'}`}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Solo Mode</h3>
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
              <h3 className="text-lg font-bold">Boss Mode</h3>
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
                7 waves, earn ranks
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
              <h3 className="text-lg font-bold">You vs. Me</h3>
              <p className="text-xs text-muted-foreground">
                1v1 AI duel
              </p>
            </div>
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
