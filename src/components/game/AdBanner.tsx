import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdBannerProps {
  userId: string | null;
  onSignupClick: () => void;
}

interface Ad {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  target_url: string;
}

export const AdBanner = ({ userId, onSignupClick }: AdBannerProps) => {
  const [currentAd, setCurrentAd] = useState<Ad | null>(null);
  const [isExempt, setIsExempt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkExemptionAndLoadAd();
  }, [userId]);

  const checkExemptionAndLoadAd = async () => {
    if (!userId) {
      await loadRandomAd();
      setLoading(false);
      return;
    }

    // Check if user has ad exemption
    const { data: exemption } = await supabase
      .from("ad_exemptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (exemption) {
      setIsExempt(true);
      setLoading(false);
      return;
    }

    await loadRandomAd();
    setLoading(false);
  };

  const loadRandomAd = async () => {
    const { data: ads } = await supabase
      .from("ads")
      .select("*")
      .eq("is_active", true);

    if (ads && ads.length > 0) {
      const randomAd = ads[Math.floor(Math.random() * ads.length)];
      setCurrentAd(randomAd);
    }
  };

  if (loading || isExempt || !currentAd || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-card border-2 border-primary/50 rounded-xl shadow-2xl overflow-hidden max-w-lg">
        <div className="relative">
          {currentAd.image_url && (
            <img
              src={currentAd.image_url}
              alt={currentAd.title}
              className="w-full h-32 object-cover"
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white h-6 w-6"
            onClick={() => setDismissed(true)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="p-4">
          <h3 className="font-bold text-lg mb-1">{currentAd.title}</h3>
          <p className="text-sm text-muted-foreground mb-3">{currentAd.description}</p>
          
          <div className="flex gap-2">
            <Button
              onClick={() => window.open(currentAd.target_url, "_blank")}
              className="flex-1 gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Learn More
            </Button>
            <Button
              variant="outline"
              onClick={onSignupClick}
              className="text-xs"
            >
              Remove Ads
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};