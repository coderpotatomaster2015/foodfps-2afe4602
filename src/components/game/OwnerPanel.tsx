import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Megaphone, Image, Check, X as XIcon, Loader2, Crown, Sparkles, Users, 
         Ban, Paintbrush, Coins, Gift, MessageCircle, Zap, Shield, GraduationCap, Swords } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SkinEditor } from "./SkinEditor";
import { ClassCodePanel } from "./ClassCodePanel";
import { WeaponEditorPanel } from "./WeaponEditorPanel";
import { PreMadeUpdatesPanel } from "./PreMadeUpdatesPanel";

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
}

export const OwnerPanel = ({ open, onClose }: OwnerPanelProps) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [adSignups, setAdSignups] = useState<AdSignup[]>([]);
  const [ipBans, setIPBans] = useState<IPBan[]>([]);
  const [chatBannedUsers, setChatBannedUsers] = useState<ChatBannedUser[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

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

  useEffect(() => {
    if (open) {
      loadAds();
      loadAdSignups();
      loadIPBans();
      loadChatBannedUsers();
      loadUsers();
    }
  }, [open]);

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
      // Fetch usernames for banned users
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
      .select("user_id, username")
      .order("username");
    
    if (data) setUsers(data);
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

  const unbanFromChat = async (userId: string) => {
    const { error } = await supabase
      .from("chat_warnings")
      .update({ is_chat_banned: false, warning_count: 0 })
      .eq("user_id", userId);

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

  const activateUltimateAbuse = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(abuseDuration));

    const { error } = await supabase.from("admin_abuse_events").insert({
      event_type: "ultimate",
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      toast.error("Failed to activate");
    } else {
      toast.success(`Ultimate Rainbow Mode activated for ${abuseDuration} minutes!`);
    }
  };

  const disableUltimateAbuse = async () => {
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
            <TabsTrigger value="currency" className="gap-1 text-xs">
              <Coins className="w-3 h-3" /> Currency
            </TabsTrigger>
            <TabsTrigger value="updates" className="gap-1 text-xs">
              <Sparkles className="w-3 h-3" /> Updates
            </TabsTrigger>
            <TabsTrigger value="abuse" className="gap-1 text-xs">
              <Zap className="w-3 h-3" /> Admin Abuse
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 p-4">
            {/* Create Ad Tab */}
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

              {/* Manage Ads */}
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
                <p className="text-xs text-muted-foreground">
                  Owners are automatically exempt from IP bans
                </p>
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

              <Card className="p-4 bg-amber-500/10 border-amber-500/30">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <span className="font-medium">Owner Privilege</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  As an owner, you have infinite currency (999,999,999 of each).
                </p>
              </Card>
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
                    onClick={activateUltimateAbuse}
                    className="w-full gap-2 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 hover:from-red-600 hover:via-yellow-600 hover:to-blue-600"
                  >
                    <Zap className="w-4 h-4" />
                    Activate Ultimate Mode
                  </Button>
                </div>
              </Card>

              {/* Disable Rainbow Mode */}
              <Card className="p-4 space-y-4 border-destructive/30">
                <h3 className="font-semibold flex items-center gap-2 text-destructive">
                  <Shield className="w-5 h-5" />
                  Disable Rainbow Mode
                </h3>
                <p className="text-sm text-muted-foreground">
                  Immediately deactivate all active rainbow/abuse events.
                </p>
                <Button
                  onClick={disableUltimateAbuse}
                  variant="destructive"
                  className="w-full gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Disable All Abuse Events
                </Button>
              </Card>

              <Card className="p-4 bg-secondary/50">
                <h4 className="font-medium mb-2">What Ultimate Mode does:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All UI elements cycle through rainbow colors</li>
                  <li>• Player skins constantly change colors</li>
                  <li>• Enemies become rainbow colored</li>
                  <li>• Background shifts through spectrum</li>
                  <li>• Pure visual chaos for the duration!</li>
                </ul>
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
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};