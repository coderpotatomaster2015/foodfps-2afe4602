import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UsernameModal } from "@/components/game/UsernameModal";
import { GameModeSelector } from "@/components/game/GameModeSelector";
import { GameCanvas } from "@/components/game/GameCanvas";
import { BossMode } from "@/components/game/BossMode";
import { RankedMode } from "@/components/game/RankedMode";
import { YouVsMeMode } from "@/components/game/YouVsMeMode";
import { SchoolMode } from "@/components/game/SchoolMode";
import { Lobby } from "@/components/game/Lobby";
import { TimedLobby } from "@/components/game/TimedLobby";
import { TimedGameCanvas } from "@/components/game/TimedGameCanvas";
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
import { GlobalChatModal } from "@/components/game/GlobalChatModal";
import { PopupAd } from "@/components/game/PopupAd";
import { TutorialModal } from "@/components/game/TutorialModal";
import { FeedbackButton } from "@/components/game/FeedbackButton";
import { RedeemCodeModal } from "@/components/game/RedeemCodeModal";
import { PublicScheduleModal } from "@/components/game/PublicScheduleModal";
import { FoodPassModal } from "@/components/game/FoodPassModal";
import { PlayerProfileModal } from "@/components/game/PlayerProfileModal";
import { InventoryModal } from "@/components/game/InventoryModal";
import { ShopModal } from "@/components/game/ShopModal";
import { useAuth } from "@/hooks/useAuth";
import { useGameStatus } from "@/hooks/useGameStatus";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, GraduationCap, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { applyRainbowToDocument, removeRainbowFromDocument } from "@/utils/rainbowEffect";

export type GameMode = "solo" | "host" | "join" | "offline" | "boss" | "timed-host" | "timed-join" | "ranked" | "youvsme" | "school" | null;

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>("");
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [roomCode, setRoomCode] = useState<string>("");
  const [timedMinutes, setTimedMinutes] = useState<number>(0);
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
  const [showGlobalChat, setShowGlobalChat] = useState(false);
  const [showRedeemCodes, setShowRedeemCodes] = useState(false);
  const [showEventSchedule, setShowEventSchedule] = useState(false);
  const [showFoodPass, setShowFoodPass] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showItemShop, setShowItemShop] = useState(false);
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
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialChecked, setTutorialChecked] = useState(false);
  const [equippedPower, setEquippedPower] = useState<string | null>(null);
  const [isClassMode, setIsClassMode] = useState(false);

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
    // Load equipped power from localStorage
    const savedPower = localStorage.getItem("equippedPower");
    if (savedPower) setEquippedPower(savedPower);
    // Check if user is in class mode
    const classMode = localStorage.getItem("isClassMode") === "true";
    setIsClassMode(classMode);
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
      setTutorialChecked(true);
      return;
    }
    
    try {
      const { data } = await supabase
        .from("profiles")
        .select("username, tutorial_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) {
        setUsername(data.username);
        // Check if tutorial needs to be shown
        const tutorialCompletedLocal = localStorage.getItem("foodfps_tutorial_completed") === "true";
        const tutorialCompleted = data.tutorial_completed || tutorialCompletedLocal;
        
        if (!tutorialCompleted) {
          setShowTutorial(true);
        }
      } else {
        const emailUsername = user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`;
        setUsername(emailUsername);
        // New user, show tutorial
        setShowTutorial(true);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      const emailUsername = user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`;
      setUsername(emailUsername);
    } finally {
      setProfileLoaded(true);
      setTutorialChecked(true);
    }
  };

  const handleTutorialComplete = (isMobile: boolean) => {
    setShowTutorial(false);
    if (isMobile) {
      setTouchscreenMode(true);
      localStorage.setItem("foodfps_touchscreen", "true");
      toast.success("Touch controls enabled! Rotate your device to landscape for best experience.");
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

  const handleModeSelect = (mode: GameMode, code?: string, timed?: number) => {
    // If timed is set, this is a timed match (host mode with timed minutes)
    if (timed && timed > 0) {
      setGameMode("timed-host");
      setTimedMinutes(timed);
    } else {
      setGameMode(mode);
    }
    if (code) setRoomCode(code);
  };

  const handleStartGame = () => setIsInGame(true);
  
  const handleTimedStartGame = (minutes: number) => {
    setTimedMinutes(minutes);
    setIsInGame(true);
  };

  const handleBackToMenu = () => {
    setGameMode(null);
    setRoomCode("");
    setTimedMinutes(0);
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

  if (loading || checkingStatus || !profileLoaded || !tutorialChecked) {
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
          onShowGlobalChat={() => setShowGlobalChat(true)}
          onShowInventory={() => setShowInventory(true)}
          onShowItemShop={() => setShowItemShop(true)}
          onShowRedeemCodes={() => setShowRedeemCodes(true)}
          onShowEventSchedule={() => setShowEventSchedule(true)}
          onShowFoodPass={() => setShowFoodPass(true)}
          onShowProfile={() => setShowProfile(true)}
          onShowRanked={() => setGameMode("ranked")}
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
            <div key={event.id} className="bg-amber-500/90 text-black px-4 py-2 rounded-lg text-sm font-medium animate-pulse">
              {event.event_type === "godmode" && "🛡️ Godmode Active!"}
              {event.event_type === "all_weapons" && "🔫 All Weapons Active!"}
              {event.event_type === "ultimate" && "🌈 Ultimate Rainbow Mode!"}
            </div>
          ))}
        </div>
      )}

      <UsernameModal open={showUsernameModal} onUsernameSet={handleUsernameSet} />
      <TutorialModal open={showTutorial} onComplete={handleTutorialComplete} />
      
      {!gameMode && !showUsernameModal && username && (
        <GameModeSelector 
          username={username} 
          onModeSelect={handleModeSelect}
          soloDisabled={soloDisabled || isClassMode}
          multiplayerDisabled={multiplayerDisabled || isClassMode}
          bossDisabled={bossDisabled || isClassMode}
          isClassMode={isClassMode}
        />
      )}

      {/* Standard Lobby for non-timed matches */}
      {gameMode && !isInGame && (gameMode === "host" || gameMode === "join") && (
        <Lobby mode={gameMode} username={username} roomCode={roomCode} onStartGame={handleStartGame} onBack={handleBackToMenu} />
      )}

      {/* Timed Match Lobby */}
      {gameMode === "timed-host" && !isInGame && (
        <TimedLobby 
          mode="host"
          username={username}
          roomCode={roomCode}
          timedMinutes={timedMinutes}
          onStartGame={handleTimedStartGame}
          onBack={handleBackToMenu}
        />
      )}

      {/* Standard Game - Solo, Offline, or standard multiplayer */}
      {(isInGame || gameMode === "solo" || gameMode === "offline") && gameMode !== "boss" && gameMode !== "timed-host" && (
        <GameCanvas 
          mode={gameMode as Exclude<GameMode, null | "boss" | "timed-host" | "timed-join">} 
          username={username} 
          roomCode={roomCode} 
          onBack={handleBackToMenu}
          adminAbuseEvents={gameStatus.adminAbuseEvents}
          touchscreenMode={touchscreenMode}
          playerSkin={currentSkin}
        />
      )}

      {/* Timed Match Game */}
      {gameMode === "timed-host" && isInGame && (
        <TimedGameCanvas
          username={username}
          roomCode={roomCode}
          timedMinutes={timedMinutes}
          onBack={handleBackToMenu}
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

      {gameMode === "ranked" && (
        <RankedMode
          username={username}
          onBack={handleBackToMenu}
          touchscreenMode={touchscreenMode}
          playerSkin={currentSkin}
        />
      )}

      {gameMode === "youvsme" && (
        <YouVsMeMode
          username={username}
          onBack={handleBackToMenu}
          touchscreenMode={touchscreenMode}
          playerSkin={currentSkin}
        />
      )}

      {gameMode === "school" && (
        <SchoolMode
          username={username}
          onBack={handleBackToMenu}
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
      <RedeemCodeModal open={showRedeemCodes} onOpenChange={setShowRedeemCodes} />
      <FoodPassModal open={showFoodPass} onOpenChange={setShowFoodPass} />
      <PlayerProfileModal open={showProfile} onOpenChange={setShowProfile} />
      <InventoryModal 
        open={showInventory} 
        onOpenChange={setShowInventory}
        onEquipPower={(power) => setEquippedPower(power)}
      />
      <ShopModal open={showItemShop} onOpenChange={setShowItemShop} />
      
      {/* Global Chat Modal */}
      {user && username && (
        <GlobalChatModal
          open={showGlobalChat}
          onOpenChange={setShowGlobalChat}
          userId={user.id}
          username={username}
        />
      )}
      
      {/* Ad Banner - shows for non-exempt users when not in game */}
      {user && !gameMode && !isAdmin && (
        <AdBanner userId={user.id} onSignupClick={() => setShowAdSignup(true)} />
      )}

      {/* Popup Ads - shows for non-exempt users when not in game */}
      {user && !gameMode && !isAdmin && (
        <PopupAd userId={user.id} onSignupClick={() => setShowAdSignup(true)} />
      )}

      {/* Feedback Button */}
      {user && username && !gameMode && (
        <FeedbackButton userId={user.id} username={username} />
      )}

      {/* Event Schedule Modal */}
      <PublicScheduleModal open={showEventSchedule} onOpenChange={setShowEventSchedule} />
    </div>
  );
};

export default Index;