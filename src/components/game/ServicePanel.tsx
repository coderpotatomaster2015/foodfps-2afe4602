import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wrench, Search, Ban, Power, MessageSquare, Trophy, Gamepad2, Globe } from "lucide-react";

interface ServicePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ServicePanel = ({ open, onOpenChange }: ServicePanelProps) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const [loading, setLoading] = useState(false);

  // Target user data
  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [targetChatLogs, setTargetChatLogs] = useState<any[]>([]);
  const [targetMessages, setTargetMessages] = useState<any[]>([]);
  const [targetPosts, setTargetPosts] = useState<any[]>([]);
  const [targetBans, setTargetBans] = useState<any[]>([]);
  const [targetCurrencies, setTargetCurrencies] = useState<any>(null);
  const [targetRoles, setTargetRoles] = useState<any[]>([]);
  const [targetActivePlayers, setTargetActivePlayers] = useState<any[]>([]);
  const [targetGameSettings, setTargetGameSettings] = useState<any>(null);

  useEffect(() => {
    if (!open) {
      setAuthenticated(false);
      setPassword("");
      setTargetProfile(null);
    }
  }, [open]);

  const handleLogin = () => {
    if (password === "Service") {
      setAuthenticated(true);
      toast.success("Service panel unlocked");
    } else {
      toast.error("Invalid password");
    }
    setPassword("");
  };

  const searchUser = async () => {
    if (!searchUsername.trim()) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", searchUsername.trim())
        .maybeSingle();

      if (!profile) {
        toast.error("User not found");
        setLoading(false);
        return;
      }

      setTargetProfile(profile);

      const [messages, posts, chatLogs, bans, currencies, roles, active, settings] = await Promise.all([
        supabase
          .from("messages")
          .select("*")
          .or(`from_user_id.eq.${profile.user_id},to_user_id.eq.${profile.user_id}`)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("social_posts")
          .select("*")
          .eq("user_id", profile.user_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("global_chat")
          .select("*")
          .eq("user_id", profile.user_id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("bans").select("*").eq("user_id", profile.user_id).order("banned_at", { ascending: false }),
        supabase.from("player_currencies").select("*").eq("user_id", profile.user_id).maybeSingle(),
        supabase.from("user_roles").select("*").eq("user_id", profile.user_id),
        supabase.from("active_players").select("*").eq("user_id", profile.user_id),
        supabase.from("game_settings").select("*").eq("id", "00000000-0000-0000-0000-000000000001").maybeSingle(),
      ]);

      setTargetMessages(messages.data || []);
      setTargetPosts(posts.data || []);
      setTargetChatLogs(chatLogs.data || []);
      setTargetBans(bans.data || []);
      setTargetCurrencies(currencies.data);
      setTargetRoles(roles.data || []);
      setTargetActivePlayers(active.data || []);
      setTargetGameSettings(settings.data);
    } catch (error: any) {
      toast.error(error.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const banUser = async () => {
    if (!targetProfile) return;
    const hours = prompt("Ban duration in hours:");
    const reason = prompt("Reason:");
    if (!hours) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + parseInt(hours));

    await supabase.from("bans").insert({
      user_id: targetProfile.user_id,
      banned_by: user.id,
      hours: parseInt(hours),
      reason: reason || "Service action",
      expires_at: expiresAt.toISOString(),
    });
    toast.success(`Banned ${targetProfile.username} for ${hours}h`);
    searchUser();
  };

  const toggleModeForUser = async (mode: string, disabled: boolean) => {
    // This disables game modes globally (there's no per-user mode disable in the current schema)
    const updateData: any = {};
    if (mode === "solo") updateData.solo_disabled = disabled;
    if (mode === "multiplayer") updateData.multiplayer_disabled = disabled;
    if (mode === "boss") updateData.boss_disabled = disabled;
    if (mode === "school") updateData.school_disabled = disabled;
    if (mode === "ranked") updateData.ranked_disabled = disabled;

    await supabase.from("game_settings").update(updateData).eq("id", "00000000-0000-0000-0000-000000000001");
    toast.success(`${mode} ${disabled ? "disabled" : "enabled"}`);

    // Refresh settings
    const { data } = await supabase
      .from("game_settings")
      .select("*")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .maybeSingle();
    if (data) setTargetGameSettings(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            Service Panel
          </DialogTitle>
        </DialogHeader>

        {!authenticated ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="space-y-4 w-64">
              <p className="text-sm text-muted-foreground text-center">Enter service password</p>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Password..."
                autoFocus
              />
              <Button className="w-full" onClick={handleLogin}>
                Unlock
              </Button>
            </div>
          </div>
        ) : !targetProfile ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="space-y-4 w-72">
              <p className="text-sm text-muted-foreground text-center">Search for a player to manage</p>
              <Input
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchUser()}
                placeholder="Enter username..."
                autoFocus
              />
              <Button className="w-full" onClick={searchUser} disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg">{targetProfile.username}</h3>
                <p className="text-xs text-muted-foreground">
                  Score: {targetProfile.total_score} • Roles: {targetRoles.map((r) => r.role).join(", ") || "user"}
                  {targetActivePlayers.length > 0 && (
                    <span className="text-green-500 ml-2">● Online ({targetActivePlayers[0].mode})</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setTargetProfile(null)}>
                  Search Another
                </Button>
                <Button variant="destructive" size="sm" onClick={banUser}>
                  <Ban className="w-4 h-4 mr-1" />
                  Ban
                </Button>
              </div>
            </div>

            {targetCurrencies && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                <Card className="p-2 text-center text-sm">
                  <span className="text-muted-foreground">Coins:</span>{" "}
                  <span className="font-bold text-yellow-500">{targetCurrencies.coins}</span>
                </Card>
                <Card className="p-2 text-center text-sm">
                  <span className="text-muted-foreground">Gems:</span>{" "}
                  <span className="font-bold text-blue-500">{targetCurrencies.gems}</span>
                </Card>
                <Card className="p-2 text-center text-sm">
                  <span className="text-muted-foreground">Gold:</span>{" "}
                  <span className="font-bold text-amber-500">{targetCurrencies.gold}</span>
                </Card>
              </div>
            )}

            <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="chat" className="text-xs">
                  Chat
                </TabsTrigger>
                <TabsTrigger value="messages" className="text-xs">
                  Messages
                </TabsTrigger>
                <TabsTrigger value="posts" className="text-xs">
                  Posts
                </TabsTrigger>
                <TabsTrigger value="bans" className="text-xs">
                  Bans
                </TabsTrigger>
                <TabsTrigger value="modes" className="text-xs">
                  Modes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-1 pr-4">
                    {targetChatLogs.map((log) => (
                      <div key={log.id} className="text-sm p-2 bg-secondary/30 rounded">
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        <p>{log.message}</p>
                      </div>
                    ))}
                    {targetChatLogs.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No chat logs</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="messages" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-1 pr-4">
                    {targetMessages.map((msg) => (
                      <div key={msg.id} className="text-sm p-2 bg-secondary/30 rounded">
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {msg.from_username} → {msg.to_username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">{msg.subject}</p>
                        <p>{msg.content}</p>
                      </div>
                    ))}
                    {targetMessages.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No messages</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="posts" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-1 pr-4">
                    {targetPosts.map((post) => (
                      <div key={post.id} className="text-sm p-2 bg-secondary/30 rounded">
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleString()}
                        </span>
                        <p>{post.content}</p>
                        <span className={`text-xs ${post.is_approved ? "text-green-500" : "text-yellow-500"}`}>
                          {post.is_approved ? "Approved" : "Pending"}
                        </span>
                      </div>
                    ))}
                    {targetPosts.length === 0 && <p className="text-center text-muted-foreground py-4">No posts</p>}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="bans" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-1 pr-4">
                    {targetBans.map((ban) => (
                      <div key={ban.id} className="text-sm p-2 bg-secondary/30 rounded">
                        <div className="flex justify-between">
                          <span>{ban.hours}h ban</span>
                          <span
                            className={`text-xs ${new Date(ban.expires_at) > new Date() ? "text-red-500" : "text-muted-foreground"}`}
                          >
                            {new Date(ban.expires_at) > new Date() ? "ACTIVE" : "Expired"}
                          </span>
                        </div>
                        {ban.reason && <p className="text-xs text-muted-foreground">{ban.reason}</p>}
                      </div>
                    ))}
                    {targetBans.length === 0 && <p className="text-center text-muted-foreground py-4">No bans</p>}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="modes" className="flex-1 overflow-auto">
                <div className="space-y-3 p-2">
                  <p className="text-xs text-muted-foreground">Toggle game modes globally</p>
                  {targetGameSettings && (
                    <>
                      {["solo", "multiplayer", "boss", "school", "ranked"].map((mode) => {
                        const key = `${mode}_disabled` as keyof typeof targetGameSettings;
                        const isDisabled = targetGameSettings[key] || false;
                        return (
                          <Card key={mode} className="p-3 flex items-center justify-between">
                            <span className="capitalize font-medium">{mode}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${isDisabled ? "text-red-500" : "text-green-500"}`}>
                                {isDisabled ? "Disabled" : "Enabled"}
                              </span>
                              <Switch
                                checked={!isDisabled}
                                onCheckedChange={(checked) => toggleModeForUser(mode, !checked)}
                              />
                            </div>
                          </Card>
                        );
                      })}
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
