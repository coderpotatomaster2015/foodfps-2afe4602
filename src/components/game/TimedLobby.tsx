import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Check, Users, Play, Timer, Trophy, Swords } from "lucide-react";
import { toast } from "sonner";
import { useMultiplayer } from "@/hooks/useMultiplayer";

interface TimedLobbyProps {
  mode: "host" | "join";
  username: string;
  roomCode: string;
  timedMinutes: number;
  onStartGame: (timedMinutes: number) => void;
  onBack: () => void;
}

export const TimedLobby = ({ mode, username, roomCode, timedMinutes, onStartGame, onBack }: TimedLobbyProps) => {
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(mode === "join");
  const { players, createRoom, joinRoom, startGame, gameStarted } = useMultiplayer(mode, roomCode, username);

  useEffect(() => {
    const init = async () => {
      if (mode === "host") {
        const code = await createRoom();
        if (code) setGeneratedCode(code);
      } else if (mode === "join" && roomCode) {
        const success = await joinRoom(roomCode);
        setIsConnecting(false);
        if (success) {
          toast.success("Connected to game!");
        }
      }
    };
    init();
  }, [mode, roomCode, createRoom, joinRoom]);

  // Auto-start game when host starts it
  useEffect(() => {
    if (gameStarted && mode === "join") {
      onStartGame(timedMinutes);
    }
  }, [gameStarted, mode, onStartGame, timedMinutes]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    startGame();
    onStartGame(timedMinutes);
  };

  const playerNames = players.map(p => p.username);

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Swords className="w-8 h-8 text-primary" />
          {mode === "host" ? "Timed Match Lobby" : "Joining Match"}
        </h2>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>

      {/* Match Info Card */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Timer className="w-8 h-8 text-primary" />
            <div>
              <h3 className="font-bold text-lg">{timedMinutes} Minute Match</h3>
              <p className="text-sm text-muted-foreground">Each player fights separately</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-lg">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="font-medium">Winner: 5 of each currency!</span>
          </div>
        </div>
      </Card>

      {mode === "host" && (
        <Card className="p-6 bg-card border-border">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Share this code with your friends:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-secondary rounded-lg p-4 text-center">
                  <span className="text-4xl font-bold font-mono tracking-widest text-primary">
                    {generatedCode || "..."}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopyCode}
                  className="h-14 w-14"
                  disabled={!generatedCode}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-bold">Players ({playerNames.length})</h3>
        </div>
        <div className="space-y-2">
          {playerNames.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              Waiting for players to join...
            </div>
          ) : (
            playerNames.map((player, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-3 bg-secondary rounded-lg"
              >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-medium">{player}</span>
                {player === username && (
                  <span className="text-xs text-muted-foreground">(You)</span>
                )}
                {index === 0 && mode === "host" && (
                  <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                    Host
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* How it works */}
      <Card className="p-4 bg-secondary/50 border-border">
        <h4 className="font-medium mb-2">How Timed Matches Work:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Each player fights enemies in their own separate game</li>
          <li>• When time runs out, kills and scores are compared</li>
          <li>• The player with the most kills wins (score is tiebreaker)</li>
          <li>• Winner receives 5 coins, 5 gems, and 5 gold!</li>
        </ul>
      </Card>

      {mode === "join" && isConnecting && (
        <Card className="p-8 bg-card border-border">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Connecting to game {roomCode}...</p>
          </div>
        </Card>
      )}

      {mode === "host" && (
        <Button 
          variant="gaming" 
          size="lg" 
          className="w-full gap-2"
          onClick={handleStartGame}
          disabled={playerNames.length < 2}
        >
          <Play className="w-5 h-5" />
          Start Match ({playerNames.length} player{playerNames.length !== 1 ? 's' : ''})
          {playerNames.length < 2 && <span className="text-xs opacity-70 ml-2">(Need 2+ players)</span>}
        </Button>
      )}

      {mode === "join" && !isConnecting && (
        <Card className="p-4 bg-secondary/50 border-border">
          <div className="text-center text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span>Waiting for host to start the match...</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};