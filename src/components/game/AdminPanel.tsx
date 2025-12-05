import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Send, Power, Users, MessageSquare, Bot, Shield } from "lucide-react";
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

export const AdminPanel = ({ open, onClose }: AdminPanelProps) => {
  const [websiteEnabled, setWebsiteEnabled] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      loadSettings();
      loadUsers();
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
      .single();
    
    if (data) {
      setWebsiteEnabled(data.website_enabled);
    }
  };

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("*");
    if (data) setUsers(data);
  };

  const toggleWebsite = async () => {
    const newValue = !websiteEnabled;
    setWebsiteEnabled(newValue);
    
    const action = newValue ? "enable_website" : "disable_website";
    const { data, error } = await supabase.functions.invoke("admin-ai", {
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
      // Check for action keywords
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
      }

      const { data, error } = await supabase.functions.invoke("admin-ai", {
        body: { message: userMessage, action }
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
      
      // Refresh data after actions
      if (action) {
        loadSettings();
        loadUsers();
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

  const banUser = async (userId: string, username: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error } = await supabase.from("bans").insert({
      user_id: userId,
      banned_by: user.id,
      hours: 24,
      reason: "Banned by admin",
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      toast.error("Failed to ban user");
    } else {
      toast.success(`${username} has been banned for 24 hours`);
    }
  };

  const grantCommands = async (userId: string, username: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("chat_permissions").upsert({
      user_id: userId,
      can_use_commands: true,
      granted_by: user.id,
    });

    if (error) {
      toast.error("Failed to grant permissions");
    } else {
      toast.success(`${username} can now use admin commands`);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] bg-card border-border flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">Admin Panel</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <Tabs defaultValue="controls" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="controls" className="gap-2">
              <Power className="w-4 h-4" />
              Controls
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Bot className="w-4 h-4" />
              AI Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="controls" className="flex-1 p-4 space-y-6">
            <Card className="p-6 bg-secondary/50">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-lg font-semibold">Website Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {websiteEnabled 
                      ? "Website is currently accessible to all users"
                      : "Website is disabled. Users will see a disabled message"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${websiteEnabled ? "text-green-500" : "text-red-500"}`}>
                    {websiteEnabled ? "ENABLED" : "DISABLED"}
                  </span>
                  <Switch
                    checked={websiteEnabled}
                    onCheckedChange={toggleWebsite}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-secondary/50">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
                <div className="bg-background p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Website Status</p>
                  <p className={`text-2xl font-bold ${websiteEnabled ? "text-green-500" : "text-red-500"}`}>
                    {websiteEnabled ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="flex-1 p-4 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {users.map((u) => (
                  <Card key={u.id} className="p-4 bg-secondary/50 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{u.username}</p>
                      <p className="text-sm text-muted-foreground">Score: {u.total_score}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => grantCommands(u.user_id, u.username)}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Grant Commands
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => banUser(u.user_id, u.username)}
                      >
                        Ban
                      </Button>
                    </div>
                  </Card>
                ))}
                {users.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No users yet</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="ai" className="flex-1 flex flex-col p-4">
            <ScrollArea className="flex-1 mb-4" ref={scrollRef}>
              <div className="space-y-4 pr-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Ask me anything about managing the game!</p>
                    <p className="text-sm mt-2">Try: "Show me stats" or "Disable the website"</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
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

            <form 
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex gap-2"
            >
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
    </div>
  );
};
