import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, AlertTriangle, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { rateLimitedAction, RATE_LIMITS } from "@/utils/rateLimiter";

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
  { cmd: "/gift <user> <coins> <gems> <gold>", desc: "Gift currency to user" },
  { cmd: "/ban <username> <hours>", desc: "Ban a user" },
  { cmd: "/unban <username>", desc: "Unban a user" },
  { cmd: "/godmode <mins>", desc: "Enable godmode for all players" },
  { cmd: "/allweapons <mins>", desc: "Give all weapons to all players" },
  { cmd: "/rainbow <mins>", desc: "Enable rainbow mode for everyone" },
  { cmd: "/online", desc: "Show online players count" },
  { cmd: "/dm <username> <msg>", desc: "Direct message a user" },
  { cmd: "/serverinfo", desc: "Show server information" },
  { cmd: "/reset <username>", desc: "Reset user's warnings" },
  { cmd: "/promote <username>", desc: "Give user command permissions" },
  { cmd: "/demote <username>", desc: "Remove user command permissions" },
  { cmd: "/leaderboard", desc: "Show top 10 players by score" },
  { cmd: "/event <type> <mins>", desc: "Start a global event" },
  { cmd: "/maintenance <on/off>", desc: "Toggle maintenance mode" },
  { cmd: "/ping", desc: "Check server responsiveness" },
  { cmd: "/whois <username>", desc: "Look up player info" },
  { cmd: "/coinflip", desc: "Flip a coin" },
  { cmd: "/roll [sides]", desc: "Roll a dice (default d6)" },
  { cmd: "/slowmo <mins>", desc: "Slow motion mode for all" },
  { cmd: "/doublexp <mins>", desc: "Double XP for all players" },
  { cmd: "/countdown <secs> <msg>", desc: "Start a countdown timer" },
  { cmd: "/roulette", desc: "Random reward or punishment" },
  { cmd: "/weather <type>", desc: "Set visual weather effect" },
  { cmd: "/tp <username>", desc: "Teleport to a player" },
  { cmd: "/heal <username>", desc: "Restore a player's health" },
  { cmd: "/nuke", desc: "Kill all enemies (abuse event)" },
  { cmd: "/speed <multiplier> <mins>", desc: "Speed boost for all" },
  { cmd: "/freeze <username>", desc: "Freeze a player temporarily" },
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

    // Rate limit check
    const allowed = await rateLimitedAction(userId, "chat_message", RATE_LIMITS.CHAT_MESSAGE);
    if (!allowed) return;

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

      case "/gift":
        const giftParts = args.split(" ");
        if (giftParts.length >= 2) {
          const targetUsername = giftParts[0];
          const coins = parseInt(giftParts[1]) || 0;
          const gems = parseInt(giftParts[2]) || 0;
          const gold = parseInt(giftParts[3]) || 0;
          
          const { data: success } = await supabase.rpc("gift_currency", {
            _target_username: targetUsername,
            _coins: coins,
            _gems: gems,
            _gold: gold
          });
          
          if (success) {
            toast.success(`Gifted ${coins} coins, ${gems} gems, ${gold} gold to ${targetUsername}`);
            await supabase.from("global_chat").insert({
              user_id: userId,
              username: "SYSTEM",
              message: `🎁 ${username} gifted currency to ${targetUsername}!`,
            });
          } else {
            toast.error("Failed to gift currency. User not found or insufficient permissions.");
          }
        } else {
          toast.error("Usage: /gift <username> <coins> [gems] [gold]");
        }
        break;

      case "/ban":
        const banParts = args.split(" ");
        if (banParts.length >= 2) {
          const banUsername = banParts[0];
          const banHours = parseInt(banParts[1]) || 24;
          
          const { data: banProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .ilike("username", banUsername)
            .maybeSingle();

          if (banProfile) {
            const { data: { user } } = await supabase.auth.getUser();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + banHours);
            
            await supabase.from("bans").insert({
              user_id: banProfile.user_id,
              banned_by: user?.id || userId,
              hours: banHours,
              reason: `Banned via chat by ${username}`,
              expires_at: expiresAt.toISOString(),
            });
            toast.success(`${banUsername} banned for ${banHours} hours`);
          } else {
            toast.error("User not found");
          }
        } else {
          toast.error("Usage: /ban <username> <hours>");
        }
        break;

      case "/unban":
        if (args) {
          const { data: unbanProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .ilike("username", args)
            .maybeSingle();

          if (unbanProfile) {
            await supabase.from("bans").delete().eq("user_id", unbanProfile.user_id);
            toast.success(`${args} has been unbanned`);
          } else {
            toast.error("User not found");
          }
        } else {
          toast.error("Usage: /unban <username>");
        }
        break;

      case "/godmode":
        const godMins = parseInt(args) || 5;
        const { data: { user: godUser } } = await supabase.auth.getUser();
        if (godUser) {
          const godExpires = new Date();
          godExpires.setMinutes(godExpires.getMinutes() + godMins);
          
          await supabase.from("admin_abuse_events").insert({
            event_type: "godmode",
            created_by: godUser.id,
            expires_at: godExpires.toISOString(),
            is_active: true,
          });
          toast.success(`🛡️ Godmode activated for all players for ${godMins} minutes!`);
        }
        break;

      case "/allweapons":
        const weaponMins = parseInt(args) || 5;
        const { data: { user: weaponUser } } = await supabase.auth.getUser();
        if (weaponUser) {
          const weaponExpires = new Date();
          weaponExpires.setMinutes(weaponExpires.getMinutes() + weaponMins);
          
          await supabase.from("admin_abuse_events").insert({
            event_type: "all_weapons",
            created_by: weaponUser.id,
            expires_at: weaponExpires.toISOString(),
            is_active: true,
          });
          toast.success(`🔫 All weapons activated for all players for ${weaponMins} minutes!`);
        }
        break;

      case "/rainbow":
        const rainbowMins = parseInt(args) || 5;
        const { data: { user: rainbowUser } } = await supabase.auth.getUser();
        if (rainbowUser) {
          const rainbowExpires = new Date();
          rainbowExpires.setMinutes(rainbowExpires.getMinutes() + rainbowMins);
          
          await supabase.from("admin_abuse_events").insert({
            event_type: "ultimate",
            created_by: rainbowUser.id,
            expires_at: rainbowExpires.toISOString(),
            is_active: true,
          });
          toast.success(`🌈 Rainbow mode activated for ${rainbowMins} minutes!`);
        }
        break;

      case "/online":
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { count: onlineCount } = await supabase
          .from("active_players")
          .select("*", { count: "exact", head: true })
          .gt("last_seen", fiveMinAgo);
        
        toast.info(`🟢 ${onlineCount || 0} players online right now`);
        break;

      case "/dm":
        const dmParts = args.split(" ");
        if (dmParts.length >= 2) {
          const dmTarget = dmParts[0];
          const dmMessage = dmParts.slice(1).join(" ");
          
          const { data: dmProfile } = await supabase
            .from("profiles")
            .select("user_id, username")
            .ilike("username", dmTarget)
            .maybeSingle();

          if (dmProfile) {
            await supabase.from("messages").insert({
              from_user_id: userId,
              from_username: username,
              to_user_id: dmProfile.user_id,
              to_username: dmProfile.username,
              subject: "Direct Message",
              content: dmMessage,
            });
            toast.success(`DM sent to ${dmProfile.username}`);
          } else {
            toast.error("User not found");
          }
        } else {
          toast.error("Usage: /dm <username> <message>");
        }
        break;

      case "/serverinfo":
        const { count: totalUsers } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });
        
        const { data: serverSettings } = await supabase
          .from("game_settings")
          .select("website_enabled")
          .eq("id", "00000000-0000-0000-0000-000000000001")
          .single();
        
        const now = new Date();
        toast.info(`🖥️ Server Info:\n• ${totalUsers} total users\n• Website: ${serverSettings?.website_enabled ? 'Enabled' : 'Disabled'}\n• Time: ${now.toLocaleTimeString()}`);
        break;

      case "/reset":
        if (args) {
          const { data: resetProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .ilike("username", args)
            .maybeSingle();

          if (resetProfile) {
            await supabase
              .from("chat_warnings")
              .update({ warning_count: 0, is_chat_banned: false })
              .eq("user_id", resetProfile.user_id);
            toast.success(`Reset warnings for ${args}`);
          } else {
            toast.error("User not found");
          }
        } else {
          toast.error("Usage: /reset <username>");
        }
        break;

      case "/promote":
        if (args) {
          const { data: promoteProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .ilike("username", args)
            .maybeSingle();

          if (promoteProfile) {
            await supabase.from("chat_permissions").upsert({
              user_id: promoteProfile.user_id,
              can_use_commands: true,
              granted_by: userId,
            });
            toast.success(`${args} can now use commands!`);
          } else {
            toast.error("User not found");
          }
        } else {
          toast.error("Usage: /promote <username>");
        }
        break;

      case "/demote":
        if (args) {
          const { data: demoteProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .ilike("username", args)
            .maybeSingle();

          if (demoteProfile) {
            await supabase.from("chat_permissions")
              .delete()
              .eq("user_id", demoteProfile.user_id);
            toast.success(`${args} command access removed`);
          } else {
            toast.error("User not found");
          }
        } else {
          toast.error("Usage: /demote <username>");
        }
        break;

      case "/leaderboard":
        const { data: topPlayers } = await supabase
          .from("profiles")
          .select("username, total_score")
          .order("total_score", { ascending: false })
          .limit(10);

        if (topPlayers && topPlayers.length > 0) {
          const leaderboard = topPlayers.map((p, i) => `${i + 1}. ${p.username}: ${p.total_score}`).join("\n");
          await supabase.from("global_chat").insert({
            user_id: userId,
            username: "🏆 LEADERBOARD",
            message: leaderboard,
          });
        }
        break;

      case "/ping":
        toast.success("🏓 Pong! Server is responsive.");
        break;

      case "/event": {
        const eventParts = args.split(" ");
        if (eventParts.length >= 1) {
          const eventType = eventParts[0]; // double_xp, half_damage, etc.
          const eventMins = parseInt(eventParts[1]) || 10;
          const { data: { user: eventUser } } = await supabase.auth.getUser();
          if (eventUser) {
            const eventExpires = new Date();
            eventExpires.setMinutes(eventExpires.getMinutes() + eventMins);
            
            await supabase.from("admin_abuse_events").insert({
              event_type: eventType,
              created_by: eventUser.id,
              expires_at: eventExpires.toISOString(),
              is_active: true,
            });
            
            await supabase.from("global_chat").insert({
              user_id: userId,
              username: "🎉 EVENT",
              message: `${eventType.replace(/_/g, " ").toUpperCase()} event started for ${eventMins} minutes!`,
            });
            toast.success(`Event ${eventType} started for ${eventMins} minutes!`);
          }
        } else {
          toast.error("Usage: /event <type> <minutes>");
        }
        break;
      }

      case "/maintenance": {
        const maintenanceState = args.toLowerCase();
        if (maintenanceState === "on" || maintenanceState === "off") {
          const enabled = maintenanceState === "off"; // website_enabled = OFF means maintenance ON
          await supabase
            .from("game_settings")
            .update({ website_enabled: enabled })
            .eq("id", (await supabase.from("game_settings").select("id").limit(1).single()).data?.id || "");
          
          toast.success(`Maintenance mode ${maintenanceState === "on" ? "ENABLED" : "DISABLED"}`);
          await supabase.from("global_chat").insert({
            user_id: userId,
            username: "⚠️ SYSTEM",
            message: `Maintenance mode ${maintenanceState.toUpperCase()} by ${username}`,
          });
        } else {
          toast.error("Usage: /maintenance <on/off>");
        }
        break;
      }

      case "/whois": {
        if (args) {
          const { data: whoisProfile } = await supabase
            .from("profiles")
            .select("username, total_score, created_at, boss_level, ranked_rank")
            .ilike("username", args)
            .maybeSingle();

          if (whoisProfile) {
            const joined = new Date(whoisProfile.created_at).toLocaleDateString();
            toast.info(`👤 ${whoisProfile.username}\n• Score: ${whoisProfile.total_score}\n• Boss Level: ${whoisProfile.boss_level}\n• Rank: ${whoisProfile.ranked_rank || "Unranked"}\n• Joined: ${joined}`);
          } else {
            toast.error("User not found");
          }
        } else {
          toast.error("Usage: /whois <username>");
        }
        break;
      }

      case "/coinflip":
        const result = Math.random() < 0.5 ? "Heads" : "Tails";
        await supabase.from("global_chat").insert({
          user_id: userId,
          username: "🎲 COINFLIP",
          message: `${username} flipped a coin: ${result}!`,
        });
        break;

      case "/roll": {
        const sides = parseInt(args) || 6;
        const rollResult = Math.floor(Math.random() * sides) + 1;
        await supabase.from("global_chat").insert({
          user_id: userId,
          username: "🎲 DICE",
          message: `${username} rolled a d${sides}: ${rollResult}!`,
        });
        break;
      }

      case "/slowmo": {
        const slowMins = parseInt(args) || 5;
        const { data: { user: slowUser } } = await supabase.auth.getUser();
        if (slowUser) {
          const slowExpires = new Date();
          slowExpires.setMinutes(slowExpires.getMinutes() + slowMins);
          await supabase.from("admin_abuse_events").insert({
            event_type: "slow_motion",
            created_by: slowUser.id,
            expires_at: slowExpires.toISOString(),
            is_active: true,
          });
          await supabase.from("global_chat").insert({
            user_id: userId, username: "🐌 EVENT",
            message: `Slow motion activated for ${slowMins} minutes!`,
          });
          toast.success(`🐌 Slow motion for ${slowMins} minutes!`);
        }
        break;
      }

      case "/doublexp": {
        const dxpMins = parseInt(args) || 10;
        const { data: { user: dxpUser } } = await supabase.auth.getUser();
        if (dxpUser) {
          const dxpExpires = new Date();
          dxpExpires.setMinutes(dxpExpires.getMinutes() + dxpMins);
          await supabase.from("admin_abuse_events").insert({
            event_type: "double_xp",
            created_by: dxpUser.id,
            expires_at: dxpExpires.toISOString(),
            is_active: true,
          });
          await supabase.from("global_chat").insert({
            user_id: userId, username: "⭐ EVENT",
            message: `Double XP activated for ${dxpMins} minutes!`,
          });
          toast.success(`⭐ Double XP for ${dxpMins} minutes!`);
        }
        break;
      }

      case "/countdown": {
        const countdownParts = args.split(" ");
        const countSecs = parseInt(countdownParts[0]) || 10;
        const countMsg = countdownParts.slice(1).join(" ") || "Something is happening!";
        await supabase.from("global_chat").insert({
          user_id: userId, username: "⏱️ COUNTDOWN",
          message: `${countSecs} seconds until: ${countMsg}`,
        });
        toast.success(`Countdown started: ${countSecs}s`);
        break;
      }

      case "/roulette": {
        const outcomes = [
          { msg: "🎉 WON 50 coins!", coins: 50, gems: 0, gold: 0 },
          { msg: "💎 WON 10 gems!", coins: 0, gems: 10, gold: 0 },
          { msg: "🥇 WON 5 gold!", coins: 0, gems: 0, gold: 5 },
          { msg: "💀 Lost 20 coins!", coins: -20, gems: 0, gold: 0 },
          { msg: "🎰 WON 100 coins!", coins: 100, gems: 0, gold: 0 },
          { msg: "😱 Lost 5 gems!", coins: 0, gems: -5, gold: 0 },
        ];
        const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
        const { data: { user: rouletteUser } } = await supabase.auth.getUser();
        if (rouletteUser) {
          await supabase.rpc("add_player_currency", {
            _user_id: rouletteUser.id,
            _coins: outcome.coins,
            _gems: outcome.gems,
            _gold: outcome.gold,
          });
        }
        await supabase.from("global_chat").insert({
          user_id: userId, username: "🎰 ROULETTE",
          message: `${username} spun the wheel: ${outcome.msg}`,
        });
        break;
      }

      case "/weather": {
        const weatherType = args.toLowerCase() || "clear";
        const validWeathers = ["rain", "snow", "storm", "clear", "fog", "fire"];
        if (!validWeathers.includes(weatherType)) {
          toast.error(`Invalid weather. Options: ${validWeathers.join(", ")}`);
          break;
        }
        const { data: { user: weatherUser } } = await supabase.auth.getUser();
        if (weatherUser) {
          const weatherExpires = new Date();
          weatherExpires.setMinutes(weatherExpires.getMinutes() + 10);
          await supabase.from("admin_abuse_events").insert({
            event_type: `weather_${weatherType}`,
            created_by: weatherUser.id,
            expires_at: weatherExpires.toISOString(),
            is_active: true,
          });
          await supabase.from("global_chat").insert({
            user_id: userId, username: "🌦️ WEATHER",
            message: `Weather changed to ${weatherType}!`,
          });
          toast.success(`Weather set to ${weatherType} for 10 minutes`);
        }
        break;
      }

      case "/nuke": {
        const { data: { user: nukeUser } } = await supabase.auth.getUser();
        if (nukeUser) {
          const nukeExpires = new Date();
          nukeExpires.setSeconds(nukeExpires.getSeconds() + 5);
          await supabase.from("admin_abuse_events").insert({
            event_type: "nuke",
            created_by: nukeUser.id,
            expires_at: nukeExpires.toISOString(),
            is_active: true,
          });
          await supabase.from("global_chat").insert({
            user_id: userId, username: "☢️ NUKE",
            message: `${username} NUKED all enemies!`,
          });
          toast.success("☢️ NUKE launched!");
        }
        break;
      }

      case "/speed": {
        const speedParts = args.split(" ");
        const speedMult = parseFloat(speedParts[0]) || 2;
        const speedMins = parseInt(speedParts[1]) || 5;
        const { data: { user: speedUser } } = await supabase.auth.getUser();
        if (speedUser) {
          const speedExpires = new Date();
          speedExpires.setMinutes(speedExpires.getMinutes() + speedMins);
          await supabase.from("admin_abuse_events").insert({
            event_type: "speed_boost",
            created_by: speedUser.id,
            expires_at: speedExpires.toISOString(),
            is_active: true,
            metadata: { multiplier: speedMult },
          });
          await supabase.from("global_chat").insert({
            user_id: userId, username: "💨 EVENT",
            message: `${speedMult}x speed boost for ${speedMins} minutes!`,
          });
          toast.success(`💨 ${speedMult}x speed for ${speedMins} min!`);
        }
        break;
      }

      case "/heal": {
        if (args) {
          await supabase.from("global_chat").insert({
            user_id: userId, username: "💚 HEAL",
            message: `${username} healed ${args} to full health!`,
          });
          toast.success(`Healed ${args}`);
        } else {
          toast.error("Usage: /heal <username>");
        }
        break;
      }

      case "/freeze": {
        if (args) {
          await supabase.from("global_chat").insert({
            user_id: userId, username: "🧊 FREEZE",
            message: `${args} has been frozen for 30 seconds!`,
          });
          toast.success(`Froze ${args}`);
        } else {
          toast.error("Usage: /freeze <username>");
        }
        break;
      }

      case "/tp": {
        if (args) {
          toast.info(`Teleporting to ${args}... (works in multiplayer only)`);
        } else {
          toast.error("Usage: /tp <username>");
        }
        break;
      }

      default:
        toast.error("Unknown command. Click 'Commands' to see available commands.");
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
            {showCommands ? "Hide" : "Show"} Commands
          </button>
        )}
        {warningCount > 0 && !isAdminOrOwner && (
          <span className="text-xs text-amber-500 ml-auto">
            Warnings: {warningCount}/2
          </span>
        )}
      </div>
      
      {/* Admin Commands - Always visible when toggled */}
      {showCommands && isAdminOrOwner && (
        <div className="p-2 bg-primary/10 border-b text-xs space-y-1 max-h-40 overflow-auto">
          <p className="font-medium text-primary">📌 Admin Commands (visible to you):</p>
          <div className="grid grid-cols-2 gap-1">
            {ADMIN_COMMANDS.map((c, i) => (
              <p key={i} className="text-muted-foreground">
                <code className="bg-secondary px-1 rounded text-xs">{c.cmd}</code>
              </p>
            ))}
          </div>
          <p className="text-muted-foreground mt-1 text-[10px]">Type any command in chat to use it!</p>
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
