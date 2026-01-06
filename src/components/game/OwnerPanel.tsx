import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Megaphone, Image, Check, X as XIcon, Loader2, Crown, Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OwnerPanelProps {
  open: boolean;
  onClose: () => void;
}

interface Ad {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  target_url: string;
  is_active: boolean;
  created_at: string;
}

interface AdSignup {
  id: string;
  user_id: string;
  username: string;
  ad_id: string | null;
  status: string;
  created_at: string;
}

export const OwnerPanel = ({ open, onClose }: OwnerPanelProps) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [adSignups, setAdSignups] = useState<AdSignup[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Create ad form
  const [adTitle, setAdTitle] = useState("");
  const [adDescription, setAdDescription] = useState("");
  const [adTargetUrl, setAdTargetUrl] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadAds();
      loadAdSignups();
    }
  }, [open]);

  const loadAds = async () => {
    const { data } = await supabase
      .from("ads")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setAds(data);
  };

  const loadAdSignups = async () => {
    const { data } = await supabase
      .from("ad_signups")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    
    if (data) setAdSignups(data);
  };

  const generateAdImage = async () => {
    if (!adTitle || !adDescription) {
      toast.error("Please enter title and description first");
      return;
    }

    setGenerating(true);
    try {
      const prompt = `Create a professional advertisement banner image for: "${adTitle}". Description: ${adDescription}. Style: modern, clean, eye-catching, suitable for a gaming website ad banner. 16:9 aspect ratio, vibrant colors.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          modalities: ["image", "text"]
        })
      });

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (imageUrl) {
        setGeneratedImageUrl(imageUrl);
        toast.success("Ad image generated!");
      } else {
        toast.error("Failed to generate image");
      }
    } catch (error) {
      console.error("Error generating ad image:", error);
      toast.error("Failed to generate image");
    } finally {
      setGenerating(false);
    }
  };

  const createAd = async () => {
    if (!adTitle || !adDescription || !adTargetUrl) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("ads").insert({
        title: adTitle,
        description: adDescription,
        image_url: generatedImageUrl,
        target_url: adTargetUrl,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Ad created successfully!");
      setAdTitle("");
      setAdDescription("");
      setAdTargetUrl("");
      setGeneratedImageUrl(null);
      loadAds();
    } catch (error) {
      console.error("Error creating ad:", error);
      toast.error("Failed to create ad");
    } finally {
      setLoading(false);
    }
  };

  const toggleAdStatus = async (ad: Ad) => {
    const { error } = await supabase
      .from("ads")
      .update({ is_active: !ad.is_active })
      .eq("id", ad.id);

    if (error) {
      toast.error("Failed to update ad");
    } else {
      toast.success(ad.is_active ? "Ad disabled" : "Ad enabled");
      loadAds();
    }
  };

  const deleteAd = async (ad: Ad) => {
    const { error } = await supabase
      .from("ads")
      .delete()
      .eq("id", ad.id);

    if (error) {
      toast.error("Failed to delete ad");
    } else {
      toast.success("Ad deleted");
      loadAds();
    }
  };

  const handleSignupReview = async (signup: AdSignup, approve: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await supabase
      .from("ad_signups")
      .update({
        status: approve ? "approved" : "declined",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", signup.id);

    if (updateError) {
      toast.error("Failed to process signup");
      return;
    }

    if (approve) {
      // Grant ad exemption
      await supabase.from("ad_exemptions").insert({
        user_id: signup.user_id,
        granted_by: user.id,
      });
      toast.success(`${signup.username} approved - ads disabled for them`);
    } else {
      toast.success(`${signup.username} declined - ads remain active`);
    }

    loadAdSignups();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-amber-500/20 to-yellow-500/20">
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            Owner Panel
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="create" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2">
            <TabsTrigger value="create" className="gap-2">
              <Sparkles className="w-4 h-4" /> Create Ad
            </TabsTrigger>
            <TabsTrigger value="manage" className="gap-2">
              <Megaphone className="w-4 h-4" /> Manage Ads
            </TabsTrigger>
            <TabsTrigger value="signups" className="gap-2">
              <Users className="w-4 h-4" /> Signups ({adSignups.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 p-4">
            <TabsContent value="create" className="mt-0 space-y-4">
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  Create AI-Generated Ad
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <Label>Ad Title</Label>
                    <Input
                      value={adTitle}
                      onChange={(e) => setAdTitle(e.target.value)}
                      placeholder="e.g., Join FoodFPS Today!"
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={adDescription}
                      onChange={(e) => setAdDescription(e.target.value)}
                      placeholder="Describe what the ad should convey..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Target URL</Label>
                    <Input
                      value={adTargetUrl}
                      onChange={(e) => setAdTargetUrl(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>

                  <Button
                    onClick={generateAdImage}
                    disabled={generating || !adTitle || !adDescription}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Image...
                      </>
                    ) : (
                      <>
                        <Image className="w-4 h-4" />
                        Generate Ad Image with AI
                      </>
                    )}
                  </Button>

                  {generatedImageUrl && (
                    <div className="space-y-2">
                      <Label>Generated Image</Label>
                      <img
                        src={generatedImageUrl}
                        alt="Generated ad"
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                    </div>
                  )}

                  <Button
                    onClick={createAd}
                    disabled={loading || !adTitle || !adDescription || !adTargetUrl}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create Ad"
                    )}
                  </Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="manage" className="mt-0 space-y-4">
              {ads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No ads created yet</p>
                </div>
              ) : (
                ads.map((ad) => (
                  <Card key={ad.id} className="p-4">
                    <div className="flex items-start gap-4">
                      {ad.image_url && (
                        <img
                          src={ad.image_url}
                          alt={ad.title}
                          className="w-24 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{ad.title}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded ${ad.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                            {ad.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{ad.description}</p>
                        <p className="text-xs text-primary mt-1">{ad.target_url}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={ad.is_active ? "destructive" : "default"}
                          onClick={() => toggleAdStatus(ad)}
                        >
                          {ad.is_active ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteAd(ad)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="signups" className="mt-0 space-y-4">
              {adSignups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No pending signup requests</p>
                </div>
              ) : (
                adSignups.map((signup) => (
                  <Card key={signup.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{signup.username}</h4>
                        <p className="text-xs text-muted-foreground">
                          Requested {new Date(signup.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSignupReview(signup, true)}
                          className="gap-1 bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleSignupReview(signup, false)}
                          className="gap-1"
                        >
                          <XIcon className="w-4 h-4" /> Decline
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};