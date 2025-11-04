import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useMultiplayer } from "@/hooks/useMultiplayer";

interface LobbyProps {
  mode: "host" | "join";
  username: string;
  roomCode: string;
  onStartGame: () => void;
  onBack: () => void;
}

export const Lobby = ({ mode, username, roomCode, onStartGame, onBack }: LobbyProps) => {
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(mode === "join");
  const { players, createRoom, joinRoom } = useMultiplayer(mode, roomCode, username);

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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const playerNames = players.map(p => p.username);

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">{mode === "host" ? "Game Lobby" : "Joining Game"}</h2>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>

      {mode === "host" && (
        <Card className="p-6 bg-card border-border">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Share this code with your friends:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-secondary rounded-lg p-4 text-center">
                  <span className="text-4xl font-bold font-mono tracking-widest text-primary">
                    {generatedCode}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopyCode}
                  className="h-14 w-14"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 bg-card border-border">
        <h3 className="text-xl font-bold mb-4">Players ({playerNames.length})</h3>
        <div className="space-y-2">
          {playerNames.map((player, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 p-3 bg-secondary rounded-lg"
            >
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="font-medium">{player}</span>
              {index === 0 && (
                <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                  Host
                </span>
              )}
            </div>
          ))}
        </div>
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
          className="w-full"
          onClick={onStartGame}
          disabled={playerNames.length < 1}
        >
          Start Game
        </Button>
      )}

      {mode === "join" && !isConnecting && (
        <div className="text-center text-muted-foreground">
          Waiting for host to start the game...
        </div>
      )}
    </div>
  );
};
