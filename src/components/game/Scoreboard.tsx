import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Skull, Target, ArrowLeft } from "lucide-react";

interface PlayerStats {
  username: string;
  kills: number;
  deaths: number;
  score: number;
}

interface ScoreboardProps {
  players: PlayerStats[];
  currentPlayer: string;
  onBack: () => void;
}

export const Scoreboard = ({ players, currentPlayer, onBack }: ScoreboardProps) => {
  const sortedPlayers = [...players].sort((a, b) => b.kills - a.kills);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-card border-border p-6 space-y-6">
        <div className="text-center space-y-2">
          <Trophy className="w-12 h-12 mx-auto text-yellow-500" />
          <h1 className="text-3xl font-bold">Match Complete!</h1>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-4 px-4 py-2 text-sm text-muted-foreground font-medium">
            <span>Rank</span>
            <span>Player</span>
            <span className="text-center">K/D</span>
            <span className="text-right">Score</span>
          </div>

          {sortedPlayers.map((player, index) => {
            const isCurrentPlayer = player.username === currentPlayer;
            const kd = player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toString();
            
            return (
              <Card 
                key={player.username}
                className={`grid grid-cols-4 gap-4 px-4 py-3 items-center ${
                  isCurrentPlayer ? "bg-primary/20 border-primary" : "bg-secondary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {index === 0 && <Trophy className="w-5 h-5 text-yellow-500" />}
                  {index === 1 && <Trophy className="w-5 h-5 text-gray-400" />}
                  {index === 2 && <Trophy className="w-5 h-5 text-amber-700" />}
                  {index > 2 && <span className="w-5 text-center">{index + 1}</span>}
                  <span className="font-medium">#{index + 1}</span>
                </div>
                
                <span className={`font-medium ${isCurrentPlayer ? "text-primary" : ""}`}>
                  {player.username}
                  {isCurrentPlayer && " (You)"}
                </span>
                
                <div className="flex items-center justify-center gap-2">
                  <span className="flex items-center gap-1 text-green-500">
                    <Target className="w-4 h-4" />
                    {player.kills}
                  </span>
                  <span className="text-muted-foreground">/</span>
                  <span className="flex items-center gap-1 text-red-500">
                    <Skull className="w-4 h-4" />
                    {player.deaths}
                  </span>
                  <span className="text-muted-foreground ml-2">({kd})</span>
                </div>
                
                <span className="text-right font-bold text-primary">{player.score}</span>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-center pt-4">
          <Button variant="gaming" size="lg" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Menu
          </Button>
        </div>
      </Card>
    </div>
  );
};
