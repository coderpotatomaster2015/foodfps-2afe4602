import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Send, Power, Users, Bot, Shield, MessageSquare, Trophy, Sparkles, 
         Terminal, FlaskConical, Globe, Check, Ban, Zap, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface UserData {
  id: string;
  user_id: string;
  username: string;
  total_score: number;
  isBanned?: boolean;
  hasCommands?: boolean;
  isBetaTester?: boolean;
}

interface ActivePlayer {
  id: string;
  username: string;
  mode: string;
  room_code: string | null;
  last_seen: string;
}

interface PendingPost {
  id: string;
  username: string;
  content: string;
  image_url: string | null;
  created_at: string;
}

interface Update {
  id: string;
  name: string;
  description: string;
  is_released: boolean;
  is_beta: boolean;
  created_at: string;
}

export const AdminPanel = ({ open, onClose }: AdminPanelProps) => {
  const [websiteEnabled, setWebsiteEnabled] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [activePlayers, setActivePlayers] = useState<ActivePlayer[]>([]);
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserData[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Ban modal state
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<UserData | null>(null);
  const [banHours, setBanHours] = useState("");
  const [banReason, setBanReason] = useState("");

  // Update modal state
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateName, setUpdateName] = useState("");
  const [updateDescription, setUpdateDescription] = useState("");

  useEffect(() => {
    if (open) {
      loadSettings();
      loadUsers();
      loadActivePlayers();
      loadPendingPosts();
      loadUpdates();
      loadLeaderboard();
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("game_settings")
      .select("*")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .maybeSingle();
    
    if (data) {
      setWebsiteEnabled(data.website_enabled);
    }
  };

  const loadUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    if (!profiles) return;

    const { data: bans } = await supabase
      .from("bans")
      .select("user_id")
      .gt("expires_at", new Date().toISOString());

    const { data: permissions } = await supabase
      .from("chat_permissions")
      .select("user_id")
      .eq("can_use_commands", true);

    const { data: betaTesters } = await supabase
      .from("beta_testers")
      .select("user_id");

    const bannedIds = new Set(bans?.map(b => b.user_id) || []);
    const commandIds = new Set(permissions?.map(p => p.user_id) || []);
    const betaIds = new Set(betaTesters?.map(b => b.user_id) || []);

    setUsers(profiles.map(p => ({
      ...p,
      isBanned: bannedIds.has(p.user_id),
      hasCommands: commandIds.has(p.user_id),
      isBetaTester: betaIds.has(p.user_id),
    })));
  };

  const loadActivePlayers = async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("active_players")
      .select("*")
      .gt("last_seen", fiveMinutesAgo);
    
    if (data) setActivePlayers(data);
  };

  const loadPendingPosts = async () => {
    const { data } = await supabase
      .from("social_posts")
      .select("*")
      .eq("is_pending", true)
      .order("created_at", { ascending: false });
    
    if (data) setPendingPosts(data);
  };

  const loadUpdates = async () => {
    const { data } = await supabase
      .from("game_updates")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setUpdates(data);
  };

  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("total_score", { ascending: false })
      .limit(50);
    
    if (data) setLeaderboard(data);
  };

  const toggleWebsite = async () => {
    const newValue = !websiteEnabled;
    setWebsiteEnabled(newValue);
    
    const action = newValue ? "enable_website" : "disable_website";
    const { error } = await supabase.functions.invoke("admin-ai", {
      body: { action }
    });
    
    if (error) {
      toast.error("Failed to update website status");
      setWebsiteEnabled(!newValue);
    } else {
      toast.success(newValue ? "Website enabled" : "Website disabled");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      let action: string | undefined;
      const lowerMsg = userMessage.toLowerCase();
      
      if (lowerMsg.includes("disable") && lowerMsg.includes("website")) {
        action = "disable_website";
      } else if (lowerMsg.includes("enable") && lowerMsg.includes("website")) {
        action = "enable_website";
      } else if (lowerMsg.includes("stats") || lowerMsg.includes("statistics")) {
        action = "get_stats";
      } else if (lowerMsg.includes("ban") && lowerMsg.includes("user")) {
        const match = userMessage.match(/ban\s+(?:user\s+)?["']?(\w+)["']?/i);
        if (match) action = `ban_user:${match[1]}`;
      } else if (lowerMsg.includes("grant") && lowerMsg.includes("commands")) {
        const match = userMessage.match(/grant\s+(?:commands?\s+(?:to\s+)?)?["']?(\w+)["']?/i);
        if (match) action = `grant_commands:${match[1]}`;
      } else if (lowerMsg.includes("release") && lowerMsg.includes("update")) {
        const match = userMessage.match(/release\s+(?:update\s+)?["']?(.+?)["']?$/i);
        if (match) action = `release_update:${match[1]}`;
      } else if (lowerMsg.includes("create") && lowerMsg.includes("update")) {
        const match = userMessage.match(/create\s+(?:update\s+)?["']?(.+?)["']?\s*(?:with|:)\s*["']?(.+?)["']?$/i);
        if (match) action = `create_update:${match[1]}|${match[2]}`;
      } else if (lowerMsg.includes("beta") && lowerMsg.includes("release")) {
        const match = userMessage.match(/beta\s+(?:release\s+)?["']?(.+?)["']?$/i);
        if (match) action = `beta_release:${match[1]}`;
      }

      const { data, error } = await supabase.functions.invoke("admin-ai", {
        body: { message: userMessage, action }
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
      
      if (action) {
        loadSettings();
        loadUsers();
        loadUpdates();
      }
    } catch (error) {
      console.error("AI error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = (user: UserData) => {
    setBanTarget(user);
    setBanModalOpen(true);
  };

  const confirmBan = async () => {
    if (!banTarget || !banHours) {
      toast.error("Please enter hours");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + parseInt(banHours));

    const { error } = await supabase.from("bans").insert({
      user_id: banTarget.user_id,
      banned_by: user.id,
      hours: parseInt(banHours),
      reason: banReason || "Banned by admin",
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      toast.error("Failed to ban user");
    } else {
      toast.success(`${banTarget.username} has been banned`);
      setBanModalOpen(false);
      setBanTarget(null);
      setBanHours("");
      setBanReason("");
      loadUsers();
    }
  };

  const unbanUser = async (user: UserData) => {
    await supabase
      .from("bans")
      .delete()
      .eq("user_id", user.user_id);
    
    toast.success(`${user.username} has been unbanned`);
    loadUsers();
  };

  const toggleCommands = async (user: UserData) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    if (user.hasCommands) {
      await supabase
        .from("chat_permissions")
        .delete()
        .eq("user_id", user.user_id);
      toast.success(`Commands revoked from ${user.username}`);
    } else {
      await supabase.from("chat_permissions").upsert({
        user_id: user.user_id,
        can_use_commands: true,
        granted_by: currentUser.id,
      });
      toast.success(`Commands granted to ${user.username}`);
    }
    loadUsers();
  };

  const toggleBetaTester = async (user: UserData) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    if (user.isBetaTester) {
      await supabase
        .from("beta_testers")
        .delete()
        .eq("user_id", user.user_id);
      toast.success(`Beta tester removed: ${user.username}`);
    } else {
      await supabase.from("beta_testers").insert({
        user_id: user.user_id,
        granted_by: currentUser.id,
      });
      toast.success(`Beta tester added: ${user.username}`);
    }
    loadUsers();
  };

  const approvePost = async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("social_posts")
      .update({ 
        is_approved: true, 
        is_pending: false,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq("id", postId);
    
    toast.success("Post approved");
    loadPendingPosts();
  };

  const rejectPost = async (postId: string) => {
    await supabase
      .from("social_posts")
      .delete()
      .eq("id", postId);
    
    toast.success("Post rejected");
    loadPendingPosts();
  };

  const createUpdate = async () => {
    if (!updateName.trim() || !updateDescription.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("game_updates").insert({
      name: updateName,
      description: updateDescription,
      created_by: user.id,
    });

    if (error) {
      toast.error("Failed to create update");
    } else {
      toast.success("Update created");
      setUpdateModalOpen(false);
      setUpdateName("");
      setUpdateDescription("");
      loadUpdates();
    }
  };

  const releaseUpdate = async (updateId: string, toBeta: boolean = false) => {
    await supabase
      .from("game_updates")
      .update({ 
        is_released: !toBeta, 
        is_beta: toBeta,
        released_at: new Date().toISOString(),
        summary: toBeta ? undefined : "New features and improvements!"
      })
      .eq("id", updateId);
    
    toast.success(toBeta ? "Released to beta testers" : "Update released publicly");
    loadUpdates();
  };

  const applyCommandToPlayer = async (playerId: string, command: string) => {
    // This would broadcast to the player - for now just show toast
    toast.success(`Command "${command}" applied`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl h-[85vh] bg-card border-border flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">Admin Panel</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <Tabs defaultValue="controls" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="controls" className="gap-1 text-xs">
              <Power className="w-3 h-3" />
              Controls
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1 text-xs">
              <Users className="w-3 h-3" />
              Users
            </TabsTrigger>
            <TabsTrigger value="commands" className="gap-1 text-xs">
              <Terminal className="w-3 h-3" />
              Commands
            </TabsTrigger>
            <TabsTrigger value="updates" className="gap-1 text-xs">
              <Sparkles className="w-3 h-3" />
              Updates
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-1 text-xs relative">
              <Globe className="w-3 h-3" />
              Social
              {pendingPosts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {pendingPosts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-1 text-xs">
              <Trophy className="w-3 h-3" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1 text-xs">
              <Bot className="w-3 h-3" />
              AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="controls" className="flex-1 p-4 space-y-4 overflow-auto">
            <Card className="p-4 bg-secondary/50">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-semibold">Website Status</Label>
                  <p className="text-xs text-muted-foreground">
                    {websiteEnabled ? "Users can access the game" : "Users see disabled message"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${websiteEnabled ? "text-green-500" : "text-red-500"}`}>
                    {websiteEnabled ? "ENABLED" : "DISABLED"}
                  </span>
                  <Switch checked={websiteEnabled} onCheckedChange={toggleWebsite} />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-secondary/50">
              <h3 className="font-semibold mb-3">Quick Stats</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-background p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Total Users</p>
                  <p className="text-xl font-bold">{users.length}</p>
                </div>
                <div className="bg-background p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Active Players</p>
                  <p className="text-xl font-bold text-green-500">{activePlayers.length}</p>
                </div>
                <div className="bg-background p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Pending Posts</p>
                  <p className="text-xl font-bold text-yellow-500">{pendingPosts.length}</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="flex-1 p-4 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-2 pr-4">
                {users.map((u) => (
                  <Card key={u.id} className="p-3 bg-secondary/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.username}</span>
                        {u.isBanned && (
                          <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded">BANNED</span>
                        )}
                        {u.hasCommands && (
                          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">COMMANDS</span>
                        )}
                        {u.isBetaTester && (
                          <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">BETA</span>
                        )}
                        <span className="text-xs text-muted-foreground">Score: {u.total_score}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant={u.hasCommands ? "secondary" : "outline"} 
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => toggleCommands(u)}
                        >
                          <Terminal className="w-3 h-3 mr-1" />
                          {u.hasCommands ? "Revoke" : "Grant"}
                        </Button>
                        <Button 
                          variant={u.isBetaTester ? "secondary" : "outline"} 
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => toggleBetaTester(u)}
                        >
                          <FlaskConical className="w-3 h-3 mr-1" />
                          {u.isBetaTester ? "Remove" : "Beta"}
                        </Button>
                        {u.isBanned ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => unbanUser(u)}
                          >
                            Appeal
                          </Button>
                        ) : (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleBanUser(u)}
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            Ban
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="commands" className="flex-1 p-4 overflow-hidden">
            <h3 className="font-semibold mb-3">Active Players ({activePlayers.length})</h3>
            <ScrollArea className="h-[calc(100%-2rem)]">
              {activePlayers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No active players</p>
              ) : (
                <div className="space-y-2 pr-4">
                  {activePlayers.map((player) => (
                    <Card key={player.id} className="p-3 bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{player.username}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {player.mode} {player.room_code && `• Room: ${player.room_code}`}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-7"
                            onClick={() => applyCommandToPlayer(player.id, "godmode")}
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            Godmode
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-7"
                            onClick={() => applyCommandToPlayer(player.id, "infinite_ammo")}
                          >
                            <Zap className="w-3 h-3 mr-1" />
                            Inf Ammo
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-7"
                            onClick={() => applyCommandToPlayer(player.id, "spawn_enemies")}
                          >
                            Add Enemies
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="updates" className="flex-1 p-4 overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Game Updates</h3>
              <Button size="sm" onClick={() => setUpdateModalOpen(true)}>
                <Sparkles className="w-3 h-3 mr-1" />
                Create Update
              </Button>
            </div>
            <ScrollArea className="h-[calc(100%-3rem)]">
              <div className="space-y-2 pr-4">
                {updates.map((update) => (
                  <Card key={update.id} className="p-3 bg-secondary/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{update.name}</span>
                          {update.is_released && !update.is_beta && (
                            <span className="text-[10px] bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded">RELEASED</span>
                          )}
                          {update.is_beta && (
                            <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">BETA</span>
                          )}
                          {!update.is_released && !update.is_beta && (
                            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">DRAFT</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{update.description}</p>
                      </div>
                      {!update.is_released && (
                        <div className="flex gap-1 ml-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-7"
                            onClick={() => releaseUpdate(update.id, true)}
                          >
                            <FlaskConical className="w-3 h-3 mr-1" />
                            Beta
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="text-xs h-7"
                            onClick={() => releaseUpdate(update.id, false)}
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            Release
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="social" className="flex-1 p-4 overflow-hidden">
            <h3 className="font-semibold mb-3">Pending Posts ({pendingPosts.length})</h3>
            <ScrollArea className="h-[calc(100%-2rem)]">
              {pendingPosts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending posts</p>
              ) : (
                <div className="space-y-2 pr-4">
                  {pendingPosts.map((post) => (
                    <Card key={post.id} className="p-3 bg-secondary/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{post.username}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{post.content}</p>
                          {post.image_url && (
                            <img src={post.image_url} alt="" className="mt-2 rounded max-h-32 object-cover" />
                          )}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="text-xs h-7"
                            onClick={() => approvePost(post.id)}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="text-xs h-7"
                            onClick={() => rejectPost(post.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="leaderboard" className="flex-1 p-4 overflow-hidden">
            <h3 className="font-semibold mb-3">Global Leaderboard</h3>
            <ScrollArea className="h-[calc(100%-2rem)]">
              <div className="space-y-1 pr-4">
                {leaderboard.map((user, index) => (
                  <Card key={user.id} className="p-2 bg-secondary/50 flex items-center gap-3">
                    <span className={`w-6 text-center font-bold ${index < 3 ? "text-primary" : "text-muted-foreground"}`}>
                      #{index + 1}
                    </span>
                    <span className="flex-1 font-medium">{user.username}</span>
                    <span className="text-primary font-bold">{user.total_score}</span>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="ai" className="flex-1 flex flex-col p-4 overflow-hidden">
            <ScrollArea className="flex-1 mb-4" ref={scrollRef}>
              <div className="space-y-4 pr-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Ask me anything about managing the game!</p>
                    <p className="text-sm mt-2">Try: "Create update v1.2 with: New weapons added"</p>
                    <p className="text-xs mt-1">Or: "Release update v1.2 to beta testers"</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
                    }`}>
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-secondary p-3 rounded-lg">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the AI assistant..."
                disabled={loading}
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Ban Modal */}
      <Dialog open={banModalOpen} onOpenChange={setBanModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ban {banTarget?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Duration (hours)</Label>
              <Input
                type="number"
                value={banHours}
                onChange={(e) => setBanHours(e.target.value)}
                placeholder="e.g., 24"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter reason..."
              />
            </div>
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1" onClick={confirmBan}>
                Confirm Ban
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setBanModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Modal */}
      <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Update Name</Label>
              <Input
                value={updateName}
                onChange={(e) => setUpdateName(e.target.value)}
                placeholder="e.g., v1.2.0"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={updateDescription}
                onChange={(e) => setUpdateDescription(e.target.value)}
                placeholder="What's in this update?"
                rows={4}
              />
            </div>
            <Button className="w-full" onClick={createUpdate}>
              Create Update
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};