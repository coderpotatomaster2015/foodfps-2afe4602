import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Loader2, Brain, Trash2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommand?: (cmd: string) => void;
  onShowOnlinePlayers?: () => void;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

const COMMANDS = [
  { cmd: "/godmode", desc: "Toggle invincibility & max ammo" },
  { cmd: "/speed [number]", desc: "Set player speed multiplier (1-5)" },
  { cmd: "/nuke", desc: "Kill all enemies" },
  { cmd: "/rain ammo", desc: "Spawn ammo pickups" },
  { cmd: "/infiniteammo", desc: "Toggle infinite ammo" },
  { cmd: "/revive", desc: "Revive player (restore full health)" },
  { cmd: "/give", desc: "Unlock all weapons" },
  { cmd: "/heal [amount]", desc: "Heal player by amount (default: full)" },
  { cmd: "/spawn [count]", desc: "Spawn enemies (default: 5)" },
  { cmd: "/clear", desc: "Clear all pickups and bullets" },
  { cmd: "/tp [x] [y]", desc: "Teleport to coordinates" },
  { cmd: "/score [amount]", desc: "Add score points" },
  { cmd: "/ban", desc: "Open ban management (admin only)" },
  { cmd: "/join [code]", desc: "Join a multiplayer room" },
  { cmd: "/shield", desc: "Add temporary shield" },
  { cmd: "/freeze", desc: "Freeze all enemies for 5 seconds" },
  { cmd: "/size [small/big]", desc: "Change player size" },
  { cmd: "/explode", desc: "Create explosion at player position" },
  { cmd: "/coins [amount]", desc: "Add coins to balance" },
  { cmd: "/gems [amount]", desc: "Add gems to balance" },
  { cmd: "/gold [amount]", desc: "Add gold to balance" },
  { cmd: "/?", desc: "Show all commands" },
];

const QUICK_ACTIONS = [
  { label: "📊 Stats", action: "get_stats" },
  { label: "🔒 Disable Site", action: "disable_website" },
  { label: "✅ Enable Site", action: "enable_website" },
];

export const AdminChat = ({ open, onOpenChange, onCommand, onShowOnlinePlayers }: AdminChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const checkPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleData) {
      setIsAdmin(true);
      setHasPermission(true);
      return;
    }

    const { data: permData } = await supabase
      .from("chat_permissions")
      .select("can_use_commands")
      .eq("user_id", user.id)
      .single();

    if (permData?.can_use_commands) {
      setHasPermission(true);
    }
  };

  const addMessage = (role: "user" | "assistant" | "system", content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: Date.now() }]);
  };

  const handleCommand = (cmd: string) => {
    if (cmd === "/?") {
      addMessage("system", "📋 Available commands:\n" + COMMANDS.map(c => `${c.cmd} - ${c.desc}`).join("\n"));
      return;
    }

    if (!hasPermission && !isAdmin) {
      addMessage("system", "❌ You don't have permission to use commands.");
      return;
    }

    const commandMap: Record<string, string> = {
      "/godmode": "✓ God mode toggled",
      "/speed": "✓ Speed set",
      "/nuke": "✓ All enemies eliminated!",
      "/rain ammo": "✓ Ammo rain activated!",
      "/infiniteammo": "✓ Infinite ammo toggled!",
      "/revive": "✓ Player revived!",
      "/give": "✓ All weapons unlocked!",
      "/heal": "✓ Player healed!",
      "/spawn": "✓ Enemies spawned!",
      "/clear": "✓ Cleared!",
      "/tp": "✓ Teleported!",
      "/score": "✓ Score added!",
      "/shield": "✓ Shield activated!",
      "/freeze": "✓ Enemies frozen for 5 seconds!",
      "/size": "✓ Size changed!",
      "/explode": "✓ Explosion created!",
      "/coins": "✓ Coins added!",
      "/gems": "✓ Gems added!",
      "/gold": "✓ Gold added!",
    };

    const matchedCmd = Object.keys(commandMap).find(c => cmd.startsWith(c));
    if (matchedCmd) {
      addMessage("system", commandMap[matchedCmd]);
      onCommand?.(cmd);
    } else if (cmd.startsWith("/ban")) {
      if (!isAdmin) {
        addMessage("system", "❌ Only admins can use ban commands.");
        return;
      }
      addMessage("system", "✓ Opening ban management...");
      onCommand?.(cmd);
    } else if (cmd.startsWith("/join")) {
      const match = cmd.match(/\/join\s+(\d{5})/);
      if (match) {
        addMessage("system", `✓ Joining room ${match[1]}...`);
        onCommand?.(cmd);
      } else {
        addMessage("system", "✓ Opening online players...");
        onShowOnlinePlayers?.();
      }
    } else {
      addMessage("system", "❌ Unknown command. Type /? for help");
    }
  };

  const sendToAI = async (userMessage: string, action?: string) => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get conversation history (last 20 messages for context)
      const conversationHistory = messages.slice(-20).map(m => ({
        role: m.role === "system" ? "assistant" : m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke("admin-ai", {
        body: { 
          message: userMessage, 
          action,
          conversationHistory,
          adminId: user?.id
        },
      });

      if (error) throw error;
      
      if (data.response) {
        addMessage("assistant", data.response);
      }
    } catch (error) {
      console.error("AI Error:", error);
      addMessage("assistant", "❌ Sorry, I encountered an error. Please try again.");
      toast.error("AI error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");

    if (text.startsWith("/")) {
      addMessage("user", text);
      handleCommand(text);
    } else if (showAI && isAdmin) {
      addMessage("user", text);
      await sendToAI(text);
    } else {
      addMessage("user", text);
      addMessage("system", "💬 Message sent to chat.");
    }
  };

  const handleQuickAction = async (action: string) => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("admin-ai", {
        body: { action },
      });

      if (error) throw error;
      
      if (data.response) {
        addMessage("assistant", data.response);
      }
    } catch (error) {
      console.error("Action error:", error);
      toast.error("Action failed");
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    toast.success("Conversation cleared");
  };

  if (!open) return null;

  return (
    <Card className="fixed bottom-20 left-4 w-96 max-w-[calc(100vw-2rem)] bg-card/95 backdrop-blur-sm border-border p-4 z-40 shadow-2xl">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">Console</h3>
            {isAdmin && (
              <Button
                variant={showAI ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAI(!showAI)}
                className="h-7 gap-1"
              >
                <Brain className="w-3 h-3" />
                AI
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                ADMIN
              </span>
            )}
            {hasPermission && !isAdmin && (
              <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded">
                COMMANDS
              </span>
            )}
            {messages.length > 0 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={clearHistory}
                title="Clear history"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick Actions for Admin AI */}
        {showAI && isAdmin && (
          <div className="flex flex-wrap gap-1">
            {QUICK_ACTIONS.map((qa) => (
              <Button
                key={qa.action}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(qa.action)}
                disabled={isLoading}
                className="h-7 text-xs"
              >
                {qa.label}
              </Button>
            ))}
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="h-64 pr-4" ref={scrollRef}>
          <div className="space-y-2">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {showAI ? (
                  <div className="space-y-2">
                    <Sparkles className="w-8 h-8 mx-auto opacity-50" />
                    <p>AI Assistant ready!</p>
                    <p className="text-xs">Ask me to manage updates, users, or get stats.</p>
                  </div>
                ) : (
                  <div>
                    <p>Type /? for commands</p>
                    {isAdmin && <p className="text-xs mt-1">Click "AI" to chat with the admin AI</p>}
                  </div>
                )}
              </div>
            )}
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`text-sm p-2 rounded-lg ${
                  msg.role === "user" 
                    ? "bg-primary/20 ml-8" 
                    : msg.role === "assistant"
                    ? "bg-accent/30 mr-8"
                    : "bg-muted/50 text-muted-foreground"
                }`}
              >
                <div className="whitespace-pre-wrap break-words font-mono text-xs">
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm p-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Thinking...
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={showAI ? "Ask the AI anything..." : "Type command or message..."}
            className="bg-input border-border font-mono text-sm flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {/* Help text */}
        <div className="text-xs text-muted-foreground">
          {showAI ? (
            <span>AI remembers your conversation • <span className="text-primary cursor-pointer" onClick={clearHistory}>Clear</span></span>
          ) : (
            <span>Type <span className="text-primary">/?</span> for commands • Press <span className="text-primary">ESC</span> to close</span>
          )}
        </div>
      </div>
    </Card>
  );
};