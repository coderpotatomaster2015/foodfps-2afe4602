import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Send, ImagePlus, Clock, Upload, Link, Home, TrendingUp, User } from "lucide-react";
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
  const [imageMode, setImageMode] = useState<"url" | "file">("url");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewImage(dataUrl);
      setImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    if (url) {
      setPreviewImage(url);
    } else {
      setPreviewImage(null);
    }
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

      // Call AI moderation
      toast.info("🤖 AI is reviewing your post...");
      
      const { data: moderationResult, error: modError } = await supabase.functions.invoke("moderate-post", {
        body: { content, image_url: imageUrl || null }
      });

      if (modError) {
        console.error("Moderation error:", modError);
        // Fallback to manual review if AI fails
        toast.warning("AI moderation unavailable, submitting for manual review");
      }

      const aiDecision = moderationResult?.decision;

      if (aiDecision === "decline") {
        toast.error("❌ Your post was declined by AI moderation. Please ensure your content is appropriate.");
        setSending(false);
        return;
      }

      const isAutoApproved = aiDecision === "approve";

      const { error } = await supabase.from("social_posts").insert({
        user_id: user.id,
        username: profile?.username || "Unknown",
        content,
        image_url: imageUrl || null,
        is_approved: isAutoApproved,
        is_pending: !isAutoApproved,
        approved_at: isAutoApproved ? new Date().toISOString() : null,
      });

      if (error) throw error;

      if (isAutoApproved) {
        toast.success("✅ Post approved by AI and published!");
        loadPosts();
      } else {
        toast.success("Post submitted for manual review!");
      }
      
      setComposing(false);
      setContent("");
      setImageUrl("");
      setPreviewImage(null);
      loadPendingCount();
    } catch (error: any) {
      console.error("Error submitting post:", error);
      toast.error(error.message || "Failed to submit post");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <span className="text-xl">🍔</span>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            Food Media
          </h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="hidden md:flex w-64 border-r border-border p-4 flex-col gap-2">
          <Button variant="ghost" className="justify-start gap-3 h-12">
            <Home className="w-5 h-5" />
            Feed
          </Button>
          <Button variant="ghost" className="justify-start gap-3 h-12">
            <TrendingUp className="w-5 h-5" />
            Trending
          </Button>
          <Button variant="ghost" className="justify-start gap-3 h-12">
            <User className="w-5 h-5" />
            My Posts
            {pendingCount > 0 && (
              <span className="ml-auto text-xs bg-yellow-500 text-yellow-950 px-2 py-0.5 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </Button>
        </div>

        {/* Center Feed */}
        <div className="flex-1 flex flex-col">
          {composing ? (
            <div className="flex-1 p-6 overflow-auto">
              <Card className="max-w-2xl mx-auto p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Create Post</h2>
                  <Button variant="ghost" size="sm" onClick={() => setComposing(false)}>
                    Cancel
                  </Button>
                </div>
                
                <Textarea
                  placeholder="What's cooking? Share your gaming moments..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[150px] text-lg"
                />

                <Tabs value={imageMode} onValueChange={(v) => setImageMode(v as "url" | "file")} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="url" className="gap-2">
                      <Link className="w-4 h-4" />
                      Image URL
                    </TabsTrigger>
                    <TabsTrigger value="file" className="gap-2">
                      <Upload className="w-4 h-4" />
                      Upload File
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="url" className="mt-4">
                    <Input
                      placeholder="Paste image URL here..."
                      value={imageMode === "url" ? imageUrl : ""}
                      onChange={(e) => handleUrlChange(e.target.value)}
                    />
                  </TabsContent>
                  <TabsContent value="file" className="mt-4">
                    <div 
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-secondary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">Click to upload an image</p>
                      <p className="text-xs text-muted-foreground mt-1">Max 5MB • PNG, JPG, GIF</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </TabsContent>
                </Tabs>

                {previewImage && (
                  <div className="relative">
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="w-full max-h-80 object-cover rounded-lg"
                      onError={() => setPreviewImage(null)}
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setPreviewImage(null);
                        setImageUrl("");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-sm text-green-500">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Your post will be reviewed by AI. Appropriate posts are auto-approved instantly!
                  </p>
                </div>

                <Button onClick={submitPost} disabled={sending} size="lg" className="w-full">
                  <Send className="w-5 h-5 mr-2" />
                  {sending ? "Submitting..." : "Submit for Review"}
                </Button>
              </Card>
            </div>
          ) : (
            <>
              {/* Create Post Bar */}
              <div className="p-4 border-b border-border">
                <Card className="max-w-2xl mx-auto p-4">
                  <div 
                    className="flex items-center gap-4 cursor-pointer"
                    onClick={() => setComposing(true)}
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 bg-secondary rounded-full px-4 py-2 text-muted-foreground">
                      What's on your mind?
                    </div>
                    <Button size="sm">
                      <ImagePlus className="w-4 h-4 mr-2" />
                      Post
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Posts */}
              <ScrollArea className="flex-1">
                <div className="max-w-2xl mx-auto p-4 space-y-4">
                  {loading ? (
                    <div className="flex justify-center p-12">
                      <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary flex items-center justify-center">
                        <span className="text-4xl">🍕</span>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                      <p className="text-muted-foreground mb-4">Be the first to share something delicious!</p>
                      <Button onClick={() => setComposing(true)}>
                        <ImagePlus className="w-4 h-4 mr-2" />
                        Create First Post
                      </Button>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <Card key={post.id} className="overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-bold">
                              {post.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold">{post.username}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(post.created_at).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm whitespace-pre-wrap mb-3">{post.content}</p>
                        </div>
                        {post.image_url && (
                          <img
                            src={post.image_url}
                            alt="Post image"
                            className="w-full max-h-[500px] object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="hidden lg:block w-72 border-l border-border p-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">About Food Media</h3>
            <p className="text-sm text-muted-foreground">
              Share your gaming moments, high scores, and food-fighting adventures with the community!
            </p>
          </Card>
          {pendingCount > 0 && (
            <Card className="p-4 mt-4 bg-yellow-500/10 border-yellow-500/20">
              <div className="flex items-center gap-2 text-yellow-500">
                <Clock className="w-4 h-4" />
                <span className="font-semibold">{pendingCount} post{pendingCount > 1 ? 's' : ''} pending</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Waiting for admin approval
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
