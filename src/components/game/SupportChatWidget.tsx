import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
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

export const SupportChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([
    {
      role: "assistant",
      content: "Hey! Need help? Ask me about gameplay, bugs, account issues, or troubleshooting.",
    },
  ]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
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

  return (
    <>
      <Button
        onClick={() => setOpen((v) => !v)}
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

          <div className="flex items-center gap-2 border-t p-3">
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
        </div>
      )}
    </>
  );
};
