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
import { X, Send, Power, Users, Bot, Shield, Trophy, Sparkles, 
         Terminal, FlaskConical, Globe, Check, Ban, Zap, Edit, Trash2,
         BarChart3, TrendingUp, Activity, Clock, UserX, Key, RefreshCw,
         Megaphone, Gift, Swords } from "lucide-react";
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
  created_at: string;
  isBanned?: boolean;
  hasCommands?: boolean;
  isBetaTester?: boolean;
  role?: "user" | "beta_tester" | "teacher" | "admin" | "owner";
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

interface ApprovedPost {
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
  is_seasonal: boolean;
  season: string | null;
  created_at: string;
}

interface Analytics {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  activePlayersNow: number;
  totalGamesPlayed: number;
  totalScore: number;
  avgScorePerUser: number;
  peakPlayersToday: number;
  bannedUsers: number;
  betaTesters: number;
}

export const AdminPanel = ({ open, onClose }: AdminPanelProps) => {
  const [websiteEnabled, setWebsiteEnabled] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [activePlayers, setActivePlayers] = useState<ActivePlayer[]>([]);
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [approvedPosts, setApprovedPosts] = useState<ApprovedPost[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserData[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
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

  // Edit username modal
  const [editUsernameModalOpen, setEditUsernameModalOpen] = useState(false);
  const [editUserTarget, setEditUserTarget] = useState<UserData | null>(null);
  const [newUsername, setNewUsername] = useState("");

  // Delete account modal
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [deleteAccountTarget, setDeleteAccountTarget] = useState<UserData | null>(null);

  // Reset password modal
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<UserData | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Broadcast modal
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastExpiry, setBroadcastExpiry] = useState("60");

  // Admin abuse modal
  const [abuseModalOpen, setAbuseModalOpen] = useState(false);
  const [abuseType, setAbuseType] = useState<"godmode" | "all_weapons" | "ultimate">("godmode");
  const [abuseDuration, setAbuseDuration] = useState("5");

  useEffect(() => {
    if (open) {
      loadSettings();
      loadUsers();
      loadActivePlayers();
      loadPendingPosts();
      loadApprovedPosts();
      loadUpdates();
      loadLeaderboard();
      loadAnalytics();
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
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
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

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const bannedIds = new Set(bans?.map(b => b.user_id) || []);
    const commandIds = new Set(permissions?.map(p => p.user_id) || []);
    const betaIds = new Set(betaTesters?.map(b => b.user_id) || []);
    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

    setUsers(profiles.map(p => ({
      ...p,
      isBanned: bannedIds.has(p.user_id),
      hasCommands: commandIds.has(p.user_id),
      isBetaTester: betaIds.has(p.user_id),
      role: roleMap.get(p.user_id) as any || "user",
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

  const loadApprovedPosts = async () => {
    const { data } = await supabase
      .from("social_posts")
      .select("*")
      .eq("is_approved", true)
      .eq("is_pending", false)
      .order("created_at", { ascending: false });
    
    if (data) setApprovedPosts(data);
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

  const loadAnalytics = async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

    const [
      { data: profiles },
      { data: newToday },
      { data: newWeek },
      { data: activePlayers },
      { data: rooms },
      { data: bans },
      { data: betaTesters }
    ] = await Promise.all([
      supabase.from("profiles").select("total_score"),
      supabase.from("profiles").select("id").gte("created_at", todayStart),
      supabase.from("profiles").select("id").gte("created_at", weekAgo),
      supabase.from("active_players").select("id").gt("last_seen", fiveMinutesAgo),
      supabase.from("game_rooms").select("id"),
      supabase.from("bans").select("id").gt("expires_at", now.toISOString()),
      supabase.from("beta_testers").select("id")
    ]);

    const totalScore = profiles?.reduce((acc, p) => acc + (p.total_score || 0), 0) || 0;
    const totalUsers = profiles?.length || 0;

    setAnalytics({
      totalUsers,
      newUsersToday: newToday?.length || 0,
      newUsersWeek: newWeek?.length || 0,
      activePlayersNow: activePlayers?.length || 0,
      totalGamesPlayed: rooms?.length || 0,
      totalScore,
      avgScorePerUser: totalUsers > 0 ? Math.round(totalScore / totalUsers) : 0,
      peakPlayersToday: activePlayers?.length || 0,
      bannedUsers: bans?.length || 0,
      betaTesters: betaTesters?.length || 0
    });
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
      // Get conversation history for memory
      const conversationHistory = messages.slice(-20).map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke("admin-ai", {
        body: { 
          message: userMessage,
          conversationHistory
        }
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
      
      // Refresh data after AI response
      loadSettings();
      loadUsers();
      loadUpdates();
      loadAnalytics();
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
      loadAnalytics();
    }
  };

  const unbanUser = async (user: UserData) => {
    await supabase
      .from("bans")
      .delete()
      .eq("user_id", user.user_id);
    
    toast.success(`${user.username} has been unbanned`);
    loadUsers();
    loadAnalytics();
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
    loadAnalytics();
  };

  const changeUserRole = async (user: UserData, newRole: string) => {
    if (newRole === "user") {
      await supabase.from("user_roles").delete().eq("user_id", user.user_id);
    } else {
      await supabase.from("user_roles").delete().eq("user_id", user.user_id);
      await supabase.from("user_roles").insert({ user_id: user.user_id, role: newRole as any });
    }
    toast.success(`${user.username} role changed to ${newRole}`);
    loadUsers();
  };

  const openEditUsername = (user: UserData) => {
    setEditUserTarget(user);
    setNewUsername(user.username);
    setEditUsernameModalOpen(true);
  };

  const confirmEditUsername = async () => {
    if (!editUserTarget || !newUsername.trim()) {
      toast.error("Please enter a username");
      return;
    }

    if (newUsername.trim().length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username: newUsername.trim() })
      .eq("user_id", editUserTarget.user_id);

    if (error) {
      toast.error("Failed to update username");
    } else {
      toast.success(`Username changed to ${newUsername.trim()}`);
      setEditUsernameModalOpen(false);
      setEditUserTarget(null);
      setNewUsername("");
      loadUsers();
      loadLeaderboard();
    }
  };

  const openDeleteAccount = (user: UserData) => {
    setDeleteAccountTarget(user);
    setDeleteAccountModalOpen(true);
  };

  const confirmDeleteAccount = async () => {
    if (!deleteAccountTarget) return;

    // Delete all user data
    await Promise.all([
      supabase.from("profiles").delete().eq("user_id", deleteAccountTarget.user_id),
      supabase.from("player_progress").delete().eq("user_id", deleteAccountTarget.user_id),
      supabase.from("kill_stats").delete().eq("user_id", deleteAccountTarget.user_id),
      supabase.from("bans").delete().eq("user_id", deleteAccountTarget.user_id),
      supabase.from("chat_permissions").delete().eq("user_id", deleteAccountTarget.user_id),
      supabase.from("beta_testers").delete().eq("user_id", deleteAccountTarget.user_id),
      supabase.from("social_posts").delete().eq("user_id", deleteAccountTarget.user_id),
      supabase.from("messages").delete().eq("from_user_id", deleteAccountTarget.user_id),
      supabase.from("messages").delete().eq("to_user_id", deleteAccountTarget.user_id),
      supabase.from("active_players").delete().eq("user_id", deleteAccountTarget.user_id),
    ]);

    toast.success(`Account ${deleteAccountTarget.username} deleted`);
    setDeleteAccountModalOpen(false);
    setDeleteAccountTarget(null);
    loadUsers();
    loadAnalytics();
  };

  const openResetPassword = (user: UserData) => {
    setResetPasswordTarget(user);
    setNewPassword("");
    setResetPasswordModalOpen(true);
  };

  const confirmResetPassword = async () => {
    if (!resetPasswordTarget || !newPassword.trim()) {
      toast.error("Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    // Note: Password reset requires admin API - show message to user
    toast.info(`Password reset for ${resetPasswordTarget.username} - User will need to use "Forgot Password" or contact admin directly`);
    setResetPasswordModalOpen(false);
    setResetPasswordTarget(null);
    setNewPassword("");
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
    loadApprovedPosts();
  };

  const rejectPost = async (postId: string) => {
    await supabase
      .from("social_posts")
      .delete()
      .eq("id", postId);
    
    toast.success("Post rejected");
    loadPendingPosts();
  };

  const deletePost = async (postId: string) => {
    await supabase
      .from("social_posts")
      .delete()
      .eq("id", postId);
    
    toast.success("Post deleted");
    loadApprovedPosts();
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
    const updateData = toBeta 
      ? { 
          is_beta: true, 
          is_released: false,
          released_at: new Date().toISOString()
        }
      : { 
          is_released: true, 
          is_beta: false,
          released_at: new Date().toISOString(),
          summary: "New features and improvements!"
        };

    await supabase
      .from("game_updates")
      .update(updateData)
      .eq("id", updateId);
    
    toast.success(toBeta ? "Released to beta testers" : "Update released publicly");
    loadUpdates();
  };

  const deleteUpdate = async (updateId: string) => {
    await supabase
      .from("game_updates")
      .delete()
      .eq("id", updateId);
    
    toast.success("Update deleted");
    loadUpdates();
  };

  const applyCommandToPlayer = async (playerId: string, command: string) => {
    toast.success(`Command "${command}" applied`);
  };

  const sendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(broadcastExpiry));

    const { error } = await supabase.from("broadcasts").insert({
      message: broadcastMessage,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      toast.error("Failed to send broadcast");
    } else {
      toast.success("Broadcast sent to all players!");
      setBroadcastModalOpen(false);
      setBroadcastMessage("");
    }
  };

  const activateAdminAbuse = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(abuseDuration));

      // First check if user has admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "owner"]);

      if (!roleData || roleData.length === 0) {
        toast.error("You need admin permissions");
        return;
      }

      const { error } = await supabase.from("admin_abuse_events").insert({
        event_type: abuseType,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      });

      if (error) {
        console.error("Admin abuse error:", error);
        toast.error("Failed to activate: " + error.message);
      } else {
        toast.success(`${abuseType === "godmode" ? "Godmode" : abuseType === "all_weapons" ? "All Weapons" : "Ultimate Rainbow"} activated for all players for ${abuseDuration} minutes!`);
        setAbuseModalOpen(false);
      }
    } catch (error) {
      console.error("Error activating admin abuse:", error);
      toast.error("Failed to activate");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl h-[90vh] bg-card border-border flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">Admin Panel</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <Tabs defaultValue="analytics" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="analytics" className="gap-1 text-xs">
              <BarChart3 className="w-3 h-3" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="controls" className="gap-1 text-xs">
              <Power className="w-3 h-3" />
              Controls
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1 text-xs">
              <Users className="w-3 h-3" />
              Users ({users.length})
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

          {/* Analytics Dashboard */}
          <TabsContent value="analytics" className="flex-1 p-4 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Analytics Dashboard</h3>
              <Button variant="outline" size="sm" onClick={loadAnalytics}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </Button>
            </div>
            
            {analytics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Total Users</span>
                  </div>
                  <p className="text-3xl font-bold">{analytics.totalUsers}</p>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-muted-foreground">Active Now</span>
                  </div>
                  <p className="text-3xl font-bold text-green-500">{analytics.activePlayersNow}</p>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/10">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                    <span className="text-sm text-muted-foreground">New Today</span>
                  </div>
                  <p className="text-3xl font-bold">{analytics.newUsersToday}</p>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-600/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    <span className="text-sm text-muted-foreground">New This Week</span>
                  </div>
                  <p className="text-3xl font-bold">{analytics.newUsersWeek}</p>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">Total Score</span>
                  </div>
                  <p className="text-3xl font-bold">{analytics.totalScore.toLocaleString()}</p>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-cyan-500/20 to-cyan-600/10">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-cyan-500" />
                    <span className="text-sm text-muted-foreground">Avg Score</span>
                  </div>
                  <p className="text-3xl font-bold">{analytics.avgScorePerUser}</p>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-red-500/20 to-red-600/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Ban className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-muted-foreground">Banned Users</span>
                  </div>
                  <p className="text-3xl font-bold text-red-500">{analytics.bannedUsers}</p>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-pink-500/20 to-pink-600/10">
                  <div className="flex items-center gap-2 mb-2">
                    <FlaskConical className="w-5 h-5 text-pink-500" />
                    <span className="text-sm text-muted-foreground">Beta Testers</span>
                  </div>
                  <p className="text-3xl font-bold">{analytics.betaTesters}</p>
                </Card>
              </div>
            )}

            <Card className="mt-4 p-4 bg-secondary/50">
              <h4 className="font-semibold mb-3">Recent Activity</h4>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">• {analytics?.totalGamesPlayed || 0} total games played</p>
                <p className="text-sm text-muted-foreground">• {pendingPosts.length} pending social posts</p>
                <p className="text-sm text-muted-foreground">• {updates.filter(u => !u.is_released && !u.is_beta).length} draft updates</p>
                <p className="text-sm text-muted-foreground">• Website is {websiteEnabled ? "enabled" : "disabled"}</p>
              </div>
            </Card>
          </TabsContent>

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

            {/* Broadcast Section */}
            <Card className="p-4 bg-secondary/50">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-semibold flex items-center gap-2">
                    <Megaphone className="w-4 h-4" />
                    Broadcast Message
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Send a message to all active players instantly
                  </p>
                </div>
                <Button onClick={() => setBroadcastModalOpen(true)}>
                  Send Broadcast
                </Button>
              </div>
            </Card>

            {/* Admin Abuse Section */}
            <Card className="p-4 bg-secondary/50 border-amber-500/30">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-semibold flex items-center gap-2 text-amber-500">
                    <Gift className="w-4 h-4" />
                    Admin Abuse (All Players)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Give temporary powers to ALL players
                  </p>
                </div>
                <Button variant="outline" className="border-amber-500 text-amber-500 hover:bg-amber-500/20" onClick={() => setAbuseModalOpen(true)}>
                  <Swords className="w-4 h-4 mr-2" />
                  Activate
                </Button>
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-medium truncate">{u.username}</span>
                        {u.isBanned && (
                          <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded">BANNED</span>
                        )}
                        {u.hasCommands && (
                          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">COMMANDS</span>
                        )}
                        {u.role && u.role !== "user" && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            u.role === "owner" ? "bg-purple-500/20 text-purple-500" :
                            u.role === "admin" ? "bg-red-500/20 text-red-500" :
                            u.role === "teacher" ? "bg-blue-500/20 text-blue-500" :
                            "bg-yellow-500/20 text-yellow-500"
                          }`}>{u.role.toUpperCase()}</span>
                        )}
                        {u.isBanned && (
                          <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded">BANNED</span>
                        )}
                        <span className="text-xs text-muted-foreground">Score: {u.total_score}</span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 items-center">
                        <select 
                          className="text-xs h-7 px-2 bg-secondary border border-border rounded"
                          value={u.role || "user"}
                          onChange={(e) => changeUserRole(u, e.target.value as any)}
                        >
                          <option value="user">User</option>
                          <option value="beta_tester">Beta Tester</option>
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => openEditUsername(u)}
                          title="Edit Username"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => openResetPassword(u)}
                          title="Reset Password"
                        >
                          <Key className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant={u.hasCommands ? "secondary" : "outline"} 
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => toggleCommands(u)}
                        >
                          <Terminal className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant={u.isBetaTester ? "secondary" : "outline"} 
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => toggleBetaTester(u)}
                        >
                          <FlaskConical className="w-3 h-3" />
                        </Button>
                        {u.isBanned ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => unbanUser(u)}
                          >
                            Unban
                          </Button>
                        ) : (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleBanUser(u)}
                          >
                            <Ban className="w-3 h-3" />
                          </Button>
                        )}
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => openDeleteAccount(u)}
                          title="Delete Account"
                        >
                          <UserX className="w-3 h-3" />
                        </Button>
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
            <Tabs defaultValue="all" className="h-full flex flex-col">
              <TabsList className="mb-2">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="seasonal" className="text-xs">Monthly/Seasonal</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="flex-1 overflow-hidden">
                <ScrollArea className="h-[calc(100%-3rem)]">
                  <div className="space-y-2 pr-4">
                    {updates.filter(u => !u.is_seasonal).map((update) => (
                      <Card key={update.id} className="p-3 bg-secondary/50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{update.name}</span>
                              {update.is_released && !update.is_beta && (
                                <span className="text-[10px] bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded">PUBLIC</span>
                              )}
                              {update.is_beta && !update.is_released && (
                                <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">BETA ONLY</span>
                              )}
                              {!update.is_released && !update.is_beta && (
                                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">DRAFT</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{update.description}</p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            {!update.is_released && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-xs h-7"
                                  onClick={() => releaseUpdate(update.id, true)}
                                  title="Release to Beta Testers"
                                >
                                  <FlaskConical className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  className="text-xs h-7"
                                  onClick={() => releaseUpdate(update.id, false)}
                                  title="Release to Public"
                                >
                                  <Sparkles className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="text-xs h-7"
                              onClick={() => deleteUpdate(update.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="seasonal" className="flex-1 overflow-hidden">
                <ScrollArea className="h-[calc(100%-3rem)]">
                  <div className="space-y-2 pr-4">
                    {updates.filter(u => u.is_seasonal).map((update) => (
                      <Card key={update.id} className="p-3 bg-secondary/50 border-l-4 border-l-primary">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{update.name}</span>
                              <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase">
                                {update.season || "Seasonal"}
                              </span>
                              {update.is_released && !update.is_beta && (
                                <span className="text-[10px] bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded">PUBLIC</span>
                              )}
                              {update.is_beta && !update.is_released && (
                                <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">BETA</span>
                              )}
                              {!update.is_released && !update.is_beta && (
                                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">READY</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{update.description}</p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            {!update.is_released && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-xs h-7"
                                  onClick={() => releaseUpdate(update.id, true)}
                                  title="Release to Beta"
                                >
                                  <FlaskConical className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  className="text-xs h-7"
                                  onClick={() => releaseUpdate(update.id, false)}
                                  title="Release to Public"
                                >
                                  <Sparkles className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="text-xs h-7"
                              onClick={() => deleteUpdate(update.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="social" className="flex-1 p-4 overflow-hidden">
            <Tabs defaultValue="pending" className="h-full flex flex-col">
              <TabsList className="mb-3">
                <TabsTrigger value="pending" className="text-xs">
                  Pending ({pendingPosts.length})
                </TabsTrigger>
                <TabsTrigger value="approved" className="text-xs">
                  Approved ({approvedPosts.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
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
              
              <TabsContent value="approved" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  {approvedPosts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No approved posts</p>
                  ) : (
                    <div className="space-y-2 pr-4">
                      {approvedPosts.map((post) => (
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
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="text-xs h-7 ml-2"
                              onClick={() => deletePost(post.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
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
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={async () => {
                          const amount = prompt("Enter score amount to add:");
                          if (amount && !isNaN(parseInt(amount))) {
                            await supabase.from("profiles").update({ total_score: user.total_score + parseInt(amount) }).eq("user_id", user.user_id);
                            toast.success(`Added ${amount} score to ${user.username}`);
                            loadLeaderboard();
                          }
                        }}
                      >+</Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={async () => {
                          const newScore = prompt("Set exact score:", String(user.total_score));
                          if (newScore && !isNaN(parseInt(newScore))) {
                            await supabase.from("profiles").update({ total_score: parseInt(newScore) }).eq("user_id", user.user_id);
                            toast.success(`Set ${user.username}'s score to ${newScore}`);
                            loadLeaderboard();
                          }
                        }}
                      >=</Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={async () => {
                          await supabase.from("profiles").update({ total_score: 0 }).eq("user_id", user.user_id);
                          toast.success(`Reset ${user.username}'s score to 0`);
                          loadLeaderboard();
                        }}
                      >0</Button>
                    </div>
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
                    <p className="font-medium">AI Assistant with Memory</p>
                    <p className="text-sm mt-2">I remember our entire conversation!</p>
                    <div className="mt-4 text-xs space-y-1">
                      <p>• "Create update v1.2 with: New weapons added"</p>
                      <p>• "Release v1.2 to beta testers"</p>
                      <p>• "Ban user player1 for 24 hours"</p>
                      <p>• "Get stats"</p>
                      <p>• "Broadcast: Server maintenance in 1 hour"</p>
                    </div>
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

      {/* Edit Username Modal */}
      <Dialog open={editUsernameModalOpen} onOpenChange={setEditUsernameModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Username</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Username</Label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter new username..."
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={confirmEditUsername}>
                Save
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditUsernameModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Modal */}
      <Dialog open={deleteAccountModalOpen} onOpenChange={setDeleteAccountModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-bold text-foreground">{deleteAccountTarget?.username}</span>'s account? 
              This will remove all their data and cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1" onClick={confirmDeleteAccount}>
                Delete Account
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setDeleteAccountModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={resetPasswordModalOpen} onOpenChange={setResetPasswordModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Reset password for <span className="font-bold text-foreground">{resetPasswordTarget?.username}</span>
            </p>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password..."
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={confirmResetPassword}>
                Reset Password
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setResetPasswordModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Broadcast Modal */}
      <Dialog open={broadcastModalOpen} onOpenChange={setBroadcastModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              Send Broadcast
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This message will be shown to all active players instantly.
            </p>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Enter broadcast message..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Expires in (minutes)</Label>
              <Input
                type="number"
                value={broadcastExpiry}
                onChange={(e) => setBroadcastExpiry(e.target.value)}
                placeholder="60"
                min="1"
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={sendBroadcast}>
                <Megaphone className="w-4 h-4 mr-2" />
                Send Broadcast
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setBroadcastModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Abuse Modal */}
      <Dialog open={abuseModalOpen} onOpenChange={setAbuseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <Gift className="w-5 h-5" />
              Admin Abuse - All Players
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Give temporary powers to ALL active players. Effects expire automatically.
            </p>
            <div className="space-y-2">
              <Label>Effect Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={abuseType === "godmode" ? "default" : "outline"}
                  onClick={() => setAbuseType("godmode")}
                  className="h-16 flex-col gap-1"
                >
                  <Shield className="w-5 h-5" />
                  <span className="text-xs">Godmode</span>
                </Button>
                <Button
                  variant={abuseType === "all_weapons" ? "default" : "outline"}
                  onClick={() => setAbuseType("all_weapons")}
                  className="h-16 flex-col gap-1"
                >
                  <Swords className="w-5 h-5" />
                  <span className="text-xs">All Weapons</span>
                </Button>
                <Button
                  variant={abuseType === "ultimate" ? "default" : "outline"}
                  onClick={() => setAbuseType("ultimate")}
                  className="h-16 flex-col gap-1 col-span-2"
                >
                  <Sparkles className="w-5 h-5" />
                  <span className="text-xs">Ultimate Rainbow</span>
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={abuseDuration}
                onChange={(e) => setAbuseDuration(e.target.value)}
                placeholder="5"
                min="1"
                max="60"
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={activateAdminAbuse}>
                <Zap className="w-4 h-4 mr-2" />
                Activate for All
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setAbuseModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};