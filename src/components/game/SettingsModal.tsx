import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Settings, Smartphone, Volume2 } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  touchscreenMode: boolean;
  onTouchscreenModeChange: (enabled: boolean) => void;
}

export const SettingsModal = ({ 
  open, 
  onOpenChange, 
  touchscreenMode, 
  onTouchscreenModeChange 
}: SettingsModalProps) => {
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const savedSound = localStorage.getItem("foodfps_sound");
    if (savedSound !== null) setSoundEnabled(savedSound === "true");
  }, []);

  const handleSoundChange = (enabled: boolean) => {
    setSoundEnabled(enabled);
    localStorage.setItem("foodfps_sound", String(enabled));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your game preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Touchscreen Mode */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-primary" />
                <div>
                  <Label className="font-medium">Touchscreen Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable touch controls for mobile play
                  </p>
                </div>
              </div>
              <Switch 
                checked={touchscreenMode} 
                onCheckedChange={onTouchscreenModeChange}
              />
            </div>
          </Card>

          {/* Sound Toggle */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-primary" />
                <div>
                  <Label className="font-medium">Sound Effects</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable game sound effects
                  </p>
                </div>
              </div>
              <Switch 
                checked={soundEnabled} 
                onCheckedChange={handleSoundChange}
              />
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
