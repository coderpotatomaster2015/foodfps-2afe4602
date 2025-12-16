import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UsernameModal } from "@/components/game/UsernameModal";
import { GameModeSelector } from "@/components/game/GameModeSelector";
import { GameCanvas } from "@/components/game/GameCanvas";
import { BossMode } from "@/components/game/BossMode";
import { Lobby } from "@/components/game/Lobby";
import { AdminPanel } from "@/components/game/AdminPanel";
import { AdminCodeModal } from "@/components/game/AdminCodeModal";
import { WebsiteDisabled } from "@/components/game/WebsiteDisabled";
import { MessagesPanel } from "@/components/game/MessagesPanel";
import { UpdatesHub } from "@/components/game/UpdatesHub";
import { SocialFeed } from "@/components/game/SocialFeed";
import { BetaTesterPanel } from "@/components/game/BetaTesterPanel";
import { SkinsShop } from "@/components/game/SkinsShop";
import { PublicLeaderboard } from "@/components/game/PublicLeaderboard";
import { BanModal } from "@/components/game/BanModal";
import { useAuth } from "@/hooks/useAuth";
import { useGameStatus } from "@/hooks/useGameStatus";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, Mail, Sparkles, Globe, FlaskConical, Palette, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type GameMode = "solo" | "host" | "join" | "offline" | "boss" | null;

const Index = () => {
  const { user, loading, isGuest } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>("");
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [roomCode, setRoomCode] = useState<string>("");
  const [isInGame, setIsInGame] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBetaTester, setIsBetaTester] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showUpdates, setShowUpdates] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showBetaPanel, setShowBetaPanel] = useState(false);
  const [showSkinsShop, setShowSkinsShop] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [websiteEnabled, setWebsiteEnabled] = useState(true);
  const [disabledMessage, setDisabledMessage] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Real-time game status hook
  const gameStatus = useGameStatus(user?.id || null);

  useEffect(() => {
    checkWebsiteStatus();
  }, []);

  // Handle real-time status updates
  useEffect(() => {
    if (!gameStatus.websiteEnabled && !isAdmin) {
      setWebsiteEnabled(false);
    }
  }, [gameStatus.websiteEnabled, isAdmin]);

  useEffect(() => {
    if (loading) return;
    
    if (!user && !isGuest) {
      navigate("/auth");
      return;
    }

    if (user) {
      checkAdminRole();
      checkBetaTester();
      loadUserProfile();
      loadUnreadMessages();
    } else if (isGuest) {
      const stored = localStorage.getItem("foodfps_username");
      if (stored) {
        setUsername(stored);
        setProfileLoaded(true);
      } else {
        setShowUsernameModal(true);
        setProfileLoaded(true);
      }
    }
  }, [user, loading, isGuest, navigate]);

  const checkWebsiteStatus = async () => {
    try {
      const { data } = await supabase
        .from("game_settings")
        .select("*")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .maybeSingle();

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
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const checkBetaTester = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("beta_testers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    setIsBetaTester(!!data);
  };

  const loadUserProfile = async () => {
    if (!user) {
      setProfileLoaded(true);
      return;
    }
    
    try {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) {
        setUsername(data.username);
      } else {
        const emailUsername = user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`;
        setUsername(emailUsername);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      const emailUsername = user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`;
      setUsername(emailUsername);
    } finally {
      setProfileLoaded(true);
    }
  };

  const loadUnreadMessages = async () => {
    if (!user) return;
    
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("to_user_id", user.id)
      .eq("is_read", false);

    setUnreadMessages(count || 0);
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

  const handleStartGame = () => setIsInGame(true);

  const handleBackToMenu = () => {
    setGameMode(null);
    setRoomCode("");
    setIsInGame(false);
  };

  const handleLogout = async () => {
    localStorage.removeItem("play_as_guest");
    localStorage.removeItem("foodfps_username");
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleAdminClick = () => {
    setShowAdminCode(true);
  };

  if (loading || checkingStatus || !profileLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show ban modal if user is banned
  if (gameStatus.isBanned && gameStatus.banInfo) {
    return (
      <BanModal 
        open={true} 
        onOpenChange={() => {}} 
        banInfo={gameStatus.banInfo}
      />
    );
  }

  if (!websiteEnabled && !isAdmin) {
    return <WebsiteDisabled message={disabledMessage} />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Top bar */}
      <div className="fixed top-4 right-4 flex gap-2 z-50 flex-wrap justify-end">
        {user && (
          <>
            <Button variant="outline" size="sm" onClick={() => setShowMessages(true)} className="gap-1 relative">
              <Mail className="w-4 h-4" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadMessages}
                </span>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowUpdates(true)} className="gap-1">
              <Sparkles className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSocial(true)} className="gap-1">
              <Globe className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSkinsShop(true)} className="gap-1">
              <Palette className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowLeaderboard(true)} className="gap-1">
              <Trophy className="w-4 h-4" />
            </Button>
            {(isBetaTester || isAdmin) && (
              <Button variant="outline" size="sm" onClick={() => setShowBetaPanel(true)} className="gap-1">
                <FlaskConical className="w-4 h-4" />
              </Button>
            )}
          </>
        )}
        {isAdmin && (
          <Button variant="default" size="sm" onClick={handleAdminClick} className="gap-2">
            <Shield className="w-4 h-4" />
            Admin
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
          <LogOut className="w-4 h-4" />
          {user ? "Logout" : "Exit"}
        </Button>
      </div>

      {!websiteEnabled && isAdmin && (
        <div className="fixed top-4 left-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm z-50">
          ⚠️ Website disabled for users
        </div>
      )}

      <UsernameModal open={showUsernameModal} onUsernameSet={handleUsernameSet} />
      
      {!gameMode && !showUsernameModal && username && (
        <GameModeSelector username={username} onModeSelect={handleModeSelect} />
      )}

      {gameMode && !isInGame && (gameMode === "host" || gameMode === "join") && (
        <Lobby mode={gameMode} username={username} roomCode={roomCode} onStartGame={handleStartGame} onBack={handleBackToMenu} />
      )}

      {(isInGame || gameMode === "solo" || gameMode === "offline") && gameMode !== "boss" && (
        <GameCanvas 
          mode={gameMode as Exclude<GameMode, null | "boss">} 
          username={username} 
          roomCode={roomCode} 
          onBack={handleBackToMenu}
          adminAbuseEvents={gameStatus.adminAbuseEvents}
        />
      )}

      {gameMode === "boss" && (
        <BossMode 
          username={username} 
          onBack={handleBackToMenu}
          adminAbuseEvents={gameStatus.adminAbuseEvents}
        />
      )}

      <AdminCodeModal open={showAdminCode} onOpenChange={setShowAdminCode} onSuccess={() => setShowAdminPanel(true)} />
      <AdminPanel open={showAdminPanel} onClose={() => setShowAdminPanel(false)} />
      <MessagesPanel open={showMessages} onOpenChange={setShowMessages} />
      <UpdatesHub open={showUpdates} onOpenChange={setShowUpdates} />
      <SocialFeed open={showSocial} onOpenChange={setShowSocial} />
      <BetaTesterPanel open={showBetaPanel} onOpenChange={setShowBetaPanel} />
      <SkinsShop open={showSkinsShop} onOpenChange={setShowSkinsShop} />
      <PublicLeaderboard open={showLeaderboard} onOpenChange={setShowLeaderboard} />
    </div>
  );
};

export default Index;