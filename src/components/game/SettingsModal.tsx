import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Smartphone, Volume2, Palette, Check, Box } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  touchscreenMode: boolean;
  onTouchscreenModeChange: (enabled: boolean) => void;
  onOpenServicePanel?: () => void;
  threeDMode?: boolean;
  onThreeDModeChange?: (enabled: boolean) => void;
}

// Predefined UI color themes
const UI_THEMES = [
  { name: "Default", primary: "262 83% 58%", accent: "262 83% 58%", id: "default" },
  { name: "Ocean Blue", primary: "210 100% 50%", accent: "200 90% 60%", id: "ocean" },
  { name: "Forest Green", primary: "142 76% 36%", accent: "142 70% 45%", id: "forest" },
  { name: "Sunset Orange", primary: "25 95% 53%", accent: "35 91% 53%", id: "sunset" },
  { name: "Crimson Red", primary: "0 84% 60%", accent: "350 84% 55%", id: "crimson" },
  { name: "Royal Purple", primary: "270 76% 55%", accent: "280 70% 60%", id: "royal" },
  { name: "Cyberpunk Pink", primary: "330 80% 55%", accent: "320 75% 50%", id: "cyber" },
  { name: "Golden", primary: "45 93% 47%", accent: "48 96% 53%", id: "golden" },
];

// Sound effect utility
const playSound = (soundType: "click" | "shoot" | "hit" | "pickup" | "gameOver" | "levelUp") => {
  const soundEnabled = localStorage.getItem("foodfps_sound") !== "false";
  if (!soundEnabled) return;

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  switch (soundType) {
    case "click":
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      break;
    case "shoot":
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      break;
    case "hit":
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      break;
    case "pickup":
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      break;
    case "gameOver":
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      break;
    case "levelUp":
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(500, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
      break;
  }
};

// Export sound utility for use in other components
export { playSound };

export const SettingsModal = ({ 
  open, 
  onOpenChange, 
  touchscreenMode, 
  onTouchscreenModeChange,
  onOpenServicePanel,
  threeDMode: threeDModeProp = false,
  onThreeDModeChange 
}: SettingsModalProps) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [tapCount, setTapCount] = useState(0);
  const [tapTimer, setTapTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedSound = localStorage.getItem("foodfps_sound");
    if (savedSound !== null) setSoundEnabled(savedSound === "true");
    
    const savedTheme = localStorage.getItem("foodfps_ui_theme");
    if (savedTheme) {
      setSelectedTheme(savedTheme);
      applyTheme(savedTheme);
    }

    const saved3D = localStorage.getItem("foodfps_3d");
    if (saved3D === "true") {
      document.documentElement.setAttribute("data-3d", "true");
    }
  }, []);

  const handleSoundChange = (enabled: boolean) => {
    setSoundEnabled(enabled);
    localStorage.setItem("foodfps_sound", String(enabled));
    
    // Play a test sound when enabling
    if (enabled) {
      playSound("click");
    }
  };

  const applyTheme = (themeId: string) => {
    const theme = UI_THEMES.find(t => t.id === themeId);
    if (!theme) return;

    document.documentElement.style.setProperty("--primary", theme.primary);
    document.documentElement.style.setProperty("--accent", theme.accent);
  };

  const handleThreeDChange = (enabled: boolean) => {
    localStorage.setItem("foodfps_3d", String(enabled));
    if (enabled) {
      document.documentElement.setAttribute("data-3d", "true");
    } else {
      document.documentElement.removeAttribute("data-3d");
    }
    onThreeDModeChange?.(enabled);
    playSound("click");
  };

  const handleThemeChange = (themeId: string) => {
    setSelectedTheme(themeId);
    localStorage.setItem("foodfps_ui_theme", themeId);
    applyTheme(themeId);
    playSound("click");
  };

  const handleTitleClick = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (tapTimer) clearTimeout(tapTimer);
    const timer = setTimeout(() => setTapCount(0), 2000);
    setTapTimer(timer);
    if (newCount >= 5 && onOpenServicePanel) {
      setTapCount(0);
      onOpenChange(false);
      onOpenServicePanel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 cursor-pointer select-none" onClick={handleTitleClick}>
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


          {/* 3D Mode */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Box className="w-5 h-5 text-primary" />
                <div>
                  <Label className="font-medium">3D Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Play game modes in full 3D
                  </p>
                </div>
              </div>
              <Switch 
                checked={threeDModeProp} 
                onCheckedChange={handleThreeDChange}
              />
            </div>
          </Card>

          {/* UI Color Theme */}
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Palette className="w-5 h-5 text-primary" />
              <div>
                <Label className="font-medium">UI Color Theme</Label>
                <p className="text-xs text-muted-foreground">
                  Customize the game's color scheme
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {UI_THEMES.map((theme) => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <Button
                    key={theme.id}
                    variant="outline"
                    size="sm"
                    className={`relative h-12 p-1 ${isSelected ? "ring-2 ring-primary" : ""}`}
                    onClick={() => handleThemeChange(theme.id)}
                    title={theme.name}
                  >
                    <div 
                      className="w-full h-full rounded"
                      style={{ backgroundColor: `hsl(${theme.primary})` }}
                    />
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {UI_THEMES.find(t => t.id === selectedTheme)?.name || "Default"}
            </p>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
