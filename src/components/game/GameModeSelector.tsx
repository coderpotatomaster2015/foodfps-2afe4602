import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, User, Wifi, WifiOff, Skull, Timer, Trophy } from "lucide-react";
import type { GameMode } from "@/pages/Index";
import { openOfflineGame } from "@/utils/offlineGame";
import { toast } from "sonner";

interface GameModeSelectorProps {
  username: string;
  onModeSelect: (mode: GameMode, roomCode?: string, timedMinutes?: number) => void;
  soloDisabled?: boolean;
  multiplayerDisabled?: boolean;
  bossDisabled?: boolean;
}

export const GameModeSelector = ({ 
  username, 
  onModeSelect, 
  soloDisabled = false,
  multiplayerDisabled = false,
  bossDisabled = false
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
    <div className="w-full max-w-2xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Food FPS
        </h1>
        <p className="text-muted-foreground">Welcome, <span className="text-primary font-semibold">{username}</span></p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card 
          className={`p-6 bg-card border-border transition-colors ${soloDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary cursor-pointer group'}`}
          onClick={() => !soloDisabled && onModeSelect("solo")}
        >
          <div className="space-y-4">
            <div className={`w-12 h-12 rounded-lg bg-secondary flex items-center justify-center transition-all ${!soloDisabled && 'group-hover:bg-primary group-hover:glow-primary'}`}>
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Solo Mode</h3>
              <p className="text-sm text-muted-foreground">
                {soloDisabled ? "This mode is currently disabled" : "Play alone and fight endless waves of enemies"}
              </p>
            </div>
            <Button variant="gaming" className="w-full" disabled={soloDisabled}>
              {soloDisabled ? "Disabled" : "Play Solo"}
            </Button>
          </div>
        </Card>

        <Card 
          className={`p-6 bg-card border-border transition-colors ${multiplayerDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary cursor-pointer group'}`}
          onClick={() => !multiplayerDisabled && setShowHostOptions(true)}
        >
          <div className="space-y-4">
            <div className={`w-12 h-12 rounded-lg bg-secondary flex items-center justify-center transition-all ${!multiplayerDisabled && 'group-hover:bg-primary group-hover:glow-primary'}`}>
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Host Game</h3>
              <p className="text-sm text-muted-foreground">
                {multiplayerDisabled ? "This mode is currently disabled" : "Create a timed match - compete for kills & score!"}
              </p>
            </div>
            <Button variant="gaming" className="w-full" disabled={multiplayerDisabled}>
              <Wifi className="w-4 h-4 mr-2" />
              {multiplayerDisabled ? "Disabled" : "Host Match"}
            </Button>
          </div>
        </Card>
      </div>

      {/* Host Options Modal */}
      {showHostOptions && (
        <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 animate-in fade-in slide-in-from-bottom-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Timer className="w-5 h-5 text-primary" />
                Choose Match Duration
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowHostOptions(false)}>
                Cancel
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Each player fights enemies separately. At the end, the player with the most kills wins!
              <span className="block mt-1 text-primary font-medium">
                <Trophy className="w-4 h-4 inline mr-1" />
                Winner gets 5 coins, 5 gems, and 5 gold!
              </span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="gaming" 
                size="lg"
                onClick={() => handleHostTimed(5)}
                className="h-20 flex-col gap-1"
              >
                <Timer className="w-6 h-6" />
                <span className="text-lg font-bold">5 Minutes</span>
                <span className="text-xs opacity-80">Quick Match</span>
              </Button>
              <Button 
                variant="gaming" 
                size="lg"
                onClick={() => handleHostTimed(10)}
                className="h-20 flex-col gap-1"
              >
                <Timer className="w-6 h-6" />
                <span className="text-lg font-bold">10 Minutes</span>
                <span className="text-xs opacity-80">Full Match</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Boss Mode */}
      <Card 
        className={`p-6 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30 transition-colors ${bossDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-red-500 cursor-pointer group'}`}
        onClick={() => !bossDisabled && onModeSelect("boss")}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Skull className="w-6 h-6 text-red-500" />
              Boss Mode
            </h3>
            <p className="text-sm text-muted-foreground">
              {bossDisabled ? "This mode is currently disabled" : "Fight progressively harder bosses and earn currencies!"}
            </p>
          </div>
          <Button variant="destructive" className="glow-destructive" disabled={bossDisabled}>
            {bossDisabled ? "Disabled" : "Challenge Bosses"}
          </Button>
        </div>
      </Card>

      <Card className={`p-6 bg-card border-border ${multiplayerDisabled ? 'opacity-50' : ''}`}>
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Join Game</h3>
          <div className="flex gap-2">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))}
              placeholder="Enter 5-digit code"
              className="bg-input border-border text-center text-lg font-mono tracking-widest"
              maxLength={5}
              disabled={multiplayerDisabled}
            />
            <Button 
              onClick={handleJoinGame} 
              variant="accent"
              disabled={joinCode.length !== 5 || multiplayerDisabled}
            >
              Join
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card border-border hover:border-accent transition-colors cursor-pointer"
        onClick={() => {
          openOfflineGame(username);
          toast.success("Offline game opened in new window!");
        }}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <WifiOff className="w-5 h-5" />
              Play Offline Version
            </h3>
            <p className="text-sm text-muted-foreground">Works without internet connection</p>
          </div>
          <Button variant="outline">
            Play Offline
          </Button>
        </div>
      </Card>
    </div>
  );
};
