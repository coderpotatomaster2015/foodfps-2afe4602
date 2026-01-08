import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Ad {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  target_url: string;
}

interface PopupAdProps {
  userId: string;
  onSignupClick: () => void;
}

export const PopupAd = ({ userId, onSignupClick }: PopupAdProps) => {
  const [ad, setAd] = useState<Ad | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [isExempt, setIsExempt] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    checkExemption();
  }, [userId]);

  useEffect(() => {
    if (isExempt) return;

    // Show popup ad after 30 seconds, then every 2 minutes
    const initialTimeout = setTimeout(() => {
      loadRandomAd();
    }, 30000);

    const interval = setInterval(() => {
      loadRandomAd();
    }, 120000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isExempt]);

  useEffect(() => {
    if (showAd && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [showAd, countdown]);

  const checkExemption = async () => {
    const { data } = await supabase.rpc("has_ad_exemption", { _user_id: userId });
    setIsExempt(!!data);
  };

  const loadRandomAd = async () => {
    const { data } = await supabase
      .from("ads")
      .select("*")
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (data && data.length > 0) {
      const randomAd = data[Math.floor(Math.random() * data.length)];
      setAd(randomAd);
      setCountdown(5);
      setShowAd(true);
    }
  };

  const handleClose = () => {
    if (countdown <= 0) {
      setShowAd(false);
    }
  };

  const handleVisitAd = () => {
    if (ad?.target_url) {
      window.open(ad.target_url, "_blank");
    }
  };

  const handleRemoveAds = () => {
    setShowAd(false);
    onSignupClick();
  };

  if (isExempt || !ad) return null;

  return (
    <Dialog open={showAd} onOpenChange={(open) => countdown <= 0 && setShowAd(open)}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="relative">
          {/* Close button with countdown */}
          <button
            onClick={handleClose}
            disabled={countdown > 0}
            className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              countdown > 0 
                ? "bg-muted text-muted-foreground cursor-not-allowed" 
                : "bg-background/80 hover:bg-background text-foreground"
            }`}
          >
            {countdown > 0 ? countdown : <X className="w-4 h-4" />}
          </button>

          {/* Ad Image */}
          {ad.image_url && (
            <div className="aspect-video bg-muted">
              <img 
                src={ad.image_url} 
                alt={ad.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Ad Content */}
          <div className="p-4 space-y-3">
            <h3 className="font-bold text-lg">{ad.title}</h3>
            <p className="text-sm text-muted-foreground">{ad.description}</p>

            <div className="flex gap-2">
              <Button onClick={handleVisitAd} className="flex-1 gap-2">
                <ExternalLink className="w-4 h-4" />
                Visit Site
              </Button>
              <Button variant="outline" onClick={handleRemoveAds} className="flex-1">
                Remove Ads
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Sign up on the advertised site to remove ads
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
