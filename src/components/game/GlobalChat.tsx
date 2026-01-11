import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, AlertTriangle, Shield, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

interface GlobalChatProps {
  userId: string;
  username: string;
}

// Profanity word list
const BANNED_WORDS = [
  "arse", "arsehead", "arsehole", "ass", "asshole",
  "bastard", "bitch", "bloody", "bollocks", "brotherfucker", "bugger", "bullshit",
  "child-fucker", "cock", "cocksucker", "crap", "cunt",
  "dammit", "damn", "damned", "dick", "dick-head", "dickhead", "dumb-ass", "dumbass", "dyke",
  "fag", "faggot", "father-fucker", "fatherfucker", "fuck", "fucked", "fucker", "fucking",
  "goddammit", "goddamn", "goddamned", "goddamnit", "godsdamn",
  "hell", "horseshit",
  "jackarse", "jack-ass", "jackass",
  "kike",
  "mother-fucker", "motherfucker",
  "nigga", "nigra",
  "pigfucker", "piss", "prick", "pussy",
  "shit", "shite", "sisterfuck", "sisterfucker", "slut", "spastic",
  "tranny", "twat",
  "wanker"
];

// Admin/Owner commands
const ADMIN_COMMANDS = [
  { cmd: "/clear", desc: "Clear chat history" },
  { cmd: "/announce <msg>", desc: "Send announcement" },
  { cmd: "/mute <username>", desc: "Mute a user" },
  { cmd: "/unmute <username>", desc: "Unmute a user" },
  { cmd: "/broadcast <msg>", desc: "Create a broadcast for all players" },
  { cmd: "/kick <username>", desc: "Kick player from chat" },
  { cmd: "/warn <username>", desc: "Add a warning to user" },
  { cmd: "/stats", desc: "Show chat statistics" },
];

const containsProfanity = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return BANNED_WORDS.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(lowerText);
  });
};

// Censor the ENTIRE message if it contains any bad words
const censorEntireMessage = (): string => {
  return "[Message censored for inappropriate language]";
};

export const GlobalChat = ({ userId, username }: GlobalChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isChatBanned, setIsChatBanned] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [isAdminOrOwner, setIsAdminOrOwner] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    checkChatBan();
    checkAdminStatus();
    
    // Subscribe to new messages
    const channel = supabase
      .channel("global-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "global_chat" },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => [...prev.slice(-99), newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const checkAdminStatus = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "owner"]);
    
    setIsAdminOrOwner(data && data.length > 0);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("global_chat")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) setMessages(data);
  };

  const checkChatBan = async () => {
    const { data } = await supabase
      .from("chat_warnings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      setIsChatBanned(data.is_chat_banned);
      setWarningCount(data.warning_count);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isChatBanned) return;

    const messageText = input.trim();
    setInput("");

    // Check for admin commands
    if (messageText.startsWith("/") && isAdminOrOwner) {
      await handleCommand(messageText);
      return;
    }

    // Check for profanity - censor ENTIRE message
    if (containsProfanity(messageText)) {
      // Increment warning
      const { data: existingWarning } = await supabase
        .from("chat_warnings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      const newWarningCount = (existingWarning?.warning_count || 0) + 1;
      const shouldBan = newWarningCount >= 2;

      if (existingWarning) {
        await supabase
          .from("chat_warnings")
          .update({
            warning_count: newWarningCount,
            is_chat_banned: shouldBan,
            last_warning_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      } else {
        await supabase
          .from("chat_warnings")
          .insert({
            user_id: userId,
            warning_count: newWarningCount,
            is_chat_banned: shouldBan,
            last_warning_at: new Date().toISOString(),
          });
      }

      setWarningCount(newWarningCount);

      if (shouldBan) {
        setIsChatBanned(true);
        toast.error("You have been banned from chat for using inappropriate language!");
        return;
      } else {
        toast.warning(`Warning ${newWarningCount}/2: Inappropriate language detected. One more warning and you'll be banned from chat.`);
      }

      // Send ENTIRELY censored message
      const censoredMessage = censorEntireMessage();
      await supabase.from("global_chat").insert({
        user_id: userId,
        username,
        message: censoredMessage,
      });
    } else {
      // Send normal message
      const { error } = await supabase.from("global_chat").insert({
        user_id: userId,
        username,
        message: messageText,
      });

      if (error) {
        toast.error("Failed to send message");
      }
    }
  };

  const handleCommand = async (cmd: string) => {
    const parts = cmd.split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(" ");

    switch (command) {
      case "/clear":
        // Clear all chat messages (admin only)
        const { error: clearError } = await supabase
          .from("global_chat")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
        
        if (!clearError) {
          setMessages([]);
          toast.success("Chat cleared");
          // Send system message
          await supabase.from("global_chat").insert({
            user_id: userId,
            username: "SYSTEM",
            message: `🛡️ Chat was cleared by ${username}`,
          });
        }
        break;

      case "/announce":
        if (args) {
          await supabase.from("global_chat").insert({
            user_id: userId,
            username: "📢 ANNOUNCEMENT",
            message: args,
          });
          toast.success("Announcement sent");
        } else {
          toast.error("Usage: /announce <message>");
        }
        break;

      case "/broadcast":
        if (args) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 30);
            
            await supabase.from("broadcasts").insert({
              message: args,
              created_by: user.id,
              expires_at: expiresAt.toISOString(),
            });
            toast.success("Broadcast created for 30 minutes");
          }
        } else {
          toast.error("Usage: /broadcast <message>");
        }
        break;

      case "/mute":
        if (args) {
          // Find user and mute them
          const { data: targetProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .ilike("username", args)
            .maybeSingle();

          if (targetProfile) {
            await supabase.from("chat_warnings").upsert({
              user_id: targetProfile.user_id,
              is_chat_banned: true,
              warning_count: 2,
            });
            toast.success(`${args} has been muted`);
          } else {
            toast.error("User not found");
          }
        } else {
          toast.error("Usage: /mute <username>");
        }
        break;

      case "/unmute":
        if (args) {
          const { data: targetProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .ilike("username", args)
            .maybeSingle();

          if (targetProfile) {
            await supabase
              .from("chat_warnings")
              .update({ is_chat_banned: false, warning_count: 0 })
              .eq("user_id", targetProfile.user_id);
            toast.success(`${args} has been unmuted`);
          } else {
            toast.error("User not found");
          }
        } else {
          toast.error("Usage: /unmute <username>");
        }
        break;

      case "/kick":
        if (args) {
          await supabase.from("global_chat").insert({
            user_id: userId,
            username: "SYSTEM",
            message: `⚠️ ${args} was kicked from chat by ${username}`,
          });
          toast.success(`${args} kicked from chat`);
        } else {
          toast.error("Usage: /kick <username>");
        }
        break;

      case "/warn":
        if (args) {
          const { data: targetProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .ilike("username", args)
            .maybeSingle();

          if (targetProfile) {
            const { data: existing } = await supabase
              .from("chat_warnings")
              .select("*")
              .eq("user_id", targetProfile.user_id)
              .maybeSingle();

            const newCount = (existing?.warning_count || 0) + 1;
            await supabase.from("chat_warnings").upsert({
              user_id: targetProfile.user_id,
              warning_count: newCount,
              is_chat_banned: newCount >= 2,
              last_warning_at: new Date().toISOString(),
            });
            toast.success(`Warning added to ${args} (${newCount}/2)`);
          } else {
            toast.error("User not found");
          }
        } else {
          toast.error("Usage: /warn <username>");
        }
        break;

      case "/stats":
        const { count: msgCount } = await supabase
          .from("global_chat")
          .select("*", { count: "exact", head: true });
        
        const { count: warnCount } = await supabase
          .from("chat_warnings")
          .select("*", { count: "exact", head: true });
        
        toast.info(`📊 Chat Stats: ${msgCount || 0} messages, ${warnCount || 0} warnings issued`);
        break;

      default:
        toast.error("Unknown command. Use /clear, /announce, /mute, /unmute, /broadcast, /kick, /warn, /stats");
    }
  };

  if (isChatBanned) {
    return (
      <Card className="p-4 bg-destructive/10 border-destructive/30">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">You are banned from chat</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Contact an owner to appeal your chat ban.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-80">
      <div className="p-3 border-b flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">Global Chat</span>
        {isAdminOrOwner && (
          <button 
            onClick={() => setShowCommands(!showCommands)}
            className="ml-auto text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Shield className="w-3 h-3" />
            Commands
          </button>
        )}
        {warningCount > 0 && !isAdminOrOwner && (
          <span className="text-xs text-amber-500 ml-auto">
            Warnings: {warningCount}/2
          </span>
        )}
      </div>
      
      {/* Admin Commands Help */}
      {showCommands && isAdminOrOwner && (
        <div className="p-2 bg-primary/10 border-b text-xs space-y-1 max-h-32 overflow-auto">
          <p className="font-medium text-primary">Admin Commands:</p>
          {ADMIN_COMMANDS.map((c, i) => (
            <p key={i} className="text-muted-foreground">
              <code className="bg-secondary px-1 rounded">{c.cmd}</code> - {c.desc}
            </p>
          ))}
        </div>
      )}
      
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-2">
          {messages.map((msg) => (
            <div key={msg.id} className="text-sm">
              <span className="font-medium text-primary">{msg.username}: </span>
              <span className="text-foreground">{msg.message}</span>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No messages yet. Be the first to chat!
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={!input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};
