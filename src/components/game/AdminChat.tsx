import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  { cmd: "/activate auth PH", desc: "Activate admin mode (use auth PH)" },
  { cmd: "/deactivate", desc: "Deactivate admin mode" },
  { cmd: "/godmode", desc: "Toggle invincibility & max ammo" },
  { cmd: "/speed [number]", desc: "Set player speed" },
  { cmd: "/nuke", desc: "Kill all enemies" },
  { cmd: "/rain ammo", desc: "Spawn ammo pickups" },
  { cmd: "/infiniteammo", desc: "Toggle infinite ammo" },
  { cmd: "/revive", desc: "Revive player (restore full health)" },
  { cmd: "/give", desc: "Unlock all weapons" },
  { cmd: "/ban", desc: "Open ban management (admin only)" },
  { cmd: "/join", desc: "Show online players to join" },
  { cmd: "/?", desc: "Show all commands" },
];

export const AdminChat = ({ open, onOpenChange, onCommand, onShowOnlinePlayers }: AdminChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [adminActive, setAdminActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (text: string, color = "#ccc") => {
    setMessages(prev => [...prev, { text, color, timestamp: Date.now() }]);
  };

  const handleCommand = (cmd: string) => {
    if (cmd === "/?") {
      addMessage("Available commands:", "#FFB84D");
      COMMANDS.forEach(c => addMessage(`  ${c.cmd} - ${c.desc}`, "#9aa"));
      return;
    }

    if (cmd.startsWith("/activate auth PH")) {
      setAdminActive(true);
      addMessage("✓ Admin activated! No auth code needed for other commands.", "#4cff4c");
      return;
    }

    if (cmd.startsWith("/deactivate")) {
      setAdminActive(false);
      addMessage("✗ Admin mode deactivated.", "#ff6b6b");
      return;
    }

    if (!adminActive) return;

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
      addMessage("✓ Opening ban management...", "#FF6B6B");
    } else if (cmd.startsWith("/join")) {
      addMessage("✓ Opening online players...", "#A6FFB3");
      if (onShowOnlinePlayers) onShowOnlinePlayers();
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
    <Card className="fixed bottom-20 left-4 w-80 bg-card/95 backdrop-blur-sm border-border p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Admin Console</h3>
          {adminActive && (
            <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded">
              ADMIN
            </span>
          )}
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
          Type <span className="text-primary">/?</span> for commands
        </div>
      </div>
    </Card>
  );
};
