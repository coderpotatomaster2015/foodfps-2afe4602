import { useState, useEffect } from "react";
import { UsernameModal } from "@/components/game/UsernameModal";
import { GameModeSelector } from "@/components/game/GameModeSelector";
import { GameCanvas } from "@/components/game/GameCanvas";
import { Lobby } from "@/components/game/Lobby";

export type GameMode = "solo" | "host" | "join" | "offline" | null;

const Index = () => {
  const [username, setUsername] = useState<string>("");
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [roomCode, setRoomCode] = useState<string>("");
  const [isInGame, setIsInGame] = useState(false);

  // Show username modal on first visit
  const [showUsernameModal, setShowUsernameModal] = useState(() => {
    const stored = localStorage.getItem("foodfps_username");
    return !stored;
  });

  useEffect(() => {
    const stored = localStorage.getItem("foodfps_username");
    if (stored) setUsername(stored);
  }, []);

  const handleUsernameSet = (name: string) => {
    setUsername(name);
    localStorage.setItem("foodfps_username", name);
    setShowUsernameModal(false);
  };

  const handleModeSelect = (mode: GameMode, code?: string) => {
    setGameMode(mode);
    if (code) setRoomCode(code);
  };

  const handleStartGame = () => {
    setIsInGame(true);
  };

  const handleBackToMenu = () => {
    setGameMode(null);
    setRoomCode("");
    setIsInGame(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <UsernameModal 
        open={showUsernameModal} 
        onUsernameSet={handleUsernameSet} 
      />
      
      {!gameMode && !showUsernameModal && (
        <GameModeSelector 
          username={username} 
          onModeSelect={handleModeSelect} 
        />
      )}

      {gameMode && !isInGame && (gameMode === "host" || gameMode === "join") && (
        <Lobby
          mode={gameMode}
          username={username}
          roomCode={roomCode}
          onStartGame={handleStartGame}
          onBack={handleBackToMenu}
        />
      )}

      {(isInGame || gameMode === "solo" || gameMode === "offline") && (
        <GameCanvas
          mode={gameMode as Exclude<GameMode, null>}
          username={username}
          roomCode={roomCode}
          onBack={handleBackToMenu}
        />
      )}
    </div>
  );
};

export default Index;
