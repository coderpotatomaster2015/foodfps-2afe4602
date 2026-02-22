import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Megaphone, Image, Check, X as XIcon, Loader2, Crown, Sparkles, Users, 
         Ban, Paintbrush, Coins, Gift, MessageCircle, Zap, Shield, GraduationCap, 
         Swords, Calculator, Trophy, Radio, Cake, Settings, Crosshair, Bot, Play, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SkinEditor } from "./SkinEditor";
import { ClassCodePanel } from "./ClassCodePanel";
import { WeaponEditorPanel } from "./WeaponEditorPanel";
import { PreMadeUpdatesPanel } from "./PreMadeUpdatesPanel";
import { MathProblemsPanel } from "./MathProblemsPanel";
import { AbuseSchedulePanel } from "./AbuseSchedulePanel";

interface OwnerPanelProps {
  open: boolean;
  onClose: () => void;
}

interface Ad {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  target_url: string;
  is_active: boolean;
  created_at: string;
}

interface AdSignup {
  id: string;
  user_id: string;
  username: string;
  ad_id: string | null;
  status: string;
  created_at: string;
}

interface IPBan {
  id: string;
  ip_address: string;
  reason: string | null;
  banned_at: string;
}

interface ChatBannedUser {
  id: string;
  user_id: string;
  warning_count: number;
  is_chat_banned: boolean;
  username?: string;
}

interface UserProfile {
  user_id: string;
  username: string;
  total_score: number;
  ranked_rank: string | null;
  ranked_tier: number | null;
}

interface Broadcast {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  expires_at: string | null;
  show_on_first_login: boolean;
  created_at: string;
}

interface GameSettings {
  school_disabled: boolean;
  normal_disabled: boolean;
  ranked_disabled: boolean;
  school_disabled_message: string | null;
  normal_disabled_message: string | null;
}

export const OwnerPanel = ({ open, onClose }: OwnerPanelProps) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [adSignups, setAdSignups] = useState<AdSignup[]>([]);
  const [ipBans, setIPBans] = useState<IPBan[]>([]);
  const [chatBannedUsers, setChatBannedUsers] = useState<ChatBannedUser[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    school_disabled: false,
    normal_disabled: false,
    ranked_disabled: false,
    school_disabled_message: null,
    normal_disabled_message: null
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userId, setUserId] = useState<string>("");

  // Create ad form
  const [adTitle, setAdTitle] = useState("");
  const [adDescription, setAdDescription] = useState("");
  const [adTargetUrl, setAdTargetUrl] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  // IP ban form
  const [banIP, setBanIP] = useState("");
  const [banReason, setBanReason] = useState("");

  // Currency gift form
  const [giftUsername, setGiftUsername] = useState("");
  const [giftCoins, setGiftCoins] = useState("");
  const [giftGems, setGiftGems] = useState("");
  const [giftGold, setGiftGold] = useState("");

  // Admin abuse
  const [abuseDuration, setAbuseDuration] = useState("5");

  // Score/Rank management
  const [selectedUser, setSelectedUser] = useState("");
  const [newScore, setNewScore] = useState("");
  const [newRank, setNewRank] = useState("");
  const [newTier, setNewTier] = useState("");

  // Broadcast form
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastDuration, setBroadcastDuration] = useState("60");
  const [broadcastFirstLogin, setBroadcastFirstLogin] = useState(false);

  // Mode disabled messages
  const [schoolDisabledMsg, setSchoolDisabledMsg] = useState("");
  const [normalDisabledMsg, setNormalDisabledMsg] = useState("");

  // AI Auto-Play
  const [aiGoal, setAiGoal] = useState("");
  const [aiPlaying, setAiPlaying] = useState(false);
  const [aiLog, setAiLog] = useState<string[]>([]);
  const [aiTimeLeft, setAiTimeLeft] = useState(0);
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const aiIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      loadAll();
    }
  }, [open]);

  const loadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
    
    await Promise.all([
      loadAds(),
      loadAdSignups(),
      loadIPBans(),
      loadChatBannedUsers(),
      loadUsers(),
      loadBroadcasts(),
      loadGameSettings()
    ]);
  };

  const loadAds = async () => {
    const { data } = await supabase
      .from("ads")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setAds(data);
  };

  const loadAdSignups = async () => {
    const { data } = await supabase
      .from("ad_signups")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    
    if (data) setAdSignups(data);
  };

  const loadIPBans = async () => {
    const { data } = await supabase
      .from("ip_bans")
      .select("*")
      .order("banned_at", { ascending: false });
    
    if (data) setIPBans(data);
  };

  const loadChatBannedUsers = async () => {
    const { data: warnings } = await supabase
      .from("chat_warnings")
      .select("*")
      .eq("is_chat_banned", true);
    
    if (warnings && warnings.length > 0) {
      const userIds = warnings.map(w => w.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);
      
      const enrichedWarnings = warnings.map(w => ({
        ...w,
        username: profileMap.get(w.user_id) || "Unknown User"
      }));
      
      setChatBannedUsers(enrichedWarnings);
    } else {
      setChatBannedUsers([]);
    }
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, username, total_score, ranked_rank, ranked_tier")
      .order("username");
    
    if (data) setUsers(data);
  };

  const loadBroadcasts = async () => {
    const { data } = await supabase
      .from("broadcasts")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setBroadcasts(data as Broadcast[]);
  };

  const loadGameSettings = async () => {
    const { data } = await supabase
      .from("game_settings")
      .select("*")
      .limit(1)
      .single();
    
    if (data) {
      setGameSettings({
        school_disabled: (data as any).school_disabled || false,
        normal_disabled: (data as any).normal_disabled || false,
        ranked_disabled: (data as any).ranked_disabled || false,
        school_disabled_message: (data as any).school_disabled_message || null,
        normal_disabled_message: (data as any).normal_disabled_message || null
      });
      setSchoolDisabledMsg((data as any).school_disabled_message || "");
      setNormalDisabledMsg((data as any).normal_disabled_message || "");
    }
  };

  const generateAdImage = async () => {
    if (!adTitle || !adDescription) {
      toast.error("Please enter title and description first");
      return;
    }

    setGenerating(true);
    try {
      const prompt = `Create a professional advertisement banner image for: "${adTitle}". Description: ${adDescription}. Style: modern, clean, eye-catching, suitable for a gaming website ad banner. 16:9 aspect ratio, vibrant colors.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          modalities: ["image", "text"]
        })
      });

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (imageUrl) {
        setGeneratedImageUrl(imageUrl);
        toast.success("Ad image generated!");
      } else {
        toast.error("Failed to generate image");
      }
    } catch (error) {
      console.error("Error generating ad image:", error);
      toast.error("Failed to generate image");
    } finally {
      setGenerating(false);
    }
  };

  const createAd = async () => {
    if (!adTitle || !adDescription || !adTargetUrl) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("ads").insert({
        title: adTitle,
        description: adDescription,
        image_url: generatedImageUrl,
        target_url: adTargetUrl,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Ad created successfully!");
      setAdTitle("");
      setAdDescription("");
      setAdTargetUrl("");
      setGeneratedImageUrl(null);
      loadAds();
    } catch (error) {
      console.error("Error creating ad:", error);
      toast.error("Failed to create ad");
    } finally {
      setLoading(false);
    }
  };

  const toggleAdStatus = async (ad: Ad) => {
    const { error } = await supabase
      .from("ads")
      .update({ is_active: !ad.is_active })
      .eq("id", ad.id);

    if (error) {
      toast.error("Failed to update ad");
    } else {
      toast.success(ad.is_active ? "Ad disabled" : "Ad enabled");
      loadAds();
    }
  };

  const deleteAd = async (ad: Ad) => {
    const { error } = await supabase
      .from("ads")
      .delete()
      .eq("id", ad.id);

    if (error) {
      toast.error("Failed to delete ad");
    } else {
      toast.success("Ad deleted");
      loadAds();
    }
  };

  const handleSignupReview = async (signup: AdSignup, approve: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await supabase
      .from("ad_signups")
      .update({
        status: approve ? "approved" : "declined",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", signup.id);

    if (updateError) {
      toast.error("Failed to process signup");
      return;
    }

    if (approve) {
      await supabase.from("ad_exemptions").insert({
        user_id: signup.user_id,
        granted_by: user.id,
      });
      toast.success(`${signup.username} approved - ads disabled for them`);
    } else {
      toast.success(`${signup.username} declined - ads remain active`);
    }

    loadAdSignups();
  };

  const addIPBan = async () => {
    if (!banIP.trim()) {
      toast.error("Please enter an IP address");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("ip_bans").insert({
      ip_address: banIP.trim(),
      banned_by: user.id,
      reason: banReason || null,
    });

    if (error) {
      toast.error("Failed to add IP ban");
    } else {
      toast.success("IP address banned");
      setBanIP("");
      setBanReason("");
      loadIPBans();
    }
  };

  const removeIPBan = async (id: string) => {
    const { error } = await supabase.from("ip_bans").delete().eq("id", id);

    if (error) {
      toast.error("Failed to remove IP ban");
    } else {
      toast.success("IP ban removed");
      loadIPBans();
    }
  };

  const unbanFromChat = async (chatUserId: string) => {
    const { error } = await supabase
      .from("chat_warnings")
      .update({ is_chat_banned: false, warning_count: 0 })
      .eq("user_id", chatUserId);

    if (error) {
      toast.error("Failed to unban user");
    } else {
      toast.success("User unbanned from chat");
      loadChatBannedUsers();
    }
  };

  const giftCurrency = async () => {
    if (!giftUsername.trim()) {
      toast.error("Please enter a username");
      return;
    }

    const coins = parseInt(giftCoins) || 0;
    const gems = parseInt(giftGems) || 0;
    const gold = parseInt(giftGold) || 0;

    if (coins === 0 && gems === 0 && gold === 0) {
      toast.error("Please enter at least one currency amount");
      return;
    }

    setLoading(true);
    try {
      const { data: success, error } = await supabase.rpc("gift_currency", {
        _target_username: giftUsername.trim(),
        _coins: coins,
        _gems: gems,
        _gold: gold,
      });

      if (error) {
        console.error("Gift currency error:", error);
        toast.error("Failed to gift currency");
        return;
      }

      if (!success) {
        toast.error("User not found or permission denied");
        return;
      }

      toast.success(`Gifted ${coins} coins, ${gems} gems, ${gold} gold to ${giftUsername}`);
      setGiftUsername("");
      setGiftCoins("");
      setGiftGems("");
      setGiftGold("");
    } catch (error) {
      console.error("Gift currency error:", error);
      toast.error("Failed to gift currency");
    } finally {
      setLoading(false);
    }
  };

  const updateUserScore = async () => {
    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }

    const score = parseInt(newScore);
    if (isNaN(score)) {
      toast.error("Please enter a valid score");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ total_score: score })
      .eq("user_id", selectedUser);

    if (error) {
      toast.error("Failed to update score");
    } else {
      toast.success("Score updated!");
      setNewScore("");
      loadUsers();
    }
  };

  const updateUserRank = async () => {
    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }

    const updateData: any = {};
    if (newRank) updateData.ranked_rank = newRank;
    if (newTier) updateData.ranked_tier = parseInt(newTier);

    if (Object.keys(updateData).length === 0) {
      toast.error("Please enter a rank or tier");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", selectedUser);

    if (error) {
      toast.error("Failed to update rank");
    } else {
      toast.success("Rank updated!");
      setNewRank("");
      setNewTier("");
      loadUsers();
    }
  };

  const createBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(broadcastDuration));

    const { error } = await supabase.from("broadcasts").insert({
      title: broadcastTitle || "Announcement",
      message: broadcastMessage,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
      show_on_first_login: broadcastFirstLogin,
      is_active: true
    });

    if (error) {
      toast.error("Failed to create broadcast");
    } else {
      toast.success(`Broadcast created for ${broadcastDuration} minutes!`);
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastDuration("60");
      setBroadcastFirstLogin(false);
      loadBroadcasts();
    }
  };

  const deleteBroadcast = async (id: string) => {
    const { error } = await supabase.from("broadcasts").delete().eq("id", id);
    
    if (error) {
      toast.error("Failed to delete broadcast");
    } else {
      toast.success("Broadcast deleted");
      loadBroadcasts();
    }
  };

  const toggleModeDisabled = async (mode: "school" | "normal" | "ranked", value: boolean) => {
    const updateData: any = {};
    updateData[`${mode}_disabled`] = value;
    
    if (mode === "school") {
      updateData.school_disabled_message = schoolDisabledMsg || "School mode is currently disabled";
    } else if (mode === "normal") {
      updateData.normal_disabled_message = normalDisabledMsg || "Normal accounts are currently disabled";
    }

    const { error } = await supabase
      .from("game_settings")
      .update(updateData)
      .not("id", "is", null);

    if (error) {
      toast.error("Failed to update settings");
    } else {
      toast.success(`${mode} mode ${value ? "disabled" : "enabled"}`);
      setGameSettings(prev => ({ ...prev, [`${mode}_disabled`]: value }));
    }
  };

  const activateAbuse = async (type: string, duration: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + duration);

    const { error } = await supabase.from("admin_abuse_events").insert({
      event_type: type,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      toast.error("Failed to activate");
    } else {
      toast.success(`${type} activated for ${duration} minutes!`);
    }
  };

  const disableAllAbuse = async () => {
    const { error } = await supabase
      .from("admin_abuse_events")
      .update({ is_active: false })
      .eq("is_active", true);

    if (error) {
      toast.error("Failed to disable abuse events");
    } else {
      toast.success("All abuse events disabled!");
    }
  };

  const GAME_MODES = ["solo", "boss", "zombie", "infection", "arena", "sniper", "medic", "demolition", "ctf", "koth", "tag", "dodgeball", "gungame", "survival", "lms", "bounty", "payload", "vip"];

  const AI_SOCIAL_POSTS = [
    "Just got a 15 kill streak in zombie mode! 🧟💀",
    "Arena mode is too easy for me 😎🔥",
    "Who wants to challenge me? I'm unstoppable! 💪",
    "This game is amazing! Best FPS ever! 🎮",
    "Just unlocked the railgun, it's insane! ⚡",
    "Boss mode defeated in record time! 🏆",
    "Sniper mode is my favorite, headshots all day 🎯",
    "New high score achieved! Can anyone beat me? 🤔",
  ];

  const AI_MESSAGES_SUBJECTS = [
    { subject: "GG!", content: "Great game today, keep it up!" },
    { subject: "Tips", content: "Try using the shotgun in close range, it's OP!" },
    { subject: "Challenge", content: "Meet me in arena mode, let's see who's better!" },
    { subject: "Thanks!", content: "Thanks for the great match earlier!" },
  ];

  const AI_SHOP_ITEMS = [
    { name: "Health Pack", cost: 50, type: "health_pack" },
    { name: "Speed Boost", cost: 75, type: "speed_boost" },
    { name: "Ammo Box", cost: 30, type: "ammo_box" },
    { name: "Shield Generator", cost: 100, type: "shield" },
  ];

  const AI_BIOS = [
    "🔥 Top ranked player | Fear the food! 🍔",
    "Arena champion since day one 💪🏆",
    "Sniper main. One shot, one kill. 🎯",
    "Grinding to Mythic rank! Almost there... ⭐",
    "Boss slayer extraordinaire 🐉💀",
    "I eat bullets for breakfast 🥣🔫",
    "The one and only food legend 🍕👑",
  ];

  const AI_RANK_NAMES = ["Rookie", "Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster", "Pro", "Legend", "Mythic"];

  const AI_ACTIONS = [
    "play_game",
    "play_game",
    "play_game",
    "post_social",
    "send_message",
    "buy_item",
    "redeem_code",
    "claim_reward",
    "switch_weapon",
    "play_game",
    "ranked_match",
    "ranked_match",
    "edit_bio",
    "claim_food_pass",
    "equip_skin",
    "change_loadout",
    "join_multiplayer",
  ];

  const [aiScreen, setAiScreen] = useState<{
    scene: string;
    title: string;
    details: string[];
    progress: number;
    avatar: string;
    stats: { score: number; kills: number; coins: number; gems: number; gold: number };
  }>({
    scene: "idle",
    title: "AI Player Idle",
    details: [],
    progress: 0,
    avatar: "🤖",
    stats: { score: 0, kills: 0, coins: 0, gems: 0, gold: 0 },
  });

  const startAiPlay = async () => {
    if (!aiGoal.trim()) {
      toast.error("Please describe what you want the AI to achieve");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get owner's profile info
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, total_score")
      .eq("user_id", user.id)
      .single();

    const ownerUsername = profile?.username || "Owner";

    setAiPlaying(true);
    setAiLog([
      `🤖 AI Auto-Play started!`,
      `📋 Goal: "${aiGoal}"`,
      `👤 Playing as: ${ownerUsername}`,
      `⏱️ Duration: 5 minutes`,
      `─────────────────────`,
    ]);
    setAiTimeLeft(300);

    aiTimerRef.current = setInterval(() => {
      setAiTimeLeft(prev => {
        if (prev <= 1) {
          stopAiPlay();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const runAiCycle = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const action = AI_ACTIONS[Math.floor(Math.random() * AI_ACTIONS.length)];

      try {
        switch (action) {
          case "play_game": {
            const mode = GAME_MODES[Math.floor(Math.random() * GAME_MODES.length)];
            const scoreGain = Math.floor(Math.random() * 150) + 50;
            const kills = Math.floor(Math.random() * 10) + 1;
            const deaths = Math.floor(Math.random() * 3);
            const waves = Math.floor(Math.random() * 5) + 1;

            setAiScreen(prev => ({ ...prev, scene: "playing", title: `Playing ${mode.toUpperCase()}`, details: ["🔄 Loading map...", "📍 Spawning in..."], progress: 10, avatar: "🎮" }));
            setAiLog(prev => [...prev.slice(-40), `🎮 Entering ${mode.toUpperCase()} mode...`]);

            // Post to global chat like a real player
            await supabase.from("global_chat").insert({
              user_id: currentUser.id,
              username: ownerUsername,
              message: `Just joined ${mode} mode! Let's go! 🎮`,
            });
            
            await new Promise(r => setTimeout(r, 1000));
            setAiScreen(prev => ({ ...prev, progress: 30, details: [...prev.details, `Wave ${waves} — Fighting enemies...`] }));
            
            await new Promise(r => setTimeout(r, 1000));
            setAiScreen(prev => ({ ...prev, progress: 70, details: [...prev.details, `${kills} kills, ${deaths} deaths`] }));
            setAiLog(prev => [...prev.slice(-40), `⚔️ Fighting... ${kills} kills, ${deaths} deaths, ${waves} waves cleared`]);

            // Register as active player so others can see
            await supabase.from("active_players").upsert({
              user_id: currentUser.id,
              username: ownerUsername,
              mode: mode,
              last_seen: new Date().toISOString(),
            }, { onConflict: "user_id" });

            const { data: prof } = await supabase
              .from("profiles")
              .select("total_score")
              .eq("user_id", currentUser.id)
              .single();

            if (prof) {
              await supabase
                .from("profiles")
                .update({ total_score: prof.total_score + scoreGain })
                .eq("user_id", currentUser.id);
            }

            const coins = Math.floor(scoreGain / 2);
            const gems = Math.floor(scoreGain / 10);
            const gold = Math.floor(scoreGain / 20);

            await supabase.rpc("add_player_currency", {
              _user_id: currentUser.id,
              _coins: coins,
              _gems: gems,
              _gold: gold,
            });

            setAiScreen(prev => ({
              ...prev, progress: 100, details: [...prev.details, `✅ +${scoreGain} score, ${kills} kills`],
              stats: { ...prev.stats, score: prev.stats.score + scoreGain, kills: prev.stats.kills + kills, coins: prev.stats.coins + coins, gems: prev.stats.gems + gems, gold: prev.stats.gold + gold }
            }));
            setAiLog(prev => [...prev.slice(-40), `✅ Match complete! +${scoreGain} score, +${coins} coins, +${gems} gems, +${gold} gold`]);

            // Chat about the result like a real player
            const chatMessages = [
              `${kills} kills in ${mode} mode! 💀🔥`,
              `Just dropped ${scoreGain} score in ${mode}! Who can beat that? 😤`,
              `${mode} mode is too easy for me 😎`,
              `GG! ${waves} waves cleared in ${mode} 🏆`,
            ];
            await supabase.from("global_chat").insert({
              user_id: currentUser.id,
              username: ownerUsername,
              message: chatMessages[Math.floor(Math.random() * chatMessages.length)],
            });
            break;
          }

          case "post_social": {
            const postContent = AI_SOCIAL_POSTS[Math.floor(Math.random() * AI_SOCIAL_POSTS.length)];
            setAiScreen(prev => ({ ...prev, scene: "social", title: "Posting to Food Media", details: [`Writing: "${postContent}"`], progress: 50, avatar: "📝" }));
            setAiLog(prev => [...prev.slice(-40), `📝 Posting to Food Media: "${postContent}"`]);

             await supabase.from("social_posts").insert({
              user_id: currentUser.id,
              username: ownerUsername,
              content: `[AI] ${postContent}`,
              is_approved: true,
              is_pending: false,
            });

            setAiScreen(prev => ({ ...prev, progress: 100, details: [...prev.details, "✅ Published!"] }));
            setAiLog(prev => [...prev.slice(-40), `✅ Post published successfully!`]);
            break;
          }

          case "send_message": {
            const { data: randomUsers } = await supabase
              .from("profiles")
              .select("user_id, username")
              .neq("user_id", currentUser.id)
              .limit(10);

            if (randomUsers && randomUsers.length > 0) {
              const target = randomUsers[Math.floor(Math.random() * randomUsers.length)];
              const msg = AI_MESSAGES_SUBJECTS[Math.floor(Math.random() * AI_MESSAGES_SUBJECTS.length)];

              setAiScreen(prev => ({ ...prev, scene: "messaging", title: `Messaging ${target.username}`, details: [`To: ${target.username}`, `Subject: ${msg.subject}`], progress: 50, avatar: "💌" }));
              setAiLog(prev => [...prev.slice(-40), `💌 Sending message to ${target.username}: "${msg.subject}"`]);

              await supabase.from("messages").insert({
                from_user_id: currentUser.id,
                from_username: ownerUsername,
                to_user_id: target.user_id,
                to_username: target.username,
                subject: `[AI] ${msg.subject}`,
                content: msg.content,
              });

              setAiScreen(prev => ({ ...prev, progress: 100, details: [...prev.details, "✅ Sent!"] }));
              setAiLog(prev => [...prev.slice(-40), `✅ Message sent to ${target.username}!`]);
            } else {
              setAiScreen(prev => ({ ...prev, scene: "messaging", title: "Messaging", details: ["No players found"], progress: 100, avatar: "⚠️" }));
              setAiLog(prev => [...prev.slice(-40), `⚠️ No other players found to message`]);
            }
            break;
          }

          case "buy_item": {
            const item = AI_SHOP_ITEMS[Math.floor(Math.random() * AI_SHOP_ITEMS.length)];
            setAiScreen(prev => ({ ...prev, scene: "shopping", title: `Buying ${item.name}`, details: [`Price: ${item.cost} coins`], progress: 30, avatar: "🛒" }));
            setAiLog(prev => [...prev.slice(-40), `🛒 Buying ${item.name} for ${item.cost} coins...`]);

            const { data: currency } = await supabase
              .from("player_currencies")
              .select("coins")
              .eq("user_id", currentUser.id)
              .single();

            if (currency && currency.coins >= item.cost) {
              await supabase
                .from("player_currencies")
                .update({ coins: currency.coins - item.cost })
                .eq("user_id", currentUser.id);

              await supabase.from("player_inventory").insert({
                user_id: currentUser.id,
                item_type: item.type,
                item_id: `ai_bought_${Date.now()}`,
                quantity: 1,
              });

              setAiScreen(prev => ({ ...prev, progress: 100, details: [...prev.details, `✅ Purchased! -${item.cost} coins`], stats: { ...prev.stats, coins: prev.stats.coins - item.cost } }));
              setAiLog(prev => [...prev.slice(-40), `✅ Purchased ${item.name}! (-${item.cost} coins)`]);
            } else {
              setAiScreen(prev => ({ ...prev, progress: 100, details: [...prev.details, "❌ Not enough coins"], avatar: "❌" }));
              setAiLog(prev => [...prev.slice(-40), `❌ Not enough coins for ${item.name} (need ${item.cost})`]);
            }
            break;
          }

          case "redeem_code": {
            setAiScreen(prev => ({ ...prev, scene: "redeeming", title: "Checking Codes", details: ["Scanning for active codes..."], progress: 30, avatar: "🎟️" }));
            setAiLog(prev => [...prev.slice(-40), `🎟️ Checking for redeemable codes...`]);
            const { data: codes } = await supabase
              .from("redeem_codes")
              .select("id, code, reward_type, reward_value")
              .eq("is_active", true)
              .limit(5);

            if (codes && codes.length > 0) {
              const code = codes[Math.floor(Math.random() * codes.length)];
              const { data: existing } = await supabase
                .from("redeemed_codes")
                .select("id")
                .eq("user_id", currentUser.id)
                .eq("code_id", code.id)
                .maybeSingle();

              if (!existing) {
                setAiScreen(prev => ({ ...prev, progress: 100, details: [...prev.details, `Redeeming "${code.code}" +${code.reward_value} ${code.reward_type}`] }));
                setAiLog(prev => [...prev.slice(-40), `🎁 Redeeming code "${code.code}" (+${code.reward_value} ${code.reward_type})`]);
              } else {
                setAiScreen(prev => ({ ...prev, progress: 100, details: [...prev.details, `"${code.code}" already redeemed`], avatar: "⚠️" }));
                setAiLog(prev => [...prev.slice(-40), `⚠️ Code "${code.code}" already redeemed`]);
              }
            } else {
              setAiScreen(prev => ({ ...prev, progress: 100, details: [...prev.details, "No active codes"], avatar: "⚠️" }));
              setAiLog(prev => [...prev.slice(-40), `⚠️ No active codes found`]);
            }
            break;
          }

          case "claim_reward": {
            setAiScreen(prev => ({ ...prev, scene: "reward", title: "Daily Rewards", details: ["Checking rewards..."], progress: 50, avatar: "🎁" }));
            setAiLog(prev => [...prev.slice(-40), `🎁 Checking daily rewards...`]);
            const rewardTypes = ["coins", "gems", "gold"];
            const type = rewardTypes[Math.floor(Math.random() * rewardTypes.length)];
            const value = Math.floor(Math.random() * 50) + 10;
            setAiScreen(prev => ({ ...prev, progress: 100, details: [...prev.details, `+${value} ${type}!`] }));
            setAiLog(prev => [...prev.slice(-40), `🎉 Daily reward: +${value} ${type}!`]);
            break;
          }

          case "switch_weapon": {
            const weapons = ["Pistol", "Shotgun", "Sniper", "Minigun", "RPG", "Katana", "Railgun", "Plasma Rifle"];
            const weapon = weapons[Math.floor(Math.random() * weapons.length)];
            setAiScreen(prev => ({ ...prev, scene: "loadout", title: "Switching Weapon", details: [`Equipping ${weapon}...`], progress: 50, avatar: "🔫" }));
            setAiLog(prev => [...prev.slice(-40), `🔫 Switching to ${weapon}...`]);
            await new Promise(r => setTimeout(r, 500));
            setAiScreen(prev => ({ ...prev, progress: 100, details: [...prev.details, `Now using ${weapon}`] }));
            setAiLog(prev => [...prev.slice(-40), `✅ Now using ${weapon}`]);
            break;
          }

          case "ranked_match": {
            const waves = Math.floor(Math.random() * 7) + 1;
            const kills = Math.floor(Math.random() * 25) + 5;
            const victory = waves >= 6;
            const rankIndex = Math.min(Math.floor(waves * 1.5), AI_RANK_NAMES.length - 1);
            const rank = AI_RANK_NAMES[rankIndex];
            const tier = Math.floor(Math.random() * 5) + 1;

            setAiScreen(prev => ({ ...prev, scene: "ranked", title: "RANKED MATCH", details: ["Entering ranked queue...", "Match found!"], progress: 10, avatar: "🏅" }));
            setAiLog(prev => [...prev.slice(-40), `🏅 Entering RANKED match...`]);
            await new Promise(r => setTimeout(r, 1200));

            for (let w = 1; w <= waves; w++) {
              setAiScreen(prev => ({ ...prev, progress: Math.floor((w / 7) * 80) + 10, details: [...prev.details.slice(-4), `Wave ${w}/7 — Clearing enemies...`] }));
              await new Promise(r => setTimeout(r, 400));
            }

            setAiScreen(prev => ({ ...prev, progress: 95, details: [...prev.details.slice(-4), `${kills} kills${victory ? " — VICTORY! 🏆" : " — Defeated"}`] }));
            setAiLog(prev => [...prev.slice(-40), `⚔️ Ranked: ${waves}/7 waves, ${kills} kills${victory ? " — VICTORY!" : ""}`]);

            await supabase.from("ranked_matches").insert({
              user_id: currentUser.id,
              waves_completed: waves,
              enemies_killed: kills,
              victory,
              rank_earned: rank,
              tier_earned: tier,
            });

            await supabase
              .from("profiles")
              .update({ ranked_rank: rank, ranked_tier: tier })
              .eq("user_id", currentUser.id);

            const scoreGain = waves * 30 + kills * 5;
            const { data: prof2 } = await supabase
              .from("profiles")
              .select("total_score")
              .eq("user_id", currentUser.id)
              .single();
            if (prof2) {
              await supabase
                .from("profiles")
                .update({ total_score: prof2.total_score + scoreGain })
                .eq("user_id", currentUser.id);
            }
            await supabase.rpc("add_player_currency", {
              _user_id: currentUser.id,
              _coins: kills * 3,
              _gems: waves * 2,
              _gold: victory ? 10 : 0,
            });

            setAiScreen(prev => ({
              ...prev, progress: 100,
              details: [...prev.details.slice(-4), `Rank: ${rank} ${tier} | +${scoreGain} score`],
              stats: { ...prev.stats, score: prev.stats.score + scoreGain, kills: prev.stats.kills + kills, coins: prev.stats.coins + kills * 3, gems: prev.stats.gems + waves * 2, gold: prev.stats.gold + (victory ? 10 : 0) }
            }));
            setAiLog(prev => [...prev.slice(-40), `✅ Ranked complete! Rank: ${rank} ${tier} | +${scoreGain} score`]);
            break;
          }

          case "edit_bio": {
            const newBio = AI_BIOS[Math.floor(Math.random() * AI_BIOS.length)];
            setAiScreen(prev => ({ ...prev, scene: "profile", title: "Editing Profile", details: [`New bio: "${newBio}"`], progress: 50, avatar: "✏️" }));
            setAiLog(prev => [...prev.slice(-40), `✏️ Updating profile bio...`]);
            await new Promise(r => setTimeout(r, 800));

            await supabase
              .from("profiles")
              .update({ bio: newBio })
              .eq("user_id", currentUser.id);

            setAiScreen(prev => ({ ...prev, progress: 100, details: [...prev.details, "✅ Bio saved!"] }));
            setAiLog(prev => [...prev.slice(-40), `✅ Bio updated: "${newBio}"`]);
            break;
          }

          case "claim_food_pass": {
            setAiScreen(prev => ({ ...prev, scene: "foodpass", title: "Food Pass", details: ["Checking progress..."], progress: 20, avatar: "🎖️" }));
            setAiLog(prev => [...prev.slice(-40), `🎖️ Checking Food Pass progress...`]);

            const { data: fpProgress } = await supabase
              .from("food_pass_progress")
              .select("*")
              .eq("user_id", currentUser.id)
              .maybeSingle();

            const currentTier = fpProgress?.current_tier || 0;
            const claimedTiers: number[] = (fpProgress?.claimed_tiers as number[]) || [];
            const nextTier = currentTier + 1;

            if (nextTier <= 500) {
              const newClaimed = [...claimedTiers, nextTier];

              if (fpProgress) {
                await supabase
                  .from("food_pass_progress")
                  .update({ current_tier: nextTier, claimed_tiers: newClaimed })
                  .eq("user_id", currentUser.id);
              } else {
                await supabase
                  .from("food_pass_progress")
                  .insert({ user_id: currentUser.id, current_tier: nextTier, claimed_tiers: newClaimed });
              }

              const rewardCoins = nextTier * 5;
              await supabase.rpc("add_player_currency", {
                _user_id: currentUser.id,
                _coins: rewardCoins,
                _gems: Math.floor(nextTier / 5),
                _gold: Math.floor(nextTier / 10),
              });

              setAiScreen(prev => ({ ...prev, progress: 100, details: [...prev.details, `Claimed Tier ${nextTier}! +${rewardCoins} coins`], stats: { ...prev.stats, coins: prev.stats.coins + rewardCoins } }));
              setAiLog(prev => [...prev.slice(-40), `🎉 Claimed Food Pass Tier ${nextTier}! +${rewardCoins} coins`]);
            } else {
              setAiScreen(prev => ({ ...prev, progress: 100, details: [...prev.details, "Already maxed at Tier 500"], avatar: "⚠️" }));
              setAiLog(prev => [...prev.slice(-40), `⚠️ Food Pass already maxed at Tier 500`]);
            }
            break;
          }

          case "equip_skin": {
            setAiScreen(prev => ({ ...prev, scene: "skins", title: "Equipping Skin", details: ["Browsing skins..."], progress: 20, avatar: "🎨" }));
            setAiLog(prev => [...prev.slice(-40), `🎨 Browsing skins...`]);

            const { data: ownedSkins } = await supabase
              .from("player_owned_skins")
              .select("skin_id")
              .eq("user_id", currentUser.id)
              .limit(10);

            if (ownedSkins && ownedSkins.length > 0) {
              const chosen = ownedSkins[Math.floor(Math.random() * ownedSkins.length)];
              const { data: skinInfo } = await supabase
                .from("player_skins")
                .select("name, color")
                .eq("id", chosen.skin_id)
                .single();

              const skinName = skinInfo?.name || "Unknown Skin";
              setAiScreen(prev => ({ ...prev, progress: 70, details: [...prev.details, `Selected: ${skinName}`] }));
              await new Promise(r => setTimeout(r, 600));

              localStorage.setItem("foodfps_skin", JSON.stringify({ id: chosen.skin_id, name: skinName, color: skinInfo?.color || "#ff0000" }));
              setAiScreen(prev => ({ ...prev, progress: 100, details: [...prev.details, `✅ Now wearing ${skinName}!`] }));
              setAiLog(prev => [...prev.slice(-40), `✅ Equipped skin: ${skinName}`]);
            } else {
              // Try custom skins
              const { data: customSkins } = await supabase
                .from("player_custom_skins")
                .select("skin_id")
                .eq("user_id", currentUser.id)
                .limit(10);

              if (customSkins && customSkins.length > 0) {
                const chosen = customSkins[Math.floor(Math.random() * customSkins.length)];
                const { data: skinInfo } = await supabase
                  .from("custom_skins")
                  .select("name")
                  .eq("id", chosen.skin_id)
                  .single();
                const skinName = skinInfo?.name || "Custom Skin";
                setAiScreen(prev => ({ ...prev, progress: 100, details: [...prev.details, `✅ Equipped custom: ${skinName}`] }));
                setAiLog(prev => [...prev.slice(-40), `✅ Equipped custom skin: ${skinName}`]);
              } else {
                setAiScreen(prev => ({ ...prev, progress: 100, details: [...prev.details, "No owned skins found"], avatar: "⚠️" }));
                setAiLog(prev => [...prev.slice(-40), `⚠️ No owned skins to equip`]);
              }
            }
            break;
          }

          case "change_loadout": {
            const slotWeapons = ["pistol", "shotgun", "sniper", "minigun", "rpg", "katana", "railgun", "plasma_rifle"];
            const slotNum = Math.floor(Math.random() * 5) + 1;
            const weapon = slotWeapons[Math.floor(Math.random() * slotWeapons.length)];

            setAiScreen(prev => ({ ...prev, scene: "loadout", title: "Changing Loadout", details: [`Slot ${slotNum} → ${weapon}`], progress: 40, avatar: "🎒" }));
            setAiLog(prev => [...prev.slice(-40), `🎒 Changing loadout slot ${slotNum} to ${weapon}...`]);

            const updateField: Record<string, string> = {};
            updateField[`slot_${slotNum}`] = weapon;

            const { data: existingLoadout } = await supabase
              .from("equipped_loadout")
              .select("id")
              .eq("user_id", currentUser.id)
              .maybeSingle();

            if (existingLoadout) {
              await supabase
                .from("equipped_loadout")
                .update(updateField)
                .eq("user_id", currentUser.id);
            } else {
              await supabase
                .from("equipped_loadout")
                .insert({ user_id: currentUser.id, ...updateField });
            }

            setAiScreen(prev => ({ ...prev, progress: 100, details: [...prev.details, `✅ Slot ${slotNum} = ${weapon}`] }));
            setAiLog(prev => [...prev.slice(-40), `✅ Loadout updated: Slot ${slotNum} = ${weapon}`]);
            break;
          }

          case "join_multiplayer": {
            setAiScreen(prev => ({ ...prev, scene: "multiplayer", title: "Joining Multiplayer", details: ["Creating room..."], progress: 20, avatar: "🌐" }));
            setAiLog(prev => [...prev.slice(-40), `🌐 Creating multiplayer room...`]);

            const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();

            await supabase.from("game_rooms").insert({
              host_id: currentUser.id,
              code: roomCode,
              max_players: 4,
            });

            setAiScreen(prev => ({ ...prev, progress: 40, details: [...prev.details, `Room ${roomCode} created`, "Joining as player..."] }));
            await new Promise(r => setTimeout(r, 800));

            const { data: room } = await supabase
              .from("game_rooms")
              .select("id")
              .eq("code", roomCode)
              .single();

            if (room) {
              await supabase.from("room_players").insert({
                room_id: room.id,
                user_id: currentUser.id,
                username: ownerUsername,
              });

              // Register as active player
              await supabase.from("active_players").upsert({
                user_id: currentUser.id,
                username: ownerUsername,
                mode: "multiplayer",
                room_code: roomCode,
                last_seen: new Date().toISOString(),
              }, { onConflict: "user_id" });

              setAiScreen(prev => ({ ...prev, progress: 70, details: [...prev.details, "Playing match..."] }));
              await new Promise(r => setTimeout(r, 1500));

              const mpScore = Math.floor(Math.random() * 100) + 30;
              const mpKills = Math.floor(Math.random() * 8) + 1;

              await supabase.rpc("add_player_currency", {
                _user_id: currentUser.id,
                _coins: mpScore,
                _gems: Math.floor(mpScore / 10),
                _gold: Math.floor(mpScore / 25),
              });

              // End room
              await supabase
                .from("game_rooms")
                .update({ ended_at: new Date().toISOString() })
                .eq("id", room.id);

              setAiScreen(prev => ({
                ...prev, progress: 100,
                details: [...prev.details, `Match over! ${mpKills} kills, +${mpScore} coins`],
                stats: { ...prev.stats, kills: prev.stats.kills + mpKills, coins: prev.stats.coins + mpScore }
              }));
              setAiLog(prev => [...prev.slice(-40), `✅ Multiplayer match complete! Room ${roomCode} | ${mpKills} kills, +${mpScore} coins`]);
            }
            break;
          }
        }
      } catch (err) {
        console.error("AI play error:", err);
        setAiLog(prev => [...prev.slice(-25), `❌ Error during ${action}: ${err}`]);
      }
    };

    await runAiCycle();

    const scheduleNext = () => {
      const delay = Math.floor(Math.random() * 3000) + 3000;
      aiIntervalRef.current = setTimeout(async () => {
        if (!aiTimerRef.current) return;
        await runAiCycle();
        scheduleNext();
      }, delay);
    };
    scheduleNext();

    toast.success("AI Auto-Play started! It will play for 5 minutes.");
  };

  const stopAiPlay = () => {
    if (aiTimerRef.current) {
      clearInterval(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    if (aiIntervalRef.current) {
      clearTimeout(aiIntervalRef.current);
      aiIntervalRef.current = null;
    }
    setAiPlaying(false);
    setAiTimeLeft(0);
    setAiScreen({ scene: "idle", title: "AI Player Stopped", details: ["Session ended"], progress: 0, avatar: "⏹️", stats: aiScreen.stats });
    setAiLog(prev => [...prev, "⏹️ AI Auto-Play stopped."]);
    toast.success("AI Auto-Play stopped!");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-amber-500/20 to-yellow-500/20">
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            Owner Panel
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="ads" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-2 flex-wrap h-auto gap-1">
            <TabsTrigger value="ads" className="gap-1 text-xs">
              <Megaphone className="w-3 h-3" /> Ads
            </TabsTrigger>
            <TabsTrigger value="signups" className="gap-1 text-xs">
              <Users className="w-3 h-3" /> Signups ({adSignups.length})
            </TabsTrigger>
            <TabsTrigger value="ipban" className="gap-1 text-xs">
              <Ban className="w-3 h-3" /> IP Bans
            </TabsTrigger>
            <TabsTrigger value="chatbans" className="gap-1 text-xs">
              <MessageCircle className="w-3 h-3" /> Chat Bans
            </TabsTrigger>
            <TabsTrigger value="skins" className="gap-1 text-xs">
              <Paintbrush className="w-3 h-3" /> Skin Editor
            </TabsTrigger>
            <TabsTrigger value="weapons" className="gap-1 text-xs">
              <Swords className="w-3 h-3" /> Weapons
            </TabsTrigger>
            <TabsTrigger value="classes" className="gap-1 text-xs">
              <GraduationCap className="w-3 h-3" /> Classes
            </TabsTrigger>
            <TabsTrigger value="mathproblems" className="gap-1 text-xs">
              <Calculator className="w-3 h-3" /> Math
            </TabsTrigger>
            <TabsTrigger value="currency" className="gap-1 text-xs">
              <Coins className="w-3 h-3" /> Currency
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-1 text-xs">
              <Trophy className="w-3 h-3" /> Leaderboard
            </TabsTrigger>
            <TabsTrigger value="broadcasts" className="gap-1 text-xs">
              <Radio className="w-3 h-3" /> Broadcasts
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1 text-xs">
              <Settings className="w-3 h-3" /> Mode Settings
            </TabsTrigger>
            <TabsTrigger value="updates" className="gap-1 text-xs">
              <Sparkles className="w-3 h-3" /> Updates
            </TabsTrigger>
            <TabsTrigger value="abuse" className="gap-1 text-xs">
              <Zap className="w-3 h-3" /> Admin Abuse
            </TabsTrigger>
            <TabsTrigger value="aimbot" className="gap-1 text-xs">
              <Crosshair className="w-3 h-3" /> Aimbot
            </TabsTrigger>
            <TabsTrigger value="aiplay" className="gap-1 text-xs">
              <Bot className="w-3 h-3" /> AI Player
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 p-4">
            {/* Ads Tab */}
            <TabsContent value="ads" className="mt-0 space-y-4">
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  Create AI-Generated Ad
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <Label>Ad Title</Label>
                    <Input
                      value={adTitle}
                      onChange={(e) => setAdTitle(e.target.value)}
                      placeholder="e.g., Join FoodFPS Today!"
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={adDescription}
                      onChange={(e) => setAdDescription(e.target.value)}
                      placeholder="Describe what the ad should convey..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Target URL</Label>
                    <Input
                      value={adTargetUrl}
                      onChange={(e) => setAdTargetUrl(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>

                  <Button
                    onClick={generateAdImage}
                    disabled={generating || !adTitle || !adDescription}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Image...
                      </>
                    ) : (
                      <>
                        <Image className="w-4 h-4" />
                        Generate Ad Image with AI
                      </>
                    )}
                  </Button>

                  {generatedImageUrl && (
                    <div className="space-y-2">
                      <Label>Generated Image</Label>
                      <img
                        src={generatedImageUrl}
                        alt="Generated ad"
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                    </div>
                  )}

                  <Button
                    onClick={createAd}
                    disabled={loading || !adTitle || !adDescription || !adTargetUrl}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create Ad"
                    )}
                  </Button>
                </div>
              </Card>

              <h3 className="font-semibold">Manage Ads</h3>
              {ads.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No ads created yet</p>
              ) : (
                ads.map((ad) => (
                  <Card key={ad.id} className="p-4">
                    <div className="flex items-start gap-4">
                      {ad.image_url && (
                        <img src={ad.image_url} alt={ad.title} className="w-24 h-16 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{ad.title}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded ${ad.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                            {ad.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{ad.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant={ad.is_active ? "destructive" : "default"} onClick={() => toggleAdStatus(ad)}>
                          {ad.is_active ? "Disable" : "Enable"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteAd(ad)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Signups Tab */}
            <TabsContent value="signups" className="mt-0 space-y-4">
              {adSignups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No pending signup requests</p>
                </div>
              ) : (
                adSignups.map((signup) => (
                  <Card key={signup.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{signup.username}</h4>
                        <p className="text-xs text-muted-foreground">
                          Requested {new Date(signup.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSignupReview(signup, true)} className="gap-1 bg-green-600 hover:bg-green-700">
                          <Check className="w-4 h-4" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleSignupReview(signup, false)} className="gap-1">
                          <XIcon className="w-4 h-4" /> Decline
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* IP Ban Tab */}
            <TabsContent value="ipban" className="mt-0 space-y-4">
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-500" />
                  Add IP Ban
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label>IP Address</Label>
                    <Input
                      value={banIP}
                      onChange={(e) => setBanIP(e.target.value)}
                      placeholder="e.g., 192.168.1.1"
                    />
                  </div>
                  <div>
                    <Label>Reason (optional)</Label>
                    <Input
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Reason for ban"
                    />
                  </div>
                  <Button onClick={addIPBan} className="w-full" variant="destructive">
                    Ban IP Address
                  </Button>
                </div>
              </Card>

              <h3 className="font-semibold">Active IP Bans</h3>
              {ipBans.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No IP bans</p>
              ) : (
                ipBans.map((ban) => (
                  <Card key={ban.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-mono">{ban.ip_address}</p>
                      {ban.reason && <p className="text-xs text-muted-foreground">{ban.reason}</p>}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => removeIPBan(ban.id)}>
                      Remove
                    </Button>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Chat Bans Tab */}
            <TabsContent value="chatbans" className="mt-0 space-y-4">
              <h3 className="font-semibold">Chat Banned Users</h3>
              {chatBannedUsers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No chat banned users</p>
              ) : (
                chatBannedUsers.map((user) => (
                  <Card key={user.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{user.username || "Unknown User"}</p>
                      <p className="text-xs text-muted-foreground">Warnings: {user.warning_count}</p>
                    </div>
                    <Button size="sm" onClick={() => unbanFromChat(user.user_id)}>
                      Unban
                    </Button>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Skin Editor Tab */}
            <TabsContent value="skins" className="mt-0">
              <SkinEditor onSave={() => toast.success("Skin added to shop!")} />
            </TabsContent>

            {/* Currency Tab */}
            <TabsContent value="currency" className="mt-0 space-y-4">
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Gift className="w-4 h-4 text-primary" />
                  Gift Currency to User
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label>Username</Label>
                    <Input
                      value={giftUsername}
                      onChange={(e) => setGiftUsername(e.target.value)}
                      placeholder="Enter username"
                      list="users-list"
                    />
                    <datalist id="users-list">
                      {users.map(u => (
                        <option key={u.user_id} value={u.username} />
                      ))}
                    </datalist>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="flex items-center gap-1">
                        <Coins className="w-3 h-3 text-yellow-500" /> Coins
                      </Label>
                      <Input
                        type="number"
                        value={giftCoins}
                        onChange={(e) => setGiftCoins(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1">
                        <span className="text-purple-500">💎</span> Gems
                      </Label>
                      <Input
                        type="number"
                        value={giftGems}
                        onChange={(e) => setGiftGems(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1">
                        <span className="text-amber-500">🪙</span> Gold
                      </Label>
                      <Input
                        type="number"
                        value={giftGold}
                        onChange={(e) => setGiftGold(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <Button onClick={giftCurrency} className="w-full gap-2">
                    <Gift className="w-4 h-4" />
                    Gift Currency
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Leaderboard Management Tab */}
            <TabsContent value="leaderboard" className="mt-0 space-y-4">
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Manage User Score/Rank
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label>Select User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(u => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.username} (Score: {u.total_score})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>New Score</Label>
                      <Input
                        type="number"
                        value={newScore}
                        onChange={(e) => setNewScore(e.target.value)}
                        placeholder="Enter new score"
                      />
                      <Button onClick={updateUserScore} className="w-full" size="sm">
                        Update Score
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>New Rank</Label>
                      <Select value={newRank} onValueChange={setNewRank}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rank" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bronze">Bronze</SelectItem>
                          <SelectItem value="Silver">Silver</SelectItem>
                          <SelectItem value="Gold">Gold</SelectItem>
                          <SelectItem value="Platinum">Platinum</SelectItem>
                          <SelectItem value="Diamond">Diamond</SelectItem>
                          <SelectItem value="Master">Master</SelectItem>
                          <SelectItem value="Grandmaster">Grandmaster</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={newTier}
                        onChange={(e) => setNewTier(e.target.value)}
                        placeholder="Tier (1-4)"
                        min="1"
                        max="4"
                      />
                      <Button onClick={updateUserRank} className="w-full" size="sm">
                        Update Rank
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Broadcasts Tab */}
            <TabsContent value="broadcasts" className="mt-0 space-y-4">
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Radio className="w-4 h-4 text-primary" />
                  Create Temporary Broadcast
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="e.g., Server Maintenance"
                    />
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Enter broadcast message..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={broadcastDuration}
                      onChange={(e) => setBroadcastDuration(e.target.value)}
                      min="1"
                      max="1440"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={broadcastFirstLogin}
                      onCheckedChange={setBroadcastFirstLogin}
                    />
                    <Label>Show only on first login</Label>
                  </div>
                  <Button onClick={createBroadcast} className="w-full gap-2">
                    <Radio className="w-4 h-4" />
                    Create Broadcast
                  </Button>
                </div>
              </Card>

              <h3 className="font-semibold">Active Broadcasts</h3>
              {broadcasts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No active broadcasts</p>
              ) : (
                broadcasts.map((broadcast) => (
                  <Card key={broadcast.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{broadcast.title}</h4>
                        <p className="text-sm text-muted-foreground">{broadcast.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expires: {broadcast.expires_at ? new Date(broadcast.expires_at).toLocaleString() : "Never"}
                          {broadcast.show_on_first_login && " • First login only"}
                        </p>
                      </div>
                      <Button size="sm" variant="destructive" onClick={() => deleteBroadcast(broadcast.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Mode Settings Tab */}
            <TabsContent value="settings" className="mt-0 space-y-4">
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Disable Account Modes
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <p className="font-medium">Disable School Accounts</p>
                      <p className="text-xs text-muted-foreground">Block school/class mode access</p>
                    </div>
                    <Switch
                      checked={gameSettings.school_disabled}
                      onCheckedChange={(v) => toggleModeDisabled("school", v)}
                    />
                  </div>
                  {gameSettings.school_disabled && (
                    <div>
                      <Label>School Disabled Message</Label>
                      <Input
                        value={schoolDisabledMsg}
                        onChange={(e) => setSchoolDisabledMsg(e.target.value)}
                        placeholder="School mode is currently disabled"
                        onBlur={() => toggleModeDisabled("school", true)}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <p className="font-medium">Disable Normal Accounts</p>
                      <p className="text-xs text-muted-foreground">Block regular account access</p>
                    </div>
                    <Switch
                      checked={gameSettings.normal_disabled}
                      onCheckedChange={(v) => toggleModeDisabled("normal", v)}
                    />
                  </div>
                  {gameSettings.normal_disabled && (
                    <div>
                      <Label>Normal Disabled Message</Label>
                      <Input
                        value={normalDisabledMsg}
                        onChange={(e) => setNormalDisabledMsg(e.target.value)}
                        placeholder="Normal accounts are currently disabled"
                        onBlur={() => toggleModeDisabled("normal", true)}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <p className="font-medium">Disable Ranked Mode</p>
                      <p className="text-xs text-muted-foreground">Block ranked gameplay</p>
                    </div>
                    <Switch
                      checked={gameSettings.ranked_disabled}
                      onCheckedChange={(v) => toggleModeDisabled("ranked", v)}
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Math Problems Tab */}
            <TabsContent value="mathproblems" className="mt-0">
              <MathProblemsPanel />
            </TabsContent>

            {/* Admin Abuse Tab */}
            <TabsContent value="abuse" className="mt-0 space-y-4">
              <Card className="p-4 space-y-4 border-rainbow bg-gradient-to-r from-red-500/10 via-yellow-500/10 to-blue-500/10">
                <h3 className="font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Ultimate Rainbow Mode
                </h3>
                <p className="text-sm text-muted-foreground">
                  Activates rainbow effects on EVERYTHING - UI, skins, enemies, background. Pure chaos!
                </p>
                <div className="space-y-3">
                  <div>
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={abuseDuration}
                      onChange={(e) => setAbuseDuration(e.target.value)}
                      min="1"
                      max="60"
                    />
                  </div>
                  <Button
                    onClick={() => activateAbuse("ultimate", parseInt(abuseDuration))}
                    className="w-full gap-2 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 hover:from-red-600 hover:via-yellow-600 hover:to-blue-600"
                  >
                    <Zap className="w-4 h-4" />
                    Activate Ultimate Mode
                  </Button>
                </div>
              </Card>

              {/* Birthday Mode */}
              <Card className="p-4 space-y-4 border-pink-500/30 bg-gradient-to-r from-pink-500/10 to-purple-500/10">
                <h3 className="font-semibold flex items-center gap-2 text-pink-400">
                  <Cake className="w-5 h-5" />
                  Birthday Mode
                </h3>
                <p className="text-sm text-muted-foreground">
                  Celebrate with confetti, balloons, and birthday effects everywhere!
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => activateAbuse("birthday", 5)}
                    size="sm"
                    className="bg-pink-500 hover:bg-pink-600"
                  >
                    5 min
                  </Button>
                  <Button
                    onClick={() => activateAbuse("birthday", 15)}
                    size="sm"
                    className="bg-pink-500 hover:bg-pink-600"
                  >
                    15 min
                  </Button>
                  <Button
                    onClick={() => activateAbuse("birthday", 60)}
                    size="sm"
                    className="bg-pink-500 hover:bg-pink-600"
                  >
                    1 hour
                  </Button>
                </div>
              </Card>

              {/* Godmode for All */}
              <Card className="p-4 space-y-4 border-green-500/30 bg-green-500/10">
                <h3 className="font-semibold flex items-center gap-2 text-green-400">
                  <Shield className="w-5 h-5" />
                  Godmode for All
                </h3>
                <p className="text-sm text-muted-foreground">
                  Grant invincibility to all players temporarily.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => activateAbuse("godmode_all", 5)}
                    size="sm"
                    variant="outline"
                    className="border-green-500 text-green-400"
                  >
                    5 min
                  </Button>
                  <Button
                    onClick={() => activateAbuse("godmode_all", 15)}
                    size="sm"
                    variant="outline"
                    className="border-green-500 text-green-400"
                  >
                    15 min
                  </Button>
                  <Button
                    onClick={() => activateAbuse("godmode_all", 30)}
                    size="sm"
                    variant="outline"
                    className="border-green-500 text-green-400"
                  >
                    30 min
                  </Button>
                </div>
              </Card>

              {/* Double Coins */}
              <Card className="p-4 space-y-4 border-yellow-500/30 bg-yellow-500/10">
                <h3 className="font-semibold flex items-center gap-2 text-yellow-400">
                  <Coins className="w-5 h-5" />
                  Double Coins Event
                </h3>
                <p className="text-sm text-muted-foreground">
                  All players earn double coins from matches!
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => activateAbuse("double_coins", 30)}
                    size="sm"
                    variant="outline"
                    className="border-yellow-500 text-yellow-400"
                  >
                    30 min
                  </Button>
                  <Button
                    onClick={() => activateAbuse("double_coins", 60)}
                    size="sm"
                    variant="outline"
                    className="border-yellow-500 text-yellow-400"
                  >
                    1 hour
                  </Button>
                  <Button
                    onClick={() => activateAbuse("double_coins", 120)}
                    size="sm"
                    variant="outline"
                    className="border-yellow-500 text-yellow-400"
                  >
                    2 hours
                  </Button>
                </div>
              </Card>

              {/* Scheduled Events */}
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold">Schedule Events</h3>
                <AbuseSchedulePanel userId={userId} />
              </Card>

              {/* Disable All */}
              <Card className="p-4 space-y-4 border-destructive/30">
                <h3 className="font-semibold flex items-center gap-2 text-destructive">
                  <Shield className="w-5 h-5" />
                  Disable All Abuse Events
                </h3>
                <Button
                  onClick={disableAllAbuse}
                  variant="destructive"
                  className="w-full gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Disable All Events
                </Button>
              </Card>
            </TabsContent>

            {/* Weapon Editor Tab */}
            <TabsContent value="weapons" className="mt-0">
              <WeaponEditorPanel />
            </TabsContent>

            {/* Class Codes Tab */}
            <TabsContent value="classes" className="mt-0">
              <ClassCodePanel />
            </TabsContent>

            {/* Pre-Made Updates Tab */}
            <TabsContent value="updates" className="mt-0">
              <PreMadeUpdatesPanel />
            </TabsContent>

            {/* Aimbot Tab */}
            <TabsContent value="aimbot" className="mt-0 space-y-4">
              <Card className="p-4 space-y-4 border-destructive/30 bg-destructive/5">
                <h3 className="font-semibold flex items-center gap-2">
                  <Crosshair className="w-5 h-5 text-destructive" />
                  Owner Aimbot (F9)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Press <span className="font-mono text-primary">F9</span> during any 3D game mode to toggle the aimbot. 
                  The AI will automatically aim at the nearest enemy and fire for you.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-destructive" />
                    <span>Auto-aims at nearest enemy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>Auto-fires when locked on</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-accent" />
                    <span>Owner-only feature (not visible to other players)</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground border-t border-border pt-2">
                  This feature is exclusive to owners and cannot be activated by admins or moderators.
                </p>
              </Card>
            </TabsContent>

            {/* AI Auto-Play Tab */}
            <TabsContent value="aiplay" className="mt-0 space-y-4">
              <Card className="p-4 space-y-4 border-primary/30 bg-primary/5">
                <h3 className="font-semibold flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  AI Auto-Play
                </h3>
                <p className="text-sm text-muted-foreground">
                  Describe what you want to achieve and the AI will play for you for 5 minutes, 
                  earning score, kills, and currency across different game modes.
                </p>

                <div className="space-y-3">
                  <div>
                    <Label>Your Goal</Label>
                    <Textarea
                      value={aiGoal}
                      onChange={(e) => setAiGoal(e.target.value)}
                      placeholder="e.g. Get me to 10,000 score, focus on boss mode and zombie mode..."
                      disabled={aiPlaying}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="flex gap-2">
                    {!aiPlaying ? (
                      <Button onClick={startAiPlay} className="gap-2">
                        <Play className="w-4 h-4" />
                        Start AI Auto-Play (5 min)
                      </Button>
                    ) : (
                      <Button onClick={stopAiPlay} variant="destructive" className="gap-2">
                        <Square className="w-4 h-4" />
                        Stop AI
                      </Button>
                    )}
                  </div>

                  {aiPlaying && (
                    <div className="flex items-center gap-2 text-sm font-mono text-primary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Time remaining: {Math.floor(aiTimeLeft / 60)}:{(aiTimeLeft % 60).toString().padStart(2, '0')}
                    </div>
                  )}

                  {/* Visual AI Screen — Immersive Player View */}
                  {aiPlaying && (
                    <div className="rounded-xl border-2 border-primary/40 bg-black overflow-hidden shadow-lg shadow-primary/10">
                      {/* Screen header bar - looks like a game HUD */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 border-b border-primary/30">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider">● LIVE</span>
                        </div>
                        <span className="text-[10px] font-mono text-primary font-bold tracking-wider">
                          {aiScreen.title}
                        </span>
                        <span className="text-[10px] font-mono text-primary">
                          {Math.floor(aiTimeLeft / 60)}:{(aiTimeLeft % 60).toString().padStart(2, '0')}
                        </span>
                      </div>

                      {/* Game-like viewport */}
                      <div className="relative min-h-[220px] bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
                        {/* Animated background grid */}
                        <div className="absolute inset-0 opacity-10" style={{
                          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                          backgroundSize: '20px 20px',
                          animation: 'pulse 2s ease-in-out infinite'
                        }} />

                        {/* Crosshair overlay when playing */}
                        {(aiScreen.scene === "playing" || aiScreen.scene === "ranked" || aiScreen.scene === "multiplayer") && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="relative w-12 h-12">
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-red-500/60" />
                              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-red-500/60" />
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-3 bg-red-500/60" />
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 w-3 bg-red-500/60" />
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-red-500 rounded-full" />
                            </div>
                          </div>
                        )}

                        {/* Main content */}
                        <div className="relative z-10 p-4 flex flex-col h-full min-h-[220px]">
                          {/* Top HUD bar */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 bg-black/60 rounded-lg px-3 py-1.5 border border-primary/20">
                              <span className="text-2xl">{aiScreen.avatar}</span>
                              <div>
                                <p className="text-xs font-bold text-primary">{aiScreen.title}</p>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{aiScreen.scene}</p>
                              </div>
                            </div>
                            
                            {/* Health/ammo style indicators */}
                            <div className="flex items-center gap-3">
                              <div className="bg-black/60 rounded px-2 py-1 border border-green-500/30">
                                <p className="text-[9px] text-green-400 font-mono">HP 100</p>
                              </div>
                              <div className="bg-black/60 rounded px-2 py-1 border border-yellow-500/30">
                                <p className="text-[9px] text-yellow-400 font-mono">AMMO ∞</p>
                              </div>
                            </div>
                          </div>

                          {/* Action feed - scrolling activity */}
                          <div className="flex-1 flex flex-col justify-center">
                            <div className="space-y-1">
                              {aiScreen.details.slice(-5).map((d, i) => (
                                <div 
                                  key={i} 
                                  className={`flex items-center gap-2 px-2 py-0.5 rounded ${
                                    i === aiScreen.details.slice(-5).length - 1 
                                      ? 'bg-primary/20 border border-primary/30' 
                                      : 'opacity-60'
                                  }`}
                                  style={{ 
                                    animation: i === aiScreen.details.slice(-5).length - 1 
                                      ? 'fadeIn 0.3s ease-out' 
                                      : undefined 
                                  }}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full ${
                                    d.includes('✅') ? 'bg-green-500' :
                                    d.includes('❌') ? 'bg-red-500' :
                                    d.includes('⚠️') ? 'bg-yellow-500' :
                                    'bg-primary animate-pulse'
                                  }`} />
                                  <p className="text-xs font-mono text-foreground/80 truncate">{d}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Progress bar styled as loading bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] font-mono text-muted-foreground">PROGRESS</span>
                              <span className="text-[9px] font-mono text-primary">{aiScreen.progress}%</span>
                            </div>
                            <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-primary/20">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${aiScreen.progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Bottom stats bar - game HUD style */}
                          <div className="mt-3 flex items-center justify-between bg-black/60 rounded-lg px-3 py-2 border border-primary/20">
                            <div className="flex items-center gap-4 text-xs font-mono">
                              <div className="text-center">
                                <p className="text-[9px] text-muted-foreground">SCORE</p>
                                <p className="text-primary font-bold">{aiScreen.stats.score.toLocaleString()}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] text-muted-foreground">KILLS</p>
                                <p className="text-red-400 font-bold">{aiScreen.stats.kills}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] text-muted-foreground">COINS</p>
                                <p className="text-yellow-400 font-bold">{aiScreen.stats.coins.toLocaleString()}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] text-muted-foreground">GEMS</p>
                                <p className="text-cyan-400 font-bold">{aiScreen.stats.gems}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] text-muted-foreground">GOLD</p>
                                <p className="text-amber-400 font-bold">{aiScreen.stats.gold}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Activity Log */}
                  {aiLog.length > 0 && (
                    <div className="bg-secondary/50 rounded-lg p-3 max-h-[200px] overflow-y-auto" ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2">📊 Activity Log</h4>
                      {aiLog.map((log, i) => (
                        <p key={i} className={`text-xs font-mono py-0.5 ${
                          log.startsWith('✅') ? 'text-green-400' :
                          log.startsWith('❌') ? 'text-red-400' :
                          log.startsWith('⚠️') ? 'text-yellow-400' :
                          log.startsWith('🎮') || log.startsWith('🏅') ? 'text-blue-400' :
                          log.startsWith('💰') || log.startsWith('🎉') ? 'text-amber-400' :
                          log.startsWith('📝') || log.startsWith('💌') ? 'text-purple-400' :
                          log.startsWith('🛒') || log.startsWith('🎨') ? 'text-cyan-400' :
                          log.startsWith('🌐') || log.startsWith('🎒') ? 'text-emerald-400' :
                          'text-foreground/80'
                        }`}>{log}</p>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-border pt-2">
                  This feature is exclusive to owners. Score and currency are added to your account in real-time.
                </p>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
