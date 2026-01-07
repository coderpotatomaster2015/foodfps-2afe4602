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
import { DailyRewards } from "@/components/game/DailyRewards";
import { BanModal } from "@/components/game/BanModal";
import { GameSidebar } from "@/components/game/GameSidebar";
import { SettingsModal } from "@/components/game/SettingsModal";
import { TeacherPanel } from "@/components/game/TeacherPanel";
import { OwnerPanel } from "@/components/game/OwnerPanel";
import { AdBanner } from "@/components/game/AdBanner";
import { AdSignupModal } from "@/components/game/AdSignupModal";
import { GlobalChat } from "@/components/game/GlobalChat";
import { useAuth } from "@/hooks/useAuth";
import { useGameStatus } from "@/hooks/useGameStatus";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, GraduationCap, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { applyRainbowToDocument, removeRainbowFromDocument } from "@/utils/rainbowEffect";

export type GameMode = "solo" | "host" | "join" | "offline" | "boss" | null;

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>("");
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [roomCode, setRoomCode] = useState<string>("");
  const [isInGame, setIsInGame] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [isBetaTester, setIsBetaTester] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [showTeacherPanel, setShowTeacherPanel] = useState(false);
  const [showAdSignup, setShowAdSignup] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showUpdates, setShowUpdates] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showBetaPanel, setShowBetaPanel] = useState(false);
  const [showSkinsShop, setShowSkinsShop] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showDailyRewards, setShowDailyRewards] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [touchscreenMode, setTouchscreenMode] = useState(false);
  const [websiteEnabled, setWebsiteEnabled] = useState(true);
  const [disabledMessage, setDisabledMessage] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [soloDisabled, setSoloDisabled] = useState(false);
  const [multiplayerDisabled, setMultiplayerDisabled] = useState(false);
  const [bossDisabled, setBossDisabled] = useState(false);
  const [currentSkin, setCurrentSkin] = useState("#FFF3D6");

  // Real-time game status hook
  const gameStatus = useGameStatus(user?.id || null);

  useEffect(() => {
    checkWebsiteStatus();
    // Load touchscreen mode from localStorage
    const savedTouchscreen = localStorage.getItem("foodfps_touchscreen");
    if (savedTouchscreen) setTouchscreenMode(savedTouchscreen === "true");
    // Load skin from localStorage
    const savedSkin = localStorage.getItem("foodfps_skin");
    if (savedSkin) setCurrentSkin(savedSkin);
  }, []);

  // Handle real-time status updates
  useEffect(() => {
    if (!gameStatus.websiteEnabled && !isAdmin) {
      setWebsiteEnabled(false);
    }
  }, [gameStatus.websiteEnabled, isAdmin]);

  // Handle ultimate rainbow mode
  useEffect(() => {
    const hasUltimate = gameStatus.adminAbuseEvents.some(e => e.event_type === "ultimate");
    if (hasUltimate) {
      applyRainbowToDocument();
    } else {
      removeRainbowFromDocument();
    }
    return () => removeRainbowFromDocument();
  }, [gameStatus.adminAbuseEvents]);

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }

    checkAdminRole();
    checkTeacherRole();
    checkBetaTester();
    loadUserProfile();
    loadUnreadMessages();
  }, [user, loading, navigate]);

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
        setSoloDisabled((data as any).solo_disabled || false);
        setMultiplayerDisabled((data as any).multiplayer_disabled || false);
        setBossDisabled((data as any).boss_disabled || false);
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
      .in("role", ["admin", "owner"]);

    setIsAdmin(data && data.length > 0);
    setIsOwner(data?.some(r => r.role === "owner") || false);
  };

  const checkTeacherRole = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "teacher")
      .maybeSingle();

    setIsTeacher(!!data);
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

  const handleTouchscreenChange = (enabled: boolean) => {
    setTouchscreenMode(enabled);
    localStorage.setItem("foodfps_touchscreen", String(enabled));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Left Sidebar for game tabs */}
      {user && !gameMode && (
        <GameSidebar
          unreadMessages={unreadMessages}
          isAdmin={isAdmin}
          isBetaTester={isBetaTester}
          onShowMessages={() => setShowMessages(true)}
          onShowUpdates={() => setShowUpdates(true)}
          onShowSocial={() => setShowSocial(true)}
          onShowSkinsShop={() => setShowSkinsShop(true)}
          onShowLeaderboard={() => setShowLeaderboard(true)}
          onShowDailyRewards={() => setShowDailyRewards(true)}
          onShowBetaPanel={() => setShowBetaPanel(true)}
          onShowSettings={() => setShowSettings(true)}
        />
      )}

      {/* Top right bar - Admin, Owner, Teacher and Logout */}
      <div className="fixed top-4 right-4 flex gap-2 z-50">
        {isTeacher && !isAdmin && (
          <Button variant="secondary" size="sm" onClick={() => setShowTeacherPanel(true)} className="gap-2">
            <GraduationCap className="w-4 h-4" />
            Teacher
          </Button>
        )}
        {isOwner && (
          <Button size="sm" onClick={() => setShowOwnerPanel(true)} className="gap-2 bg-amber-600 hover:bg-amber-700">
            <Crown className="w-4 h-4" />
            Owner
          </Button>
        )}
        {isAdmin && (
          <Button variant="default" size="sm" onClick={handleAdminClick} className="gap-2">
            <Shield className="w-4 h-4" />
            Admin
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>

      {!websiteEnabled && isAdmin && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm z-50">
          ⚠️ Website disabled for users
        </div>
      )}

      {/* Broadcast Banner */}
      {gameStatus.activeBroadcast && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-lg z-50 max-w-lg text-center animate-pulse">
          <span className="font-semibold">📢 {gameStatus.activeBroadcast.message}</span>
        </div>
      )}

      {/* Admin Abuse Active Indicator */}
      {gameStatus.adminAbuseEvents.length > 0 && (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
          {gameStatus.adminAbuseEvents.map(event => (
            <div key={event.id} className="bg-amber-500/90 text-black px-4 py-2 rounded-lg text-sm font-medium">
              {event.event_type === "godmode" ? "🛡️ Godmode Active!" : "🔫 All Weapons Active!"}
            </div>
          ))}
        </div>
      )}

      <UsernameModal open={showUsernameModal} onUsernameSet={handleUsernameSet} />
      
      {!gameMode && !showUsernameModal && username && (
        <GameModeSelector 
          username={username} 
          onModeSelect={handleModeSelect}
          soloDisabled={soloDisabled}
          multiplayerDisabled={multiplayerDisabled}
          bossDisabled={bossDisabled}
        />
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
          touchscreenMode={touchscreenMode}
          playerSkin={currentSkin}
        />
      )}

      {gameMode === "boss" && (
        <BossMode 
          username={username} 
          onBack={handleBackToMenu}
          adminAbuseEvents={gameStatus.adminAbuseEvents}
          touchscreenMode={touchscreenMode}
          playerSkin={currentSkin}
        />
      )}

      <AdminCodeModal open={showAdminCode} onOpenChange={setShowAdminCode} onSuccess={() => setShowAdminPanel(true)} />
      <AdminPanel open={showAdminPanel} onClose={() => setShowAdminPanel(false)} />
      <OwnerPanel open={showOwnerPanel} onClose={() => setShowOwnerPanel(false)} />
      <MessagesPanel open={showMessages} onOpenChange={setShowMessages} />
      <UpdatesHub open={showUpdates} onOpenChange={setShowUpdates} />
      <SocialFeed open={showSocial} onOpenChange={setShowSocial} />
      <TeacherPanel open={showTeacherPanel} onClose={() => setShowTeacherPanel(false)} />
      <BetaTesterPanel open={showBetaPanel} onOpenChange={setShowBetaPanel} />
      <SkinsShop 
        open={showSkinsShop} 
        onOpenChange={setShowSkinsShop} 
        currentSkin={currentSkin}
        onSkinSelect={(color) => {
          setCurrentSkin(color);
          localStorage.setItem("foodfps_skin", color);
        }}
      />
      <PublicLeaderboard open={showLeaderboard} onOpenChange={setShowLeaderboard} />
      <DailyRewards open={showDailyRewards} onOpenChange={setShowDailyRewards} />
      <SettingsModal 
        open={showSettings} 
        onOpenChange={setShowSettings}
        touchscreenMode={touchscreenMode}
        onTouchscreenModeChange={handleTouchscreenChange}
      />
      <AdSignupModal open={showAdSignup} onOpenChange={setShowAdSignup} />
      
      {/* Ad Banner - shows for non-exempt users when not in game */}
      {user && !gameMode && !isAdmin && (
        <AdBanner userId={user.id} onSignupClick={() => setShowAdSignup(true)} />
      )}

      {/* Global Chat - shows when not in game */}
      {user && !gameMode && username && (
        <div className="fixed bottom-4 left-20 w-80 z-40">
          <GlobalChat userId={user.id} username={username} />
        </div>
      )}
    </div>
  );
};

export default Index;