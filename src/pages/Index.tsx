import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UsernameModal } from "@/components/game/UsernameModal";
import { GameModeSelector } from "@/components/game/GameModeSelector";
import { GameCanvas } from "@/components/game/GameCanvas";
import { Lobby } from "@/components/game/Lobby";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export type GameMode = "solo" | "host" | "join" | "offline" | null;

const Index = () => {
  const { user, loading, isGuest } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>("");
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [roomCode, setRoomCode] = useState<string>("");
  const [isInGame, setIsInGame] = useState(false);

  // Show username modal on first visit for guests only
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  useEffect(() => {
    if (loading) return;
    
    // If not logged in and not guest, redirect to auth
    if (!user && !isGuest) {
      navigate("/auth");
      return;
    }

    // For logged in users, get username from profile
    if (user) {
      loadUserProfile();
    } else {
      // For guests, use local storage
      const stored = localStorage.getItem("foodfps_username");
      if (stored) {
        setUsername(stored);
      } else {
        setShowUsernameModal(true);
      }
    }
  }, [user, loading, isGuest, navigate]);

  const loadUserProfile = async () => {
    if (!user) return;
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", user.id)
      .single();
    if (data) setUsername(data.username);
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {user && (
        <Button
          variant="outline"
          size="sm"
          className="absolute top-4 right-4"
          onClick={async () => {
            const { supabase } = await import("@/integrations/supabase/client");
            await supabase.auth.signOut();
            navigate("/auth");
          }}
        >
          Logout
        </Button>
      )}

      <UsernameModal 
        open={showUsernameModal} 
        onUsernameSet={handleUsernameSet} 
      />
      
      {!gameMode && !showUsernameModal && username && (
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
