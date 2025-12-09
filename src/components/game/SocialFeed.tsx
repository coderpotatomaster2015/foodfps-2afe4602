import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Globe, Send, ImagePlus, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SocialFeedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Post {
  id: string;
  username: string;
  content: string;
  image_url: string | null;
  created_at: string;
}

export const SocialFeed = ({ open, onOpenChange }: SocialFeedProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (open) {
      loadPosts();
      loadPendingCount();
    }
  }, [open]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("social_posts")
        .select("*")
        .eq("is_approved", true)
        .eq("is_pending", false)
        .order("created_at", { ascending: false });

      if (data) setPosts(data);
    } catch (error) {
      console.error("Error loading posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count } = await supabase
      .from("social_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_pending", true);

    setPendingCount(count || 0);
  };

  const submitPost = async () => {
    if (!content.trim()) {
      toast.error("Please write something");
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

      const { error } = await supabase.from("social_posts").insert({
        user_id: user.id,
        username: profile?.username || "Unknown",
        content,
        image_url: imageUrl || null,
      });

      if (error) throw error;

      toast.success("Post submitted for approval!");
      setComposing(false);
      setContent("");
      setImageUrl("");
      loadPendingCount();
    } catch (error: any) {
      console.error("Error submitting post:", error);
      toast.error(error.message || "Failed to submit post");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Social Feed
          </DialogTitle>
        </DialogHeader>

        {composing ? (
          <div className="flex-1 flex flex-col space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setComposing(false)}
              className="self-start"
            >
              ← Back
            </Button>
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 min-h-[150px]"
            />
            <Input
              placeholder="Image URL (optional)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your post will be reviewed by an admin before being published.
            </p>
            <Button onClick={submitPost} disabled={sending}>
              <Send className="w-4 h-4 mr-2" />
              {sending ? "Submitting..." : "Submit for Review"}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <Button size="sm" onClick={() => setComposing(true)}>
                <ImagePlus className="w-4 h-4 mr-2" />
                Create Post
              </Button>
              {pendingCount > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {pendingCount} pending
                </span>
              )}
            </div>

            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No posts yet</p>
                  <p className="text-sm">Be the first to share something!</p>
                </div>
              ) : (
                <div className="space-y-4 pr-4">
                  {posts.map((post) => (
                    <Card key={post.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{post.username}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                      {post.image_url && (
                        <img
                          src={post.image_url}
                          alt="Post image"
                          className="rounded-lg max-h-48 object-cover w-full"
                        />
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};