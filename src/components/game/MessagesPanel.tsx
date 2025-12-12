import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Send, Mail, Inbox, Reply, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MessagesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_username: string;
  to_username: string;
  subject: string;
  content: string;
  is_read: boolean;
  is_appeal: boolean;
  is_feedback: boolean;
  created_at: string;
}

export const MessagesPanel = ({ open, onOpenChange }: MessagesPanelProps) => {
  const [inbox, setInbox] = useState<Message[]>([]);
  const [sent, setSent] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadMessages();
    }
  }, [open]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

      const { data: inboxData } = await supabase
        .from("messages")
        .select("*")
        .eq("to_user_id", user.id)
        .order("created_at", { ascending: false });

      const { data: sentData } = await supabase
        .from("messages")
        .select("*")
        .eq("from_user_id", user.id)
        .order("created_at", { ascending: false });

      if (inboxData) setInbox(inboxData);
      if (sentData) setSent(sentData);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!recipient.trim() || !subject.trim() || !content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .single();

      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("user_id, username")
        .eq("username", recipient)
        .maybeSingle();

      if (!recipientProfile) {
        toast.error("User not found");
        return;
      }

      const { error } = await supabase.from("messages").insert({
        from_user_id: user.id,
        to_user_id: recipientProfile.user_id,
        from_username: profile?.username || "Unknown",
        to_username: recipientProfile.username,
        subject,
        content,
      });

      if (error) throw error;

      toast.success("Message sent!");
      setComposing(false);
      setRecipient("");
      setSubject("");
      setContent("");
      loadMessages();
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("id", messageId);
    
    setInbox(prev => prev.map(m => m.id === messageId ? { ...m, is_read: true } : m));
  };

  const handleAppeal = async (messageId: string, approved: boolean) => {
    const message = inbox.find(m => m.id === messageId);
    if (!message) return;

    if (approved) {
      // Remove the ban
      await supabase
        .from("bans")
        .delete()
        .eq("user_id", message.from_user_id);
      
      toast.success(`Ban appeal approved for ${message.from_username}`);
    } else {
      toast.info(`Ban appeal declined for ${message.from_username}`);
    }

    // Mark message as read
    await markAsRead(messageId);
    setSelectedMessage(null);
  };

  const unreadCount = inbox.filter(m => !m.is_read).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Messages
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {selectedMessage ? (
          <div className="flex-1 flex flex-col">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMessage(null)}
              className="self-start mb-4"
            >
              ← Back
            </Button>
            <Card className="flex-1 p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{selectedMessage.subject}</h3>
                  <p className="text-sm text-muted-foreground">
                    From: {selectedMessage.from_username} • {new Date(selectedMessage.created_at).toLocaleDateString()}
                  </p>
                </div>
                {selectedMessage.is_appeal && (
                  <span className="bg-yellow-500/20 text-yellow-500 text-xs px-2 py-1 rounded">
                    Ban Appeal
                  </span>
                )}
                {selectedMessage.is_feedback && (
                  <span className="bg-blue-500/20 text-blue-500 text-xs px-2 py-1 rounded">
                    Beta Feedback
                  </span>
                )}
              </div>
              <ScrollArea className="flex-1">
                <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
              </ScrollArea>
              {selectedMessage.is_appeal && (
                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button
                    variant="default"
                    onClick={() => handleAppeal(selectedMessage.id, true)}
                    className="flex-1"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve Appeal
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleAppeal(selectedMessage.id, false)}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                </div>
              )}
            </Card>
          </div>
        ) : composing ? (
          <div className="flex-1 flex flex-col space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setComposing(false)}
              className="self-start"
            >
              ← Back
            </Button>
            <div className="flex gap-2">
              <Input
                placeholder="Recipient username..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  // Auto-fill with admin username
                  const { data } = await supabase
                    .from("user_roles")
                    .select("user_id")
                    .eq("role", "admin")
                    .limit(1)
                    .single();
                  
                  if (data) {
                    const { data: profile } = await supabase
                      .from("profiles")
                      .select("username")
                      .eq("user_id", data.user_id)
                      .single();
                    
                    if (profile) {
                      setRecipient(profile.username);
                    }
                  }
                }}
              >
                Send to Admin
              </Button>
            </div>
            <Input
              placeholder="Subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <Textarea
              placeholder="Write your message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 min-h-[200px]"
            />
            <Button onClick={sendMessage} disabled={sending}>
              <Send className="w-4 h-4 mr-2" />
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="inbox" className="flex-1 flex flex-col">
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="inbox" className="gap-2">
                  <Inbox className="w-4 h-4" />
                  Inbox ({inbox.length})
                </TabsTrigger>
                <TabsTrigger value="sent" className="gap-2">
                  <Send className="w-4 h-4" />
                  Sent ({sent.length})
                </TabsTrigger>
              </TabsList>
              <Button size="sm" onClick={() => setComposing(true)}>
                <Mail className="w-4 h-4 mr-2" />
                Compose
              </Button>
            </div>

            <TabsContent value="inbox" className="flex-1 mt-4">
              <ScrollArea className="h-[400px]">
                {loading ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : inbox.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No messages</p>
                ) : (
                  <div className="space-y-2 pr-4">
                    {inbox.map((message) => (
                      <Card
                        key={message.id}
                        className={`p-3 cursor-pointer hover:bg-secondary/50 transition-colors ${
                          !message.is_read ? "border-primary bg-primary/5" : ""
                        }`}
                        onClick={() => {
                          setSelectedMessage(message);
                          if (!message.is_read) markAsRead(message.id);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {!message.is_read && (
                                <span className="w-2 h-2 bg-primary rounded-full" />
                              )}
                              {message.is_appeal && (
                                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                              )}
                              <span className="font-medium text-sm">{message.from_username}</span>
                            </div>
                            <p className="text-sm font-semibold truncate">{message.subject}</p>
                            <p className="text-xs text-muted-foreground truncate">{message.content}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="sent" className="flex-1 mt-4">
              <ScrollArea className="h-[400px]">
                {sent.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No sent messages</p>
                ) : (
                  <div className="space-y-2 pr-4">
                    {sent.map((message) => (
                      <Card
                        key={message.id}
                        className="p-3 cursor-pointer hover:bg-secondary/50 transition-colors"
                        onClick={() => setSelectedMessage(message)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <span className="text-sm text-muted-foreground">To: {message.to_username}</span>
                            <p className="text-sm font-semibold truncate">{message.subject}</p>
                            <p className="text-xs text-muted-foreground truncate">{message.content}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};