import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UsernameModal } from "@/components/game/UsernameModal";
import { GameModeSelector } from "@/components/game/GameModeSelector";
import { GameCanvas } from "@/components/game/GameCanvas";
import { Lobby } from "@/components/game/Lobby";
import { AdminPanel } from "@/components/game/AdminPanel";
import { WebsiteDisabled } from "@/components/game/WebsiteDisabled";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type GameMode = "solo" | "host" | "join" | "offline" | null;

const Index = () => {
  const { user, loading, isGuest } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>("");
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [roomCode, setRoomCode] = useState<string>("");
  const [isInGame, setIsInGame] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [websiteEnabled, setWebsiteEnabled] = useState(true);
  const [disabledMessage, setDisabledMessage] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check website status and admin role
  useEffect(() => {
    checkWebsiteStatus();
  }, []);

  useEffect(() => {
    if (loading) return;
    
    // If not logged in and not guest, redirect to auth
    if (!user && !isGuest) {
      navigate("/auth");
      return;
    }

    // For logged in users, check admin role and get username
    if (user) {
      checkAdminRole();
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

  const checkWebsiteStatus = async () => {
    try {
      const { data } = await supabase
        .from("game_settings")
        .select("*")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .single();

      if (data) {
        setWebsiteEnabled(data.website_enabled);
        setDisabledMessage(data.disabled_message || "");
      }
    } catch (error) {
      console.error("Error checking website status:", error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const checkAdminRole = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!data);
  };

  const loadUserProfile = async () => {
    if (!user) return;
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

  if (loading || checkingStatus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show disabled page for non-admins when website is disabled
  if (!websiteEnabled && !isAdmin) {
    return <WebsiteDisabled message={disabledMessage} />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Top bar with logout and admin button */}
      <div className="fixed top-4 right-4 flex gap-2">
        {isAdmin && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowAdminPanel(true)}
            className="gap-2"
          >
            <Shield className="w-4 h-4" />
            Admin Panel
          </Button>
        )}
        {user && (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/auth");
            }}
          >
            Logout
          </Button>
        )}
      </div>

      {/* Website disabled banner for admins */}
      {!websiteEnabled && isAdmin && (
        <div className="fixed top-4 left-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm">
          ⚠️ Website is disabled for regular users
        </div>
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

      <AdminPanel
        open={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />
    </div>
  );
};

export default Index;
