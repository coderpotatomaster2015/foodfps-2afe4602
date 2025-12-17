import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GraduationCap, Power, Gamepad2, Users, Skull } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TeacherPanelProps {
  open: boolean;
  onClose: () => void;
}

export const TeacherPanel = ({ open, onClose }: TeacherPanelProps) => {
  const [websiteEnabled, setWebsiteEnabled] = useState(true);
  const [soloDisabled, setSoloDisabled] = useState(false);
  const [multiplayerDisabled, setMultiplayerDisabled] = useState(false);
  const [bossDisabled, setBossDisabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("game_settings")
      .select("*")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .maybeSingle();
    
    if (data) {
      setWebsiteEnabled(data.website_enabled);
      setSoloDisabled((data as any).solo_disabled || false);
      setMultiplayerDisabled((data as any).multiplayer_disabled || false);
      setBossDisabled((data as any).boss_disabled || false);
    }
  };

  const updateSetting = async (setting: string, value: boolean) => {
    setLoading(true);
    const { error } = await supabase
      .from("game_settings")
      .update({ [setting]: value, updated_at: new Date().toISOString() })
      .eq("id", "00000000-0000-0000-0000-000000000001");
    
    if (error) {
      toast.error("Failed to update setting");
    } else {
      toast.success("Setting updated");
    }
    setLoading(false);
  };

  const toggleWebsite = async () => {
    const newValue = !websiteEnabled;
    setWebsiteEnabled(newValue);
    await updateSetting("website_enabled", newValue);
  };

  const toggleSolo = async () => {
    const newValue = !soloDisabled;
    setSoloDisabled(newValue);
    await updateSetting("solo_disabled", newValue);
  };

  const toggleMultiplayer = async () => {
    const newValue = !multiplayerDisabled;
    setMultiplayerDisabled(newValue);
    await updateSetting("multiplayer_disabled", newValue);
  };

  const toggleBoss = async () => {
    const newValue = !bossDisabled;
    setBossDisabled(newValue);
    await updateSetting("boss_disabled", newValue);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Teacher Panel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Power className={`w-5 h-5 ${websiteEnabled ? "text-green-500" : "text-destructive"}`} />
                <div>
                  <Label className="font-medium">Website</Label>
                  <p className="text-xs text-muted-foreground">
                    {websiteEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
              <Switch
                checked={websiteEnabled}
                onCheckedChange={toggleWebsite}
                disabled={loading}
              />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gamepad2 className={`w-5 h-5 ${!soloDisabled ? "text-green-500" : "text-destructive"}`} />
                <div>
                  <Label className="font-medium">Solo Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    {soloDisabled ? "Disabled" : "Enabled"}
                  </p>
                </div>
              </div>
              <Switch
                checked={!soloDisabled}
                onCheckedChange={() => toggleSolo()}
                disabled={loading}
              />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className={`w-5 h-5 ${!multiplayerDisabled ? "text-green-500" : "text-destructive"}`} />
                <div>
                  <Label className="font-medium">Multiplayer Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    {multiplayerDisabled ? "Disabled" : "Enabled"}
                  </p>
                </div>
              </div>
              <Switch
                checked={!multiplayerDisabled}
                onCheckedChange={() => toggleMultiplayer()}
                disabled={loading}
              />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skull className={`w-5 h-5 ${!bossDisabled ? "text-green-500" : "text-destructive"}`} />
                <div>
                  <Label className="font-medium">Boss Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    {bossDisabled ? "Disabled" : "Enabled"}
                  </p>
                </div>
              </div>
              <Switch
                checked={!bossDisabled}
                onCheckedChange={() => toggleBoss()}
                disabled={loading}
              />
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
