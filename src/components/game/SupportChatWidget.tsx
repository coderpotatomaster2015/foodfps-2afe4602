import { useState } from "react";
import { MessageCircle, Send, X, LifeBuoy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SupportMessage = {
  role: "user" | "assistant";
  content: string;
};

interface SupportChatWidgetProps {
  userId: string;
  username: string;
  roleLabel: "owner" | "admin" | "user" | "teacher" | "beta tester";
}

export const SupportChatWidget = ({ userId, username, roleLabel }: SupportChatWidgetProps) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([
    {
      role: "assistant",
      content:
        "Hey! Need help? Ask me about gameplay, bugs, account issues, or troubleshooting. If this needs staff review, press Create Support Ticket.",
    },
  ]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLastUserMessage(trimmed);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("support-agent", {
        body: { message: trimmed },
      });

      if (error) throw error;

      const responseText =
        typeof data?.response === "string" && data.response.trim().length > 0
          ? data.response
          : "I couldn't generate a response just now. Please try again.";

      setMessages((prev) => [...prev, { role: "assistant", content: responseText }]);
    } catch (error) {
      console.error("Support chat failed:", error);
      toast.error("Support chat is unavailable right now.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, support is temporarily unavailable. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const createSupportTicket = async () => {
    const issueText = lastUserMessage || input.trim();
    if (!issueText) {
      toast.error("Please describe your issue first, then create a ticket.");
      return;
    }

    setTicketLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("support-agent", {
        body: {
          action: "create_ticket",
          message: issueText,
          username,
          role: roleLabel,
        },
      });

      if (error) throw error;

      const encodedTicket = typeof data?.encodedTicket === "string" ? data.encodedTicket : null;
      const confirmation =
        typeof data?.response === "string" ? data.response : "Support ticket created and sent to admins.";

      if (!encodedTicket) {
        toast.error("Could not generate a support ticket right now.");
        return;
      }

      const { data: adminRoles, error: adminRolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "owner"]);

      if (adminRolesError) throw adminRolesError;

      const adminIds = [...new Set((adminRoles || []).map((row) => row.user_id))];

      if (!adminIds.length) {
        toast.error("No admins found to receive the ticket.");
        return;
      }

      const { data: adminProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", adminIds);

      if (profilesError) throw profilesError;

      const usernameMap = new Map((adminProfiles || []).map((profile) => [profile.user_id, profile.username]));

      const inserts = adminIds.map((adminId) => ({
        from_user_id: userId,
        from_username: username,
        to_user_id: adminId,
        to_username: usernameMap.get(adminId) || "Admin",
        subject: "[SUPPORT_TICKET] New ticket from support bot",
        content: encodedTicket,
        is_feedback: false,
        is_appeal: false,
      }));

      const { error: insertError } = await supabase.from("messages").insert(inserts);
      if (insertError) throw insertError;

      setMessages((prev) => [...prev, { role: "assistant", content: confirmation }]);
      toast.success("Support ticket sent to admins.");
    } catch (error) {
      console.error("Create support ticket failed:", error);
      toast.error("Failed to send support ticket.");
    } finally {
      setTicketLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen((value) => !value)}
        className="fixed right-4 bottom-4 z-50 gap-2 rounded-full shadow-lg"
      >
        <MessageCircle className="h-4 w-4" />
        Need help?
      </Button>

      {open && (
        <div className="fixed right-4 bottom-20 z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Support Assistant</p>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="h-72 px-3 py-3">
            <div className="space-y-2">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    "max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                    message.role === "assistant"
                      ? "bg-muted text-foreground"
                      : "ml-auto bg-primary text-primary-foreground",
                  )}
                >
                  {message.content}
                </div>
              ))}
              {loading && <div className="text-xs text-muted-foreground">Support assistant is typing...</div>}
            </div>
          </ScrollArea>

          <div className="border-t p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Describe your issue..."
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <Button size="icon" onClick={() => void sendMessage()} disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => void createSupportTicket()}
              disabled={ticketLoading}
            >
              <LifeBuoy className="h-4 w-4" />
              {ticketLoading ? "Creating Support Ticket..." : "Create Support Ticket"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
