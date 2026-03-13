import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Shield, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AntiCheatConfig {
  max_session_score: number;
  max_score_per_minute: number;
  max_afk_ms: number;
  max_map_bounds_multiplier: number;
  ban_hours: number;
  max_accuracy_percent: number;
  max_flamethrower_kills: number;
  warnings_before_ban: number;
  enabled: boolean;
}

export const AntiCheatEditor = () => {
  const [config, setConfig] = useState<AntiCheatConfig>({
    max_session_score: 100000,
    max_score_per_minute: 10000,
    max_afk_ms: 120000,
    max_map_bounds_multiplier: 4,
    ban_hours: 87600,
    max_accuracy_percent: 98,
    max_flamethrower_kills: 100,
    warnings_before_ban: 3,
    enabled: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data } = await (supabase.from("anti_cheat_settings" as any) as any)
      .select("*")
      .eq("id", "00000000-0000-0000-0000-000000000002")
      .maybeSingle();
    if (data) setConfig(data as AntiCheatConfig);
  };

  const saveConfig = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase.from("anti_cheat_settings" as any) as any)
      .update({ ...config, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq("id", "00000000-0000-0000-0000-000000000002");
    setSaving(false);
    if (error) toast.error("Failed to save anti-cheat settings");
    else toast.success("Anti-cheat settings saved!");
  };

  const update = (key: keyof AntiCheatConfig, value: number | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        Anti-Cheat Configuration
      </h3>

      <div className="flex items-center justify-between">
        <Label>Enabled</Label>
        <Switch checked={config.enabled} onCheckedChange={(v) => update("enabled", v)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Max Session Score</Label>
          <Input type="number" value={config.max_session_score} onChange={(e) => update("max_session_score", parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-xs">Max Score/Min</Label>
          <Input type="number" value={config.max_score_per_minute} onChange={(e) => update("max_score_per_minute", parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-xs">Max AFK (ms)</Label>
          <Input type="number" value={config.max_afk_ms} onChange={(e) => update("max_afk_ms", parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-xs">Max Map Bounds Mult</Label>
          <Input type="number" step="0.1" value={config.max_map_bounds_multiplier} onChange={(e) => update("max_map_bounds_multiplier", parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-xs">Ban Hours</Label>
          <Input type="number" value={config.ban_hours} onChange={(e) => update("ban_hours", parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-xs">Max Accuracy %</Label>
          <Input type="number" value={config.max_accuracy_percent} onChange={(e) => update("max_accuracy_percent", parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-xs">Max Flamethrower Kills</Label>
          <Input type="number" value={config.max_flamethrower_kills} onChange={(e) => update("max_flamethrower_kills", parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-xs">Warnings Before Ban</Label>
          <Input type="number" value={config.warnings_before_ban} onChange={(e) => update("warnings_before_ban", parseInt(e.target.value) || 0)} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Players get {config.warnings_before_ban} warnings before a {Math.round(config.ban_hours / 8760)}-year ban.
      </p>

      <Button onClick={saveConfig} disabled={saving} className="w-full gap-2">
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : "Save Anti-Cheat Settings"}
      </Button>
    </Card>
  );
};
