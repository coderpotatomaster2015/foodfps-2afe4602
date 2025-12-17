import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, User, Wifi, WifiOff, Skull } from "lucide-react";
import type { GameMode } from "@/pages/Index";
import { openOfflineGame } from "@/utils/offlineGame";
import { toast } from "sonner";

interface GameModeSelectorProps {
  username: string;
  onModeSelect: (mode: GameMode, roomCode?: string) => void;
}

export const GameModeSelector = ({ username, onModeSelect }: GameModeSelectorProps) => {
  const [joinCode, setJoinCode] = useState("");

  const handleJoinGame = () => {
    if (joinCode.length === 5) {
      onModeSelect("join", joinCode);
    }
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
        <Card className="p-6 bg-card border-border hover:border-primary transition-colors cursor-pointer group"
          onClick={() => onModeSelect("solo")}
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:glow-primary transition-all">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Solo Mode</h3>
              <p className="text-sm text-muted-foreground">Play alone and fight endless waves of enemies</p>
            </div>
            <Button variant="gaming" className="w-full">
              Play Solo
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border hover:border-primary transition-colors cursor-pointer group"
          onClick={() => onModeSelect("host")}
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:glow-primary transition-all">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Host Game</h3>
              <p className="text-sm text-muted-foreground">Create a room and invite friends to join</p>
            </div>
            <Button variant="gaming" className="w-full">
              <Wifi className="w-4 h-4 mr-2" />
              Host Online
            </Button>
          </div>
        </Card>
      </div>

      {/* Boss Mode - New */}
      <Card className="p-6 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30 hover:border-red-500 transition-colors cursor-pointer group"
        onClick={() => onModeSelect("boss")}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Skull className="w-6 h-6 text-red-500" />
              Boss Mode
            </h3>
            <p className="text-sm text-muted-foreground">Fight progressively harder bosses and earn currencies!</p>
          </div>
          <Button variant="destructive" className="glow-destructive">
            Challenge Bosses
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-card border-border">
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Join Game</h3>
          <div className="flex gap-2">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))}
              placeholder="Enter 5-digit code"
              className="bg-input border-border text-center text-lg font-mono tracking-widest"
              maxLength={5}
            />
            <Button 
              onClick={handleJoinGame} 
              variant="accent"
              disabled={joinCode.length !== 5}
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
