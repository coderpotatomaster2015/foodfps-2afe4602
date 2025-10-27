import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AdminChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommand?: (cmd: string) => void;
}

interface ChatMessage {
  text: string;
  color: string;
  timestamp: number;
}

const COMMANDS = [
  { cmd: "/activate auth 1082698", desc: "Activate admin mode" },
  { cmd: "/deactivate auth 1082698", desc: "Deactivate admin mode" },
  { cmd: "/give minigun auth 1082698", desc: "Get minigun (infinite ammo)" },
  { cmd: "/score [number] auth 1082698", desc: "Set your score" },
  { cmd: "/spawn enemy [count] auth 1082698", desc: "Spawn enemies" },
  { cmd: "/godmode auth 1082698", desc: "Toggle invincibility" },
  { cmd: "/speed [number] auth 1082698", desc: "Set player speed" },
  { cmd: "/nuke auth 1082698", desc: "Kill all enemies" },
  { cmd: "/rain ammo auth 1082698", desc: "Spawn ammo pickups" },
  { cmd: "/?", desc: "Show all commands" },
];

export const AdminChat = ({ open, onOpenChange, onCommand }: AdminChatProps) => {
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
      COMMANDS.forEach(c => {
        addMessage(`  ${c.cmd} - ${c.desc}`, "#9aa");
      });
      return;
    }

    if (cmd.startsWith("/activate auth 1082698")) {
      setAdminActive(true);
      addMessage("✓ Admin mode activated!", "#4cff4c");
      return;
    }

    if (cmd.startsWith("/deactivate auth 1082698")) {
      setAdminActive(false);
      addMessage("✗ Admin mode deactivated.", "#ff6b6b");
      return;
    }

    if (!adminActive) {
      addMessage("⚠ You must activate admin mode first", "#ff6b6b");
      addMessage("Use: /activate auth 1082698", "#9aa");
      return;
    }

    if (cmd.startsWith("/give minigun auth 1082698")) {
      addMessage("✓ Minigun granted: Infinite ammo, instant fire", "#FFB84D");
    } else if (cmd.startsWith("/score ")) {
      const match = cmd.match(/\/score (\d+) auth 1082698/);
      if (match) {
        addMessage(`✓ Score set to ${match[1]}`, "#FFB84D");
      } else {
        addMessage("✗ Invalid format. Use: /score [number] auth 1082698", "#ff6b6b");
      }
    } else if (cmd.startsWith("/spawn enemy ")) {
      const match = cmd.match(/\/spawn enemy (\d+) auth 1082698/);
      if (match) {
        addMessage(`✓ Spawned ${match[1]} enemies`, "#FFB84D");
      } else {
        addMessage("✗ Invalid format. Use: /spawn enemy [count] auth 1082698", "#ff6b6b");
      }
    } else if (cmd.startsWith("/godmode auth 1082698")) {
      addMessage("✓ God mode toggled", "#FFB84D");
    } else if (cmd.startsWith("/speed ")) {
      const match = cmd.match(/\/speed (\d+) auth 1082698/);
      if (match) {
        addMessage(`✓ Speed set to ${match[1]}`, "#FFB84D");
      } else {
        addMessage("✗ Invalid format. Use: /speed [number] auth 1082698", "#ff6b6b");
      }
    } else if (cmd.startsWith("/nuke auth 1082698")) {
      addMessage("✓ All enemies eliminated!", "#FFB84D");
    } else if (cmd.startsWith("/rain ammo auth 1082698")) {
      addMessage("✓ Ammo rain activated!", "#A6FFB3");
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
