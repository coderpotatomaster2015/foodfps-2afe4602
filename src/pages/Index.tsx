import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UsernameModal } from "@/components/game/UsernameModal";
import { GameModeSelector } from "@/components/game/GameModeSelector";
import { GameCanvas } from "@/components/game/GameCanvas";
import { Game3DSoloMode } from "@/components/game/Game3DSoloMode";
import { BossMode } from "@/components/game/BossMode";
import { RankedMode } from "@/components/game/RankedMode";
import { YouVsMeMode } from "@/components/game/YouVsMeMode";
import { SchoolMode } from "@/components/game/SchoolMode";
import { SurvivalMode } from "@/components/game/SurvivalMode";
import { ZombieMode } from "@/components/game/ZombieMode";
import { ArenaDeathmatch } from "@/components/game/ArenaDeathmatch";
import { InfectionMode } from "@/components/game/InfectionMode";
import { CaptureTheFlagMode } from "@/components/game/CaptureTheFlagMode";
import { KingOfTheHillMode } from "@/components/game/KingOfTheHillMode";
import { GunGameMode } from "@/components/game/GunGameMode";
import { ProtectTheVIPMode } from "@/components/game/ProtectTheVIPMode";
import { LastManStandingMode } from "@/components/game/LastManStandingMode";
import { DodgeballMode } from "@/components/game/DodgeballMode";
import { PayloadMode } from "@/components/game/PayloadMode";
import { SniperEliteMode } from "@/components/game/SniperEliteMode";
import { TagMode } from "@/components/game/TagMode";
import { BountyHunterMode } from "@/components/game/BountyHunterMode";
import { DemolitionMode } from "@/components/game/DemolitionMode";
import { MedicMode } from "@/components/game/MedicMode";
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
import { ServicePanel } from "@/components/game/ServicePanel";
import { ImpersonationBanner } from "@/components/game/ImpersonationBanner";
import { LoginStreakTracker } from "@/components/game/LoginStreakTracker";
import { TermsModal } from "@/components/game/TermsModal";
import { useAuth } from "@/hooks/useAuth";
import { useGameStatus } from "@/hooks/useGameStatus";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, GraduationCap, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { applyRainbowToDocument, removeRainbowFromDocument } from "@/utils/rainbowEffect";

export type GameMode = "solo" | "3d-solo" | "host" | "join" | "offline" | "boss" | "timed-host" | "timed-join" | "ranked" | "youvsme" | "school" | "survival" | "zombie" | "arena" | "infection" | "ctf" | "koth" | "gungame" | "vip" | "lms" | "dodgeball" | "payload" | "sniper" | "tag" | "bounty" | "demolition" | "medic" | "blitz" | "juggernaut" | "stealth" | "mirror" | "lowgrav" | "chaos" | "headhunter" | "vampire" | "frostbite" | "titan" | "quickplay" | null;

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
  const [showServicePanel, setShowServicePanel] = useState(false);
  const [touchscreenMode, setTouchscreenMode] = useState(false);
  const [threeDMode, setThreeDMode] = useState(false);
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
  const [classCodeId, setClassCodeId] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(true); // default true, will be set false if needed
  const [termsChecked, setTermsChecked] = useState(false);

  const gameStatus = useGameStatus(user?.id || null);

  useEffect(() => {
    checkWebsiteStatus();
    const savedTouchscreen = localStorage.getItem("foodfps_touchscreen");
    if (savedTouchscreen) setTouchscreenMode(savedTouchscreen === "true");
    const savedSkin = localStorage.getItem("foodfps_skin");
    if (savedSkin) setCurrentSkin(savedSkin);
    const savedPower = localStorage.getItem("equippedPower");
    if (savedPower) setEquippedPower(savedPower);
    const classMode = localStorage.getItem("isClassMode") === "true";
    setIsClassMode(classMode);
    const saved3D = localStorage.getItem("foodfps_3d");
    setThreeDMode(saved3D === "true");
  }, []);

  useEffect(() => {
    if (!gameStatus.websiteEnabled && !isAdmin) { setWebsiteEnabled(false); }
  }, [gameStatus.websiteEnabled, isAdmin]);

  useEffect(() => {
    const hasUltimate = gameStatus.adminAbuseEvents.some(e => e.event_type === "ultimate");
    if (hasUltimate) { applyRainbowToDocument(); } else { removeRainbowFromDocument(); }
    return () => removeRainbowFromDocument();
  }, [gameStatus.adminAbuseEvents]);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    checkAdminRole(); checkTeacherRole(); checkBetaTester(); checkClassMemberStatus(); loadUserProfile(); loadUnreadMessages();
  }, [user, loading, navigate]);

  const checkClassMemberStatus = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.rpc('is_class_member', { _user_id: user.id });
      if (data === true) {
        setIsClassMode(true); localStorage.setItem("isClassMode", "true");
        const { data: memberData } = await supabase.from("class_members").select("class_code_id").eq("user_id", user.id).limit(1).maybeSingle();
        if (memberData?.class_code_id) setClassCodeId(memberData.class_code_id);
      } else {
        const localClassMode = localStorage.getItem("isClassMode") === "true";
        if (localClassMode && !data) { setIsClassMode(false); setClassCodeId(null); localStorage.removeItem("isClassMode"); localStorage.removeItem("classCode"); }
      }
    } catch (error) { console.error("Error checking class member status:", error); }
  };

  const checkWebsiteStatus = async () => {
    try {
      const { data } = await supabase.from("game_settings").select("*").eq("id", "00000000-0000-0000-0000-000000000001").maybeSingle();
      if (data) {
        setWebsiteEnabled(data.website_enabled); setDisabledMessage(data.disabled_message || "");
        setSoloDisabled((data as any).solo_disabled || false); setMultiplayerDisabled((data as any).multiplayer_disabled || false); setBossDisabled((data as any).boss_disabled || false);
      }
    } catch (error) { console.error("Error checking website status:", error); } finally { setCheckingStatus(false); }
  };

  const checkAdminRole = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "owner"]);
    setIsAdmin(data && data.length > 0); setIsOwner(data?.some(r => r.role === "owner") || false);
  };

  const checkTeacherRole = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "teacher").maybeSingle();
    setIsTeacher(!!data);
  };

  const checkBetaTester = async () => {
    if (!user) return;
    const { data } = await supabase.from("beta_testers").select("id").eq("user_id", user.id).maybeSingle();
    setIsBetaTester(!!data);
  };

  const loadUserProfile = async () => {
    if (!user) { setProfileLoaded(true); setTutorialChecked(true); setTermsChecked(true); return; }
    try {
      const { data } = await supabase.from("profiles").select("username, tutorial_completed, terms_accepted").eq("user_id", user.id).maybeSingle();
      if (data) {
        setUsername(data.username);
        setTermsAccepted(data.terms_accepted || false);
        const tutorialCompletedLocal = localStorage.getItem("foodfps_tutorial_completed") === "true";
        if (!data.tutorial_completed && !tutorialCompletedLocal) setShowTutorial(true);
      } else {
        const emailUsername = user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`;
        setUsername(emailUsername); setShowTutorial(true); setTermsAccepted(false);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      const emailUsername = user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`;
      setUsername(emailUsername);
    } finally { setProfileLoaded(true); setTutorialChecked(true); setTermsChecked(true); }
  };

  const handleTutorialComplete = (isMobile: boolean) => {
    setShowTutorial(false);
    if (isMobile) { setTouchscreenMode(true); localStorage.setItem("foodfps_touchscreen", "true"); toast.success("Touch controls enabled! Rotate your device to landscape for best experience."); }
  };

  const loadUnreadMessages = async () => {
    if (!user) return;
    const { count } = await supabase.from("messages").select("*", { count: "exact", head: true }).eq("to_user_id", user.id).eq("is_read", false);
    setUnreadMessages(count || 0);
  };

  const handleAcceptTerms = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ terms_accepted: true, terms_accepted_at: new Date().toISOString() }).eq("user_id", user.id);
    setTermsAccepted(true);
  };
  const handleUsernameSet = (name: string) => { setUsername(name); localStorage.setItem("foodfps_username", name); setShowUsernameModal(false); };
  const handleModeSelect = (mode: GameMode, code?: string, timed?: number) => {
    if (timed && timed > 0) { setGameMode("timed-host"); setTimedMinutes(timed); } else { setGameMode(mode); }
    if (code) setRoomCode(code);
  };
  const handleStartGame = () => setIsInGame(true);
  const handleTimedStartGame = (minutes: number) => { setTimedMinutes(minutes); setIsInGame(true); };
  const handleBackToMenu = () => { setGameMode(null); setRoomCode(""); setTimedMinutes(0); setIsInGame(false); };
  const handleLogout = async () => {
    localStorage.removeItem("play_as_guest"); localStorage.removeItem("foodfps_username"); localStorage.removeItem("isClassMode"); localStorage.removeItem("classCode");
    await supabase.auth.signOut(); navigate("/auth");
  };
  const handleAdminClick = () => { setShowAdminCode(true); };

  if (loading || checkingStatus || !profileLoaded || !tutorialChecked || !termsChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4"><div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" /><p className="text-muted-foreground">Loading...</p></div>
      </div>
    );
  }

  if (gameStatus.isBanned && gameStatus.banInfo) { return <BanModal open={true} onOpenChange={() => {}} banInfo={gameStatus.banInfo} />; }
  if (!websiteEnabled && !isAdmin) { return <WebsiteDisabled message={disabledMessage} />; }
  if (!termsAccepted) { return <TermsModal open={true} onAccept={handleAcceptTerms} />; }

  const handleTouchscreenChange = (enabled: boolean) => { setTouchscreenMode(enabled); localStorage.setItem("foodfps_touchscreen", String(enabled)); };
  const soloBasedModes: GameMode[] = ["solo", "offline", "blitz", "juggernaut", "stealth", "mirror", "lowgrav", "chaos", "headhunter", "vampire", "frostbite", "titan"];
  // All non-lobby modes that can be 3D
  const all3DModes: GameMode[] = [...soloBasedModes, "boss", "survival", "zombie", "arena", "infection", "ctf", "koth", "gungame", "vip", "lms", "dodgeball", "payload", "sniper", "tag", "bounty", "demolition", "medic", "ranked", "youvsme", "school", "3d-solo", "quickplay"];
  // Modes that use 2D GameCanvas (solo-based modes when 3D is off)
  const twoDCanvasModes: GameMode[] = [...soloBasedModes];
  const render2DMode = () => {
    if (!gameMode) return null;

    switch (gameMode) {
      case "boss":
        return <BossMode username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "ranked":
        return <RankedMode username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "youvsme":
        return <YouVsMeMode username={username} onBack={handleBackToMenu} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "school":
        return <SchoolMode username={username} onBack={handleBackToMenu} touchscreenMode={touchscreenMode} playerSkin={currentSkin} isClassMode={isClassMode} classCodeId={classCodeId} />;
      case "survival":
        return <SurvivalMode username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "zombie":
        return <ZombieMode username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "arena":
        return <ArenaDeathmatch username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "infection":
        return <InfectionMode username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "ctf":
        return <CaptureTheFlagMode username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "koth":
        return <KingOfTheHillMode username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "gungame":
        return <GunGameMode username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "vip":
        return <ProtectTheVIPMode username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "lms":
        return <LastManStandingMode username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "dodgeball":
        return <DodgeballMode username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "payload":
        return <PayloadMode username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "sniper":
        return <SniperEliteMode username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "tag":
        return <TagMode username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "bounty":
        return <BountyHunterMode username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "demolition":
        return <DemolitionMode username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      case "medic":
        return <MedicMode username={username} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
      default:
        return <GameCanvas mode={gameMode as Exclude<GameMode, null | "boss">} username={username} roomCode={roomCode} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <ImpersonationBanner />
      {user && !gameMode && !isClassMode && (
        <GameSidebar
          unreadMessages={unreadMessages} isAdmin={isAdmin} isBetaTester={isBetaTester}
          onShowMessages={() => setShowMessages(true)} onShowUpdates={() => setShowUpdates(true)} onShowSocial={() => setShowSocial(true)}
          onShowSkinsShop={() => setShowSkinsShop(true)} onShowLeaderboard={() => setShowLeaderboard(true)} onShowDailyRewards={() => setShowDailyRewards(true)}
          onShowBetaPanel={() => setShowBetaPanel(true)} onShowSettings={() => setShowSettings(true)} onShowGlobalChat={() => setShowGlobalChat(true)}
          onShowInventory={() => setShowInventory(true)} onShowItemShop={() => setShowItemShop(true)} onShowRedeemCodes={() => setShowRedeemCodes(true)}
          onShowEventSchedule={() => setShowEventSchedule(true)} onShowFoodPass={() => setShowFoodPass(true)} onShowProfile={() => setShowProfile(true)}
          onShowRanked={() => setGameMode("ranked")}
        />
      )}

      <div className="fixed top-4 right-4 flex gap-2 z-50">
        {isClassMode && <div className="bg-green-500/20 border border-green-500/50 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm"><GraduationCap className="w-4 h-4 text-green-500" /><span className="text-green-400">Class Mode</span></div>}
        {isTeacher && !isAdmin && !isClassMode && <Button variant="secondary" size="sm" onClick={() => setShowTeacherPanel(true)} className="gap-2"><GraduationCap className="w-4 h-4" />Teacher</Button>}
        {isOwner && !isClassMode && <Button size="sm" onClick={() => setShowOwnerPanel(true)} className="gap-2 bg-amber-600 hover:bg-amber-700"><Crown className="w-4 h-4" />Owner</Button>}
        {isAdmin && !isClassMode && <Button variant="default" size="sm" onClick={handleAdminClick} className="gap-2"><Shield className="w-4 h-4" />Admin</Button>}
        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2"><LogOut className="w-4 h-4" />Logout</Button>
      </div>

      {!websiteEnabled && isAdmin && <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm z-50">⚠️ Website disabled for users</div>}
      {gameStatus.activeBroadcast && <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-lg z-50 max-w-lg text-center animate-pulse"><span className="font-semibold">📢 {gameStatus.activeBroadcast.message}</span></div>}
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
          username={username} onModeSelect={handleModeSelect}
          soloDisabled={soloDisabled || isClassMode} multiplayerDisabled={multiplayerDisabled || isClassMode} bossDisabled={bossDisabled || isClassMode}
          isClassMode={isClassMode}
        />
      )}

      {gameMode && !isInGame && (gameMode === "host" || gameMode === "join") && <Lobby mode={gameMode} username={username} roomCode={roomCode} onStartGame={handleStartGame} onBack={handleBackToMenu} />}
      {gameMode === "timed-host" && !isInGame && <TimedLobby mode="host" username={username} roomCode={roomCode} timedMinutes={timedMinutes} onStartGame={handleTimedStartGame} onBack={handleBackToMenu} />}
      {/* 2D mode: render every playable mode in 2D when 3D toggle is off */}
      {gameMode && !threeDMode && all3DModes.includes(gameMode) && !(gameMode === "host" || gameMode === "join" || gameMode === "timed-host" || gameMode === "timed-join") && render2DMode()}

      {/* 3D mode: all playable modes when 3D is on */}
      {gameMode && threeDMode && all3DModes.includes(gameMode) && !(gameMode === "host" || gameMode === "join" || gameMode === "timed-host" || gameMode === "timed-join") && (
        <Game3DSoloMode mode={gameMode} username={username} roomCode={roomCode} onBack={handleBackToMenu} adminAbuseEvents={gameStatus.adminAbuseEvents} touchscreenMode={touchscreenMode} playerSkin={currentSkin} />
      )}

      <AdminCodeModal open={showAdminCode} onOpenChange={setShowAdminCode} onSuccess={() => setShowAdminPanel(true)} />
      <AdminPanel open={showAdminPanel} onClose={() => setShowAdminPanel(false)} />
      <OwnerPanel
        open={showOwnerPanel}
        onClose={() => setShowOwnerPanel(false)}
        onSetGameMode={(mode: GameMode) => { setShowOwnerPanel(false); setGameMode(mode); }}
        onBackToMenu={handleBackToMenu}
        onOpenGlobalChat={() => { setShowOwnerPanel(false); setShowGlobalChat(true); }}
        onOpenSocial={() => { setShowOwnerPanel(false); setShowSocial(true); }}
        onOpenMessages={() => { setShowOwnerPanel(false); setShowMessages(true); }}
        onOpenInventory={() => { setShowOwnerPanel(false); setShowInventory(true); }}
        onOpenProfile={() => { setShowOwnerPanel(false); setShowProfile(true); }}
        onOpenSkinsShop={() => { setShowOwnerPanel(false); setShowSkinsShop(true); }}
        onOpenItemShop={() => { setShowOwnerPanel(false); setShowItemShop(true); }}
        onOpenFoodPass={() => { setShowOwnerPanel(false); setShowFoodPass(true); }}
        onOpenLeaderboard={() => { setShowOwnerPanel(false); setShowLeaderboard(true); }}
        onReopenOwnerPanel={() => setShowOwnerPanel(true)}
        currentGameMode={gameMode}
      />
      <MessagesPanel open={showMessages} onOpenChange={setShowMessages} />
      <UpdatesHub open={showUpdates} onOpenChange={setShowUpdates} />
      <SocialFeed open={showSocial} onOpenChange={setShowSocial} />
      <TeacherPanel open={showTeacherPanel} onClose={() => setShowTeacherPanel(false)} />
      <BetaTesterPanel open={showBetaPanel} onOpenChange={setShowBetaPanel} />
      <SkinsShop open={showSkinsShop} onOpenChange={setShowSkinsShop} currentSkin={currentSkin} onSkinSelect={(color) => { setCurrentSkin(color); localStorage.setItem("foodfps_skin", color); }} />
      <PublicLeaderboard open={showLeaderboard} onOpenChange={setShowLeaderboard} />
      <DailyRewards open={showDailyRewards} onOpenChange={setShowDailyRewards} />
      <SettingsModal open={showSettings} onOpenChange={setShowSettings} touchscreenMode={touchscreenMode} onTouchscreenModeChange={handleTouchscreenChange} onOpenServicePanel={() => setShowServicePanel(true)} threeDMode={threeDMode} onThreeDModeChange={setThreeDMode} />
      <AdSignupModal open={showAdSignup} onOpenChange={setShowAdSignup} />
      <RedeemCodeModal open={showRedeemCodes} onOpenChange={setShowRedeemCodes} />
      <FoodPassModal open={showFoodPass} onOpenChange={setShowFoodPass} />
      <PlayerProfileModal open={showProfile} onOpenChange={setShowProfile} />
      <InventoryModal open={showInventory} onOpenChange={setShowInventory} onEquipPower={(power) => setEquippedPower(power)} />
      <ShopModal open={showItemShop} onOpenChange={setShowItemShop} />
      <ServicePanel open={showServicePanel} onOpenChange={setShowServicePanel} />
      
      {user && username && !gameMode && <LoginStreakTracker userId={user.id} username={username} />}
      {user && username && <GlobalChatModal open={showGlobalChat} onOpenChange={setShowGlobalChat} userId={user.id} username={username} />}
      {user && !gameMode && !isAdmin && <AdBanner userId={user.id} onSignupClick={() => setShowAdSignup(true)} />}
      {user && !gameMode && !isAdmin && <PopupAd userId={user.id} onSignupClick={() => setShowAdSignup(true)} />}
      {user && username && !gameMode && <FeedbackButton userId={user.id} username={username} />}
      <PublicScheduleModal open={showEventSchedule} onOpenChange={setShowEventSchedule} />
    </div>
  );
};

export default Index;
