import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Smartphone, Monitor, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TutorialModalProps {
  open: boolean;
  onComplete: (isMobile: boolean) => void;
}

export const TutorialModal = ({ open, onComplete }: TutorialModalProps) => {
  const [step, setStep] = useState<"device" | "orientation" | null>("device");
  const [selectedDevice, setSelectedDevice] = useState<"mobile" | "computer" | null>(null);

  const handleDeviceSelect = (device: "mobile" | "computer") => {
    setSelectedDevice(device);
    if (device === "mobile") {
      setStep("orientation");
    } else {
      completeTutorial(false);
    }
  };

  const handleOrientationContinue = () => {
    completeTutorial(true);
  };

  const completeTutorial = async (isMobile: boolean) => {
    // Mark tutorial as completed in database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ tutorial_completed: true })
          .eq("user_id", user.id);
      }
    } catch (error) {
      console.error("Error saving tutorial state:", error);
    }
    
    // Save to localStorage as backup
    localStorage.setItem("foodfps_tutorial_completed", "true");
    if (isMobile) {
      localStorage.setItem("foodfps_touchscreen", "true");
    }
    
    onComplete(isMobile);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Welcome to Food FPS! 🎮</DialogTitle>
          <DialogDescription className="text-center">
            Let's get you set up for the best experience
          </DialogDescription>
        </DialogHeader>

        {step === "device" && (
          <div className="space-y-4 py-4">
            <p className="text-center text-muted-foreground">
              What device are you playing on?
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <Card 
                className="p-6 cursor-pointer hover:border-primary transition-colors group"
                onClick={() => handleDeviceSelect("mobile")}
              >
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary transition-colors">
                    <Smartphone className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold">Mobile / Tablet</h3>
                  <p className="text-xs text-muted-foreground">
                    Touch controls enabled
                  </p>
                </div>
              </Card>

              <Card 
                className="p-6 cursor-pointer hover:border-primary transition-colors group"
                onClick={() => handleDeviceSelect("computer")}
              >
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary transition-colors">
                    <Monitor className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold">Computer</h3>
                  <p className="text-xs text-muted-foreground">
                    Keyboard & mouse
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {step === "orientation" && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                <RotateCcw className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Turn Your Phone Sideways! 📱</h3>
              <p className="text-muted-foreground">
                For the best gaming experience, rotate your device to <span className="font-bold text-primary">landscape mode</span> (hotdog style 🌭)
              </p>
              <div className="flex justify-center gap-4 py-4">
                <div className="text-center">
                  <div className="w-12 h-20 border-2 border-muted-foreground/50 rounded-lg mx-auto mb-2" />
                  <span className="text-xs text-muted-foreground">Portrait</span>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl">→</span>
                </div>
                <div className="text-center">
                  <div className="w-20 h-12 border-2 border-primary rounded-lg mx-auto mb-2 bg-primary/10" />
                  <span className="text-xs text-primary font-medium">Landscape ✓</span>
                </div>
              </div>
            </div>
            
            <Button onClick={handleOrientationContinue} className="w-full" size="lg">
              Got it, let's play!
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};