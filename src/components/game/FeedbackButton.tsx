import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Bug, Lightbulb, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FeedbackButtonProps {
  userId: string;
  username: string;
}

export const FeedbackButton = ({ userId, username }: FeedbackButtonProps) => {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState("bug");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    setSending(true);

    try {
      const { error } = await supabase.from("feedback_messages").insert({
        from_user_id: userId,
        from_username: username,
        content: content.trim(),
        feedback_type: feedbackType,
      });

      if (error) throw error;

      toast.success("Feedback sent! Thank you for your input.");
      setContent("");
      setOpen(false);
    } catch (error) {
      console.error("Error sending feedback:", error);
      toast.error("Failed to send feedback");
    } finally {
      setSending(false);
    }
  };

  const getIcon = () => {
    switch (feedbackType) {
      case "bug": return <Bug className="w-4 h-4" />;
      case "suggestion": return <Lightbulb className="w-4 h-4" />;
      case "question": return <HelpCircle className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 gap-2"
      >
        <MessageSquare className="w-4 h-4" />
        Feedback
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Send Feedback to Owner
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Feedback Type</Label>
              <Select value={feedbackType} onValueChange={setFeedbackType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">
                    <div className="flex items-center gap-2">
                      <Bug className="w-4 h-4" />
                      Bug Report
                    </div>
                  </SelectItem>
                  <SelectItem value="suggestion">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Suggestion
                    </div>
                  </SelectItem>
                  <SelectItem value="question">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4" />
                      Question
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Other
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Your Feedback</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe your feedback in detail..."
                rows={5}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                className="flex-1 gap-2" 
                onClick={handleSubmit}
                disabled={sending || !content.trim()}
              >
                {sending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Feedback
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Your feedback will be sent directly to the game owner.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
