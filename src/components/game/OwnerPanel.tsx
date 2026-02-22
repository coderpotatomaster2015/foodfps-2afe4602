import { useState, useEffect } from "react";
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
         Swords, Calculator, Trophy, Radio, Cake, Settings, Crosshair } from "lucide-react";
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
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
