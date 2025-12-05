import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdminChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommand?: (cmd: string) => void;
  onShowOnlinePlayers?: () => void;
}

interface ChatMessage {
  text: string;
  color: string;
  timestamp: number;
}

const COMMANDS = [
  { cmd: "/godmode", desc: "Toggle invincibility & max ammo" },
  { cmd: "/speed [number]", desc: "Set player speed" },
  { cmd: "/nuke", desc: "Kill all enemies" },
  { cmd: "/rain ammo", desc: "Spawn ammo pickups" },
  { cmd: "/infiniteammo", desc: "Toggle infinite ammo" },
  { cmd: "/revive", desc: "Revive player (restore full health)" },
  { cmd: "/give", desc: "Unlock all weapons" },
  { cmd: "/ban", desc: "Open ban management (admin only)" },
  { cmd: "/join [code]", desc: "Join a multiplayer room" },
  { cmd: "/?", desc: "Show all commands" },
];

export const AdminChat = ({ open, onOpenChange, onCommand, onShowOnlinePlayers }: AdminChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [hasPermission, setHasPermission] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle escape key to close
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

    // Check if admin
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

    // Check if granted permissions
    const { data: permData } = await supabase
      .from("chat_permissions")
      .select("can_use_commands")
      .eq("user_id", user.id)
      .single();

    if (permData?.can_use_commands) {
      setHasPermission(true);
    }
  };

  const addMessage = (text: string, color = "#ccc") => {
    setMessages(prev => [...prev, { text, color, timestamp: Date.now() }]);
  };

  const handleCommand = (cmd: string) => {
    if (cmd === "/?") {
      addMessage("Available commands:", "#FFB84D");
      COMMANDS.forEach(c => addMessage(`  ${c.cmd} - ${c.desc}`, "#9aa"));
      return;
    }

    if (!hasPermission && !isAdmin) {
      addMessage("✗ You don't have permission to use commands. Ask an admin to grant you access.", "#ff6b6b");
      return;
    }

    if (cmd.startsWith("/godmode")) {
      addMessage("✓ God mode toggled", "#FFB84D");
    } else if (cmd.startsWith("/speed")) {
      addMessage("✓ Speed set", "#FFB84D");
    } else if (cmd.startsWith("/nuke")) {
      addMessage("✓ All enemies eliminated!", "#FFB84D");
    } else if (cmd.startsWith("/rain ammo")) {
      addMessage("✓ Ammo rain activated!", "#A6FFB3");
    } else if (cmd.startsWith("/infiniteammo")) {
      addMessage("✓ Infinite ammo toggled!", "#FFB84D");
    } else if (cmd.startsWith("/revive")) {
      addMessage("✓ Player revived!", "#A6FFB3");
    } else if (cmd.startsWith("/give")) {
      addMessage("✓ All weapons unlocked!", "#FFD700");
    } else if (cmd.startsWith("/ban")) {
      if (!isAdmin) {
        addMessage("✗ Only admins can use ban commands.", "#ff6b6b");
        return;
      }
      addMessage("✓ Opening ban management...", "#FF6B6B");
    } else if (cmd.startsWith("/join")) {
      const match = cmd.match(/\/join\s+(\d{5})/);
      if (match) {
        addMessage(`✓ Attempting to join room ${match[1]}...`, "#A6FFB3");
      } else {
        addMessage("✓ Opening online players...", "#A6FFB3");
        if (onShowOnlinePlayers) onShowOnlinePlayers();
      }
    } else {
      addMessage("✗ Unknown command. Type /? for help", "#ff6b6b");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;

    addMessage("> " + cmd, "#aaa");

    if (cmd.startsWith("/")) {
      handleCommand(cmd);
      onCommand?.(cmd);
    } else {
      addMessage("You: " + cmd, "#ccc");
    }

    setInput("");
  };

  if (!open) return null;

  return (
    <Card className="fixed bottom-20 left-4 w-80 bg-card/95 backdrop-blur-sm border-border p-4 z-40">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Console</h3>
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

        <ScrollArea className="h-48 pr-4" ref={scrollRef}>
          <div className="space-y-1 text-sm font-mono">
            {messages.map((msg, i) => (
              <div key={i} style={{ color: msg.color }}>
                {msg.text}
              </div>
            ))}
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type command or message..."
            className="bg-input border-border font-mono text-sm"
          />
        </form>

        <div className="text-xs text-muted-foreground">
          Type <span className="text-primary">/?</span> for commands • Press <span className="text-primary">ESC</span> to close
        </div>
      </div>
    </Card>
  );
};
