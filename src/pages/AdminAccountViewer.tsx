import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, Search, User, MessageSquare, Gamepad2, Trophy, Ban, Lock, ArrowLeft } from "lucide-react";

const AdminAccountViewer = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"login" | "search" | "viewing">("login");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [targetUsername, setTargetUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Target user data
  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [targetMessages, setTargetMessages] = useState<any[]>([]);
  const [targetPosts, setTargetPosts] = useState<any[]>([]);
  const [targetChatLogs, setTargetChatLogs] = useState<any[]>([]);
  const [targetBans, setTargetBans] = useState<any[]>([]);
  const [targetCurrencies, setTargetCurrencies] = useState<any>(null);
  const [targetRoles, setTargetRoles] = useState<any[]>([]);
  const [targetActivePlayers, setTargetActivePlayers] = useState<any[]>([]);

  const handleAdminLogin = async () => {
    if (!adminEmail.trim() || !adminPassword.trim()) {
      toast.error("Please enter your credentials");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });
      if (error) throw error;

      // Check if admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .in("role", ["admin", "owner"]);

      if (!roles || roles.length === 0) {
        toast.error("You are not an admin");
        await supabase.auth.signOut();
        return;
      }

      setAdminUser(data.user);
      setStep("search");
      toast.success("Authenticated as admin");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const searchUser = async () => {
    if (!targetUsername.trim()) {
      toast.error("Enter a username");
      return;
    }
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", targetUsername.trim())
        .maybeSingle();

      if (!profile) {
        toast.error("User not found");
        setLoading(false);
        return;
      }

      setTargetProfile(profile);

      // Load all data in parallel
      const [messages, posts, chatLogs, bans, currencies, roles, active] = await Promise.all([
        supabase.from("messages").select("*").or(`from_user_id.eq.${profile.user_id},to_user_id.eq.${profile.user_id}`).order("created_at", { ascending: false }).limit(50),
        supabase.from("social_posts").select("*").eq("user_id", profile.user_id).order("created_at", { ascending: false }),
        supabase.from("global_chat").select("*").eq("user_id", profile.user_id).order("created_at", { ascending: false }).limit(100),
        supabase.from("bans").select("*").eq("user_id", profile.user_id).order("banned_at", { ascending: false }),
        supabase.from("player_currencies").select("*").eq("user_id", profile.user_id).maybeSingle(),
        supabase.from("user_roles").select("*").eq("user_id", profile.user_id),
        supabase.from("active_players").select("*").eq("user_id", profile.user_id),
      ]);

      setTargetMessages(messages.data || []);
      setTargetPosts(posts.data || []);
      setTargetChatLogs(chatLogs.data || []);
      setTargetBans(bans.data || []);
      setTargetCurrencies(currencies.data);
      setTargetRoles(roles.data || []);
      setTargetActivePlayers(active.data || []);
      setStep("viewing");
    } catch (error: any) {
      toast.error(error.message || "Error loading user data");
    } finally {
      setLoading(false);
    }
  };

  const banUser = async (hours: number, reason: string) => {
    if (!adminUser || !targetProfile) return;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hours);
    await supabase.from("bans").insert({
      user_id: targetProfile.user_id,
      banned_by: adminUser.id,
      hours,
      reason,
      expires_at: expiresAt.toISOString(),
    });
    toast.success(`${targetProfile.username} banned for ${hours} hours`);
    searchUser();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-destructive" />
          <h1 className="text-2xl font-bold">Admin Account Viewer</h1>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="ml-auto">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>

        {step === "login" && (
          <div className="max-w-sm mx-auto space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Enter your admin credentials to access player accounts for support.
            </p>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Admin email" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Password" type="password"
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()} />
            </div>
            <Button className="w-full" onClick={handleAdminLogin} disabled={loading}>
              <Lock className="w-4 h-4 mr-2" />
              {loading ? "Authenticating..." : "Login as Admin"}
            </Button>
          </div>
        )}

        {step === "search" && (
          <div className="max-w-sm mx-auto space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Enter the username of the player you want to investigate.
            </p>
            <div className="space-y-2">
              <Label>Player Username</Label>
              <Input value={targetUsername} onChange={(e) => setTargetUsername(e.target.value)} placeholder="Enter username..."
                onKeyDown={(e) => e.key === "Enter" && searchUser()} />
            </div>
            <Button className="w-full" onClick={searchUser} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              {loading ? "Searching..." : "Search Player"}
            </Button>
          </div>
        )}

        {step === "viewing" && targetProfile && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="w-8 h-8 text-primary" />
                <div>
                  <h2 className="text-xl font-bold">{targetProfile.username}</h2>
                  <p className="text-xs text-muted-foreground">
                    Joined: {new Date(targetProfile.created_at).toLocaleDateString()} • 
                    Score: {targetProfile.total_score} • 
                    Roles: {targetRoles.map(r => r.role).join(", ") || "user"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setStep("search"); setTargetProfile(null); }}>
                  Search Another
                </Button>
                <Button variant="destructive" size="sm" onClick={() => {
                  const hours = prompt("Ban for how many hours?");
                  const reason = prompt("Reason?");
                  if (hours) banUser(parseInt(hours), reason || "Admin action");
                }}>
                  <Ban className="w-4 h-4 mr-1" /> Ban
                </Button>
              </div>
            </div>

            {/* Currency info */}
            {targetCurrencies && (
              <div className="grid grid-cols-3 gap-2">
                <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Coins</p><p className="font-bold text-yellow-500">{targetCurrencies.coins}</p></Card>
                <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Gems</p><p className="font-bold text-blue-500">{targetCurrencies.gems}</p></Card>
                <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Gold</p><p className="font-bold text-amber-500">{targetCurrencies.gold}</p></Card>
              </div>
            )}

            {/* Active status */}
            {targetActivePlayers.length > 0 && (
              <Card className="p-3 bg-green-500/10 border-green-500/30">
                <p className="text-sm text-green-500 font-medium">🟢 Currently online - Playing: {targetActivePlayers[0].mode}</p>
              </Card>
            )}

            <Tabs defaultValue="chat">
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="chat" className="text-xs">Chat ({targetChatLogs.length})</TabsTrigger>
                <TabsTrigger value="messages" className="text-xs">Messages ({targetMessages.length})</TabsTrigger>
                <TabsTrigger value="posts" className="text-xs">Posts ({targetPosts.length})</TabsTrigger>
                <TabsTrigger value="bans" className="text-xs">Bans ({targetBans.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="chat">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1 pr-4">
                    {targetChatLogs.map(log => (
                      <div key={log.id} className="text-sm p-2 bg-secondary/30 rounded">
                        <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                        <p>{log.message}</p>
                      </div>
                    ))}
                    {targetChatLogs.length === 0 && <p className="text-center text-muted-foreground py-4">No chat logs</p>}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="messages">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1 pr-4">
                    {targetMessages.map(msg => (
                      <div key={msg.id} className="text-sm p-2 bg-secondary/30 rounded">
                        <div className="flex justify-between">
                          <span className="font-medium">{msg.from_username} → {msg.to_username}</span>
                          <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">{msg.subject}</p>
                        <p>{msg.content}</p>
                      </div>
                    ))}
                    {targetMessages.length === 0 && <p className="text-center text-muted-foreground py-4">No messages</p>}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="posts">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1 pr-4">
                    {targetPosts.map(post => (
                      <div key={post.id} className="text-sm p-2 bg-secondary/30 rounded">
                        <span className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString()}</span>
                        <p>{post.content}</p>
                        <span className={`text-xs ${post.is_approved ? "text-green-500" : post.is_pending ? "text-yellow-500" : "text-red-500"}`}>
                          {post.is_approved ? "Approved" : post.is_pending ? "Pending" : "Rejected"}
                        </span>
                      </div>
                    ))}
                    {targetPosts.length === 0 && <p className="text-center text-muted-foreground py-4">No posts</p>}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="bans">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1 pr-4">
                    {targetBans.map(ban => (
                      <div key={ban.id} className="text-sm p-2 bg-secondary/30 rounded">
                        <div className="flex justify-between">
                          <span className="font-medium">{ban.hours}h ban</span>
                          <span className={`text-xs ${new Date(ban.expires_at) > new Date() ? "text-red-500" : "text-muted-foreground"}`}>
                            {new Date(ban.expires_at) > new Date() ? "ACTIVE" : "Expired"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(ban.banned_at).toLocaleString()}</p>
                        {ban.reason && <p className="text-xs">{ban.reason}</p>}
                      </div>
                    ))}
                    {targetBans.length === 0 && <p className="text-center text-muted-foreground py-4">No bans</p>}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminAccountViewer;
