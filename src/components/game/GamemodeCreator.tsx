import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomGamemodeCanvas } from "./CustomGamemodeCanvas";
import { 
  Gamepad2, Heart, Crosshair, Zap, Users, Palette, Eye, 
  Send, ArrowLeft, Sparkles, Shield, Timer, Target, Save,
  Loader2, Check, X, Clock, Play, Globe, Search, Flame,
  Ruler, Wind, Bomb, Snowflake, Map, Bot, Wand2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GamemodeCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ALL_WEAPONS = [
  "pistol", "shotgun", "sword", "rifle", "sniper", "smg", "knife", "rpg", "axe",
  "flamethrower", "minigun", "railgun", "crossbow", "laser_pistol", "grenade_launcher",
  "katana", "dual_pistols", "plasma_rifle", "boomerang", "whip", "freeze_ray", "harpoon_gun"
];

const GRAPHICS_PRESETS: Record<string, { label: string; bgTop: string; bgBottom: string; enemyColor: string; description: string }> = {
  custom: { label: "Custom", bgTop: "#0a0a1a", bgBottom: "#1a1a2e", enemyColor: "#FF0000", description: "Your own colors" },
  neon: { label: "Neon City", bgTop: "#0a001a", bgBottom: "#1a0033", enemyColor: "#FF00FF", description: "Cyberpunk neon vibes" },
  retro: { label: "Retro Arcade", bgTop: "#1a0a00", bgBottom: "#331a00", enemyColor: "#00FF00", description: "Classic arcade green" },
  arctic: { label: "Arctic Storm", bgTop: "#0a1a2e", bgBottom: "#1a3352", enemyColor: "#93C5FD", description: "Icy blue tones" },
  volcanic: { label: "Volcanic", bgTop: "#1a0500", bgBottom: "#3d0f00", enemyColor: "#FF4500", description: "Fiery lava tones" },
  forest: { label: "Dark Forest", bgTop: "#050f05", bgBottom: "#0f2a0f", enemyColor: "#8B4513", description: "Dense woodland" },
  ocean: { label: "Deep Ocean", bgTop: "#001020", bgBottom: "#003060", enemyColor: "#00CED1", description: "Underwater depths" },
  sunset: { label: "Sunset", bgTop: "#1a0a1a", bgBottom: "#331a00", enemyColor: "#FFD700", description: "Golden hour warmth" },
  void: { label: "Void", bgTop: "#000000", bgBottom: "#080808", enemyColor: "#FFFFFF", description: "Pure darkness" },
  candy: { label: "Candy Land", bgTop: "#1a0520", bgBottom: "#2a0a35", enemyColor: "#FF69B4", description: "Sweet pink theme" },
  matrix: { label: "Matrix", bgTop: "#000a00", bgBottom: "#001a00", enemyColor: "#00FF41", description: "Digital rain green" },
  blood_moon: { label: "Blood Moon", bgTop: "#1a0000", bgBottom: "#330000", enemyColor: "#DC143C", description: "Dark crimson" },
};

export const GamemodeCreator = ({ open, onOpenChange }: GamemodeCreatorProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [enemyHealth, setEnemyHealth] = useState(100);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [allowedWeapons, setAllowedWeapons] = useState<string[]>(["pistol"]);
  const [showScore, setShowScore] = useState(true);
  const [showHealthGui, setShowHealthGui] = useState(true);
  const [enemySpeedMult, setEnemySpeedMult] = useState(1.0);
  const [playerSpeedMult, setPlayerSpeedMult] = useState(1.0);
  const [spawnInterval, setSpawnInterval] = useState(2.0);
  const [scoreMultiplier, setScoreMultiplier] = useState(1.0);
  const [enemyColor, setEnemyColor] = useState("#FF0000");
  const [bgColorTop, setBgColorTop] = useState("#0a0a1a");
  const [bgColorBottom, setBgColorBottom] = useState("#1a1a2e");
  const [maxEnemies, setMaxEnemies] = useState(10);
  const [pickupChance, setPickupChance] = useState(0.3);
  // New expanded controls
  const [gravityMult, setGravityMult] = useState(1.0);
  const [friendlyFire, setFriendlyFire] = useState(false);
  const [autoHeal, setAutoHeal] = useState(false);
  const [autoHealRate, setAutoHealRate] = useState(0);
  const [damageMult, setDamageMult] = useState(1.0);
  const [shieldOnSpawn, setShieldOnSpawn] = useState(false);
  const [shieldDuration, setShieldDuration] = useState(3.0);
  const [lives, setLives] = useState(0);
  const [timeLimit, setTimeLimit] = useState(0);
  const [minimapEnabled, setMinimapEnabled] = useState(true);
  const [ammoInfinite, setAmmoInfinite] = useState(false);
  const [enemySizeMult, setEnemySizeMult] = useState(1.0);
  const [playerSizeMult, setPlayerSizeMult] = useState(1.0);
  const [fogEnabled, setFogEnabled] = useState(false);
  const [fogDensity, setFogDensity] = useState(0.5);
  const [waveMode, setWaveMode] = useState(false);
  const [enemiesPerWave, setEnemiesPerWave] = useState(5);
  const [difficultyRamp, setDifficultyRamp] = useState(1.0);
  const [creatorNotes, setCreatorNotes] = useState("");
  const [graphicsPreset, setGraphicsPreset] = useState("custom");

  const [submitting, setSubmitting] = useState(false);
  const [myModes, setMyModes] = useState<any[]>([]);
  const [tab, setTab] = useState("create");
  const [testing, setTesting] = useState(false);

  // Browse state
  const [browseModes, setBrowseModes] = useState<any[]>([]);
  const [browseSearch, setBrowseSearch] = useState("");
  const [browseLoading, setBrowseLoading] = useState(false);

  // AI state (admin only)
  const [isAdmin, setIsAdmin] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  useEffect(() => {
    if (open) {
      loadMyModes();
      loadBrowseModes();
      checkAdminStatus();
    }
  }, [open]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (data?.some(r => r.role === "admin" || r.role === "owner")) setIsAdmin(true);
  };

  const applyGraphicsPreset = (presetKey: string) => {
    setGraphicsPreset(presetKey);
    if (presetKey !== "custom") {
      const preset = GRAPHICS_PRESETS[presetKey];
      setBgColorTop(preset.bgTop);
      setBgColorBottom(preset.bgBottom);
      setEnemyColor(preset.enemyColor);
    }
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) { toast.error("Enter a description for the AI"); return; }
    setAiGenerating(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-gamemode", {
        body: { prompt: aiPrompt.trim() },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.gamemode) {
        setAiResult(data.gamemode);
        toast.success("AI generated a gamemode! Review and submit it.");
      }
    } catch (e: any) {
      console.error("AI generation error:", e);
      toast.error("AI generation failed: " + (e.message || "Unknown error"));
    } finally {
      setAiGenerating(false);
    }
  };

  const loadAiResultIntoForm = () => {
    if (!aiResult) return;
    setName(aiResult.name || "");
    setDescription(aiResult.description || "");
    setEnemyHealth(aiResult.enemy_health ?? 100);
    setPlayerHealth(aiResult.player_health ?? 100);
    setAllowedWeapons(aiResult.allowed_weapons || ["pistol"]);
    setShowScore(aiResult.show_score ?? true);
    setShowHealthGui(aiResult.show_health_gui ?? true);
    setEnemySpeedMult(aiResult.enemy_speed_mult ?? 1.0);
    setPlayerSpeedMult(aiResult.player_speed_mult ?? 1.0);
    setSpawnInterval(aiResult.spawn_interval ?? 2.0);
    setScoreMultiplier(aiResult.score_multiplier ?? 1.0);
    setEnemyColor(aiResult.enemy_color || "#FF0000");
    setBgColorTop(aiResult.bg_color_top || "#0a0a1a");
    setBgColorBottom(aiResult.bg_color_bottom || "#1a1a2e");
    setMaxEnemies(aiResult.max_enemies ?? 10);
    setPickupChance(aiResult.pickup_chance ?? 0.3);
    setGravityMult(aiResult.gravity_mult ?? 1.0);
    setFriendlyFire(aiResult.friendly_fire ?? false);
    setAutoHeal(aiResult.auto_heal ?? false);
    setAutoHealRate(aiResult.auto_heal_rate ?? 0);
    setDamageMult(aiResult.damage_mult ?? 1.0);
    setShieldOnSpawn(aiResult.shield_on_spawn ?? false);
    setShieldDuration(aiResult.shield_duration ?? 3.0);
    setLives(aiResult.lives ?? 0);
    setTimeLimit(aiResult.time_limit ?? 0);
    setMinimapEnabled(aiResult.minimap_enabled ?? true);
    setAmmoInfinite(aiResult.ammo_infinite ?? false);
    setEnemySizeMult(aiResult.enemy_size_mult ?? 1.0);
    setPlayerSizeMult(aiResult.player_size_mult ?? 1.0);
    setFogEnabled(aiResult.fog_enabled ?? false);
    setFogDensity(aiResult.fog_density ?? 0.5);
    setWaveMode(aiResult.wave_mode ?? false);
    setEnemiesPerWave(aiResult.enemies_per_wave ?? 5);
    setDifficultyRamp(aiResult.difficulty_ramp ?? 1.0);
    setGraphicsPreset("custom");
    setTab("create");
    toast.success("Loaded into editor! Review and submit.");
  };

  const loadMyModes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("custom_gamemodes")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setMyModes(data);
  };

  const loadBrowseModes = async () => {
    setBrowseLoading(true);
    const { data } = await supabase
      .from("custom_gamemodes")
      .select("*")
      .eq("is_public", true)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setBrowseModes(data);
    setBrowseLoading(false);
  };

  const filteredBrowseModes = browseSearch.trim()
    ? browseModes.filter(m => 
        m.name.toLowerCase().includes(browseSearch.toLowerCase()) ||
        (m.description || "").toLowerCase().includes(browseSearch.toLowerCase()) ||
        m.creator_username.toLowerCase().includes(browseSearch.toLowerCase())
      )
    : browseModes;

  const toggleWeapon = (weapon: string) => {
    setAllowedWeapons(prev => 
      prev.includes(weapon) ? prev.filter(w => w !== weapon) : [...prev, weapon]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (allowedWeapons.length === 0) { toast.error("Select at least one weapon"); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not signed in"); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle();

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) { toast.error("Invalid name for URL slug"); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("custom_gamemodes").insert({
        creator_id: user.id,
        creator_username: profile?.username || "unknown",
        name: name.trim(),
        slug,
        description: description.trim() || null,
        enemy_health: enemyHealth,
        player_health: playerHealth,
        allowed_weapons: allowedWeapons,
        show_score: showScore,
        show_health_gui: showHealthGui,
        enemy_speed_mult: enemySpeedMult,
        player_speed_mult: playerSpeedMult,
        spawn_interval: spawnInterval,
        score_multiplier: scoreMultiplier,
        enemy_color: enemyColor,
        bg_color_top: bgColorTop,
        bg_color_bottom: bgColorBottom,
        max_enemies: maxEnemies,
        pickup_chance: pickupChance,
        gravity_mult: gravityMult,
        friendly_fire: friendlyFire,
        auto_heal: autoHeal,
        auto_heal_rate: autoHealRate,
        damage_mult: damageMult,
        shield_on_spawn: shieldOnSpawn,
        shield_duration: shieldDuration,
        lives,
        time_limit: timeLimit,
        minimap_enabled: minimapEnabled,
        ammo_infinite: ammoInfinite,
        enemy_size_mult: enemySizeMult,
        player_size_mult: playerSizeMult,
        fog_enabled: fogEnabled,
        fog_density: fogDensity,
        wave_mode: waveMode,
        enemies_per_wave: enemiesPerWave,
        difficulty_ramp: difficultyRamp,
        creator_notes: creatorNotes.trim() || null,
      } as any);

      if (error) {
        if (error.code === "23505") toast.error("A gamemode with this name already exists");
        else throw error;
        return;
      }

      toast.success("Gamemode submitted for approval!");
      resetForm();
      loadMyModes();
      setTab("my-modes");
    } catch (error) {
      console.error("Error creating gamemode:", error);
      toast.error("Failed to create gamemode");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName(""); setDescription(""); setEnemyHealth(100); setPlayerHealth(100);
    setAllowedWeapons(["pistol"]); setShowScore(true); setShowHealthGui(true);
    setEnemySpeedMult(1.0); setPlayerSpeedMult(1.0); setSpawnInterval(2.0);
    setScoreMultiplier(1.0); setEnemyColor("#FF0000"); setBgColorTop("#0a0a1a");
    setBgColorBottom("#1a1a2e"); setMaxEnemies(10); setPickupChance(0.3);
    setGravityMult(1.0); setFriendlyFire(false); setAutoHeal(false); setAutoHealRate(0);
    setDamageMult(1.0); setShieldOnSpawn(false); setShieldDuration(3.0); setLives(0);
    setTimeLimit(0); setMinimapEnabled(true); setAmmoInfinite(false);
    setEnemySizeMult(1.0); setPlayerSizeMult(1.0); setFogEnabled(false);
    setFogDensity(0.5); setWaveMode(false); setEnemiesPerWave(5);
    setDifficultyRamp(1.0); setCreatorNotes("");
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="text-yellow-400 border-yellow-400/50"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved": return <Badge className="bg-green-600"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected": return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const currentConfig = {
    name: name || "Test Mode",
    enemy_health: enemyHealth, player_health: playerHealth, allowed_weapons: allowedWeapons,
    show_score: showScore, show_health_gui: showHealthGui, enemy_speed_mult: enemySpeedMult,
    player_speed_mult: playerSpeedMult, spawn_interval: spawnInterval, score_multiplier: scoreMultiplier,
    enemy_color: enemyColor, bg_color_top: bgColorTop, bg_color_bottom: bgColorBottom,
    max_enemies: maxEnemies, pickup_chance: pickupChance,
  };

  if (testing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-5xl h-[90vh] flex flex-col p-2">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-bold text-sm">Testing: {name || "Unnamed"}</h3>
            <Button size="sm" variant="outline" onClick={() => setTesting(false)}>
              <ArrowLeft className="w-3 h-3 mr-1" /> Back to Editor
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <CustomGamemodeCanvas
              config={currentConfig}
              username="Creator"
              onBack={() => setTesting(false)}
              playerSkin={localStorage.getItem("foodfps_skin") || "#FFF3D6"}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" />
            Gamemode Creator
          </DialogTitle>
          <DialogDescription>Design, browse, and play custom gamemodes</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
          <TabsList className="mx-auto">
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="browse">Browse ({browseModes.length})</TabsTrigger>
            <TabsTrigger value="my-modes">My Modes ({myModes.length})</TabsTrigger>
          </TabsList>

          {/* ══════════ CREATE TAB ══════════ */}
          <TabsContent value="create" className="flex-1">
            <ScrollArea className="h-[calc(85vh-180px)]">
              <div className="space-y-6 p-2">
                {/* Basic Info */}
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Basic Info</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label>Gamemode Name *</Label>
                      <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Turbo Rush" maxLength={50} />
                      {name && <p className="text-xs text-muted-foreground mt-1">URL: /custom/{name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}</p>}
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your gamemode..." maxLength={500} rows={3} />
                    </div>
                    <div>
                      <Label>Creator Notes (private, visible to reviewers)</Label>
                      <Textarea value={creatorNotes} onChange={e => setCreatorNotes(e.target.value)} placeholder="Any notes for the review team..." maxLength={300} rows={2} />
                    </div>
                  </div>
                </Card>

                {/* Health & Combat */}
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Heart className="w-4 h-4 text-red-400" />Health & Combat</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Player Health: {playerHealth}</Label>
                      <Slider min={25} max={500} step={25} value={[playerHealth]} onValueChange={v => setPlayerHealth(v[0])} />
                    </div>
                    <div>
                      <Label>Enemy Health: {enemyHealth}</Label>
                      <Slider min={10} max={500} step={10} value={[enemyHealth]} onValueChange={v => setEnemyHealth(v[0])} />
                    </div>
                    <div>
                      <Label>Damage Multiplier: {damageMult.toFixed(1)}x</Label>
                      <Slider min={0.1} max={5.0} step={0.1} value={[damageMult]} onValueChange={v => setDamageMult(v[0])} />
                    </div>
                    <div>
                      <Label>Lives (0 = infinite): {lives}</Label>
                      <Slider min={0} max={10} step={1} value={[lives]} onValueChange={v => setLives(v[0])} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Auto Heal</Label>
                      <Switch checked={autoHeal} onCheckedChange={setAutoHeal} />
                    </div>
                    {autoHeal && (
                      <div>
                        <Label>Heal Rate: {autoHealRate.toFixed(1)} HP/s</Label>
                        <Slider min={0.5} max={10} step={0.5} value={[autoHealRate]} onValueChange={v => setAutoHealRate(v[0])} />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Shield on Spawn</Label>
                      <Switch checked={shieldOnSpawn} onCheckedChange={setShieldOnSpawn} />
                    </div>
                    {shieldOnSpawn && (
                      <div>
                        <Label>Shield Duration: {shieldDuration.toFixed(1)}s</Label>
                        <Slider min={1} max={15} step={0.5} value={[shieldDuration]} onValueChange={v => setShieldDuration(v[0])} />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Friendly Fire</Label>
                      <Switch checked={friendlyFire} onCheckedChange={setFriendlyFire} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Infinite Ammo</Label>
                      <Switch checked={ammoInfinite} onCheckedChange={setAmmoInfinite} />
                    </div>
                  </div>
                </Card>

                {/* Speed, Spawning & Physics */}
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" />Speed, Spawning & Physics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Player Speed: {playerSpeedMult.toFixed(2)}x</Label>
                      <Slider min={0.5} max={3.0} step={0.05} value={[playerSpeedMult]} onValueChange={v => setPlayerSpeedMult(v[0])} />
                    </div>
                    <div>
                      <Label>Enemy Speed: {enemySpeedMult.toFixed(2)}x</Label>
                      <Slider min={0.3} max={3.0} step={0.05} value={[enemySpeedMult]} onValueChange={v => setEnemySpeedMult(v[0])} />
                    </div>
                    <div>
                      <Label>Spawn Interval: {spawnInterval.toFixed(1)}s</Label>
                      <Slider min={0.3} max={5.0} step={0.1} value={[spawnInterval]} onValueChange={v => setSpawnInterval(v[0])} />
                    </div>
                    <div>
                      <Label>Max Enemies: {maxEnemies}</Label>
                      <Slider min={3} max={50} step={1} value={[maxEnemies]} onValueChange={v => setMaxEnemies(v[0])} />
                    </div>
                    <div>
                      <Label>Score Multiplier: {scoreMultiplier.toFixed(1)}x</Label>
                      <Slider min={0.5} max={5.0} step={0.1} value={[scoreMultiplier]} onValueChange={v => setScoreMultiplier(v[0])} />
                    </div>
                    <div>
                      <Label>Pickup Chance: {(pickupChance * 100).toFixed(0)}%</Label>
                      <Slider min={0} max={1} step={0.05} value={[pickupChance]} onValueChange={v => setPickupChance(v[0])} />
                    </div>
                    <div>
                      <Label>Gravity: {gravityMult.toFixed(1)}x</Label>
                      <Slider min={0.1} max={3.0} step={0.1} value={[gravityMult]} onValueChange={v => setGravityMult(v[0])} />
                    </div>
                    <div>
                      <Label>Time Limit (0 = none): {timeLimit === 0 ? "None" : `${timeLimit}s`}</Label>
                      <Slider min={0} max={600} step={30} value={[timeLimit]} onValueChange={v => setTimeLimit(v[0])} />
                    </div>
                    <div>
                      <Label>Difficulty Ramp: {difficultyRamp.toFixed(1)}x</Label>
                      <Slider min={0.5} max={3.0} step={0.1} value={[difficultyRamp]} onValueChange={v => setDifficultyRamp(v[0])} />
                    </div>
                  </div>
                </Card>

                {/* Size & Wave Settings */}
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Ruler className="w-4 h-4 text-orange-400" />Size & Wave Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Enemy Size: {enemySizeMult.toFixed(1)}x</Label>
                      <Slider min={0.3} max={3.0} step={0.1} value={[enemySizeMult]} onValueChange={v => setEnemySizeMult(v[0])} />
                    </div>
                    <div>
                      <Label>Player Size: {playerSizeMult.toFixed(1)}x</Label>
                      <Slider min={0.5} max={2.0} step={0.1} value={[playerSizeMult]} onValueChange={v => setPlayerSizeMult(v[0])} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Wave Mode (enemies come in waves)</Label>
                    <Switch checked={waveMode} onCheckedChange={setWaveMode} />
                  </div>
                  {waveMode && (
                    <div>
                      <Label>Enemies Per Wave: {enemiesPerWave}</Label>
                      <Slider min={3} max={30} step={1} value={[enemiesPerWave]} onValueChange={v => setEnemiesPerWave(v[0])} />
                    </div>
                  )}
                </Card>

                {/* Weapons */}
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Crosshair className="w-4 h-4 text-primary" />Allowed Weapons</h3>
                  <div className="flex gap-2 mb-2">
                    <Button size="sm" variant="outline" onClick={() => setAllowedWeapons([...ALL_WEAPONS])}>Select All</Button>
                    <Button size="sm" variant="outline" onClick={() => setAllowedWeapons(["pistol"])}>Reset</Button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {ALL_WEAPONS.map(weapon => (
                      <div key={weapon} className="flex items-center gap-2">
                        <Checkbox 
                          id={`weapon-${weapon}`}
                          checked={allowedWeapons.includes(weapon)}
                          onCheckedChange={() => toggleWeapon(weapon)}
                        />
                        <Label htmlFor={`weapon-${weapon}`} className="text-xs capitalize cursor-pointer">
                          {weapon.replace(/_/g, " ")}
                        </Label>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Visuals & Environment */}
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Palette className="w-4 h-4 text-purple-400" />Visuals & Environment</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Enemy Color</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={enemyColor} onChange={e => setEnemyColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                        <span className="text-xs text-muted-foreground">{enemyColor}</span>
                      </div>
                    </div>
                    <div>
                      <Label>Sky (Top)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={bgColorTop} onChange={e => setBgColorTop(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                        <span className="text-xs text-muted-foreground">{bgColorTop}</span>
                      </div>
                    </div>
                    <div>
                      <Label>Ground (Bottom)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={bgColorBottom} onChange={e => setBgColorBottom(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                        <span className="text-xs text-muted-foreground">{bgColorBottom}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Label className="text-xs">Fog Effect</Label>
                    <Switch checked={fogEnabled} onCheckedChange={setFogEnabled} />
                  </div>
                  {fogEnabled && (
                    <div>
                      <Label>Fog Density: {(fogDensity * 100).toFixed(0)}%</Label>
                      <Slider min={0.1} max={1.0} step={0.1} value={[fogDensity]} onValueChange={v => setFogDensity(v[0])} />
                    </div>
                  )}

                  {/* Preview */}
                  <div className="mt-3">
                    <Label className="text-xs text-muted-foreground">Preview</Label>
                    <div 
                      className="w-full h-24 rounded-lg border border-border mt-1 flex items-center justify-center relative overflow-hidden"
                      style={{ background: `linear-gradient(to bottom, ${bgColorTop}, ${bgColorBottom})` }}
                    >
                      {fogEnabled && (
                        <div className="absolute inset-0 bg-white/20" style={{ opacity: fogDensity * 0.5 }} />
                      )}
                      <div className="w-6 h-6 rounded-full bg-primary/80 border-2 border-primary" style={{ transform: `scale(${playerSizeMult})` }} />
                      <div className="w-5 h-5 rounded-full absolute top-4 right-8" style={{ backgroundColor: enemyColor, transform: `scale(${enemySizeMult})` }} />
                      <div className="w-5 h-5 rounded-full absolute bottom-6 left-12" style={{ backgroundColor: enemyColor, transform: `scale(${enemySizeMult})` }} />
                    </div>
                  </div>
                </Card>

                {/* HUD Options */}
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Eye className="w-4 h-4 text-blue-400" />HUD Options</h3>
                  <div className="flex gap-6 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Switch checked={showScore} onCheckedChange={setShowScore} />
                      <Label>Show Score</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={showHealthGui} onCheckedChange={setShowHealthGui} />
                      <Label>Show Health Bar</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={minimapEnabled} onCheckedChange={setMinimapEnabled} />
                      <Label>Show Minimap</Label>
                    </div>
                  </div>
                </Card>

                <div className="flex gap-2">
                  <Button onClick={() => setTesting(true)} variant="outline" className="flex-1 gap-2" size="lg">
                    <Play className="w-4 h-4" /> Test Play
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting} className="flex-1 gap-2" size="lg">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit for Approval
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ══════════ BROWSE TAB ══════════ */}
          <TabsContent value="browse" className="flex-1">
            <div className="px-2 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  value={browseSearch} 
                  onChange={e => setBrowseSearch(e.target.value)} 
                  placeholder="Search gamemodes by name, description, or creator..." 
                  className="pl-9"
                />
              </div>
            </div>
            <ScrollArea className="h-[calc(85vh-220px)]">
              {browseLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredBrowseModes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{browseSearch ? "No gamemodes match your search" : "No public gamemodes available yet"}</p>
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {filteredBrowseModes.map(mode => (
                    <Card key={mode.id} className="p-3 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => {
                      window.open(`/custom/${mode.slug}`, '_blank');
                    }}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm truncate">{mode.name}</h4>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              by {mode.creator_username}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{mode.description || "No description"}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className="text-[10px] bg-secondary/80 px-1.5 py-0.5 rounded">❤️ {mode.player_health}hp</span>
                            <span className="text-[10px] bg-secondary/80 px-1.5 py-0.5 rounded">👾 {mode.enemy_health}hp</span>
                            <span className="text-[10px] bg-secondary/80 px-1.5 py-0.5 rounded">⚡ {mode.player_speed_mult}x spd</span>
                            <span className="text-[10px] bg-secondary/80 px-1.5 py-0.5 rounded">🎯 {mode.max_enemies} max</span>
                            <span className="text-[10px] bg-secondary/80 px-1.5 py-0.5 rounded">🔫 {mode.allowed_weapons?.length || 0} weapons</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="w-8 h-8 rounded" style={{ background: `linear-gradient(135deg, ${mode.bg_color_top}, ${mode.bg_color_bottom})` }} />
                          <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/custom/${mode.slug}`, '_blank');
                          }}>
                            Play
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ══════════ MY MODES TAB ══════════ */}
          <TabsContent value="my-modes" className="flex-1">
            <ScrollArea className="h-[calc(85vh-180px)]">
              {myModes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>You haven't created any gamemodes yet</p>
                  <Button variant="outline" className="mt-3" onClick={() => setTab("create")}>Create One</Button>
                </div>
              ) : (
                <div className="space-y-3 p-2">
                  {myModes.map(mode => (
                    <Card key={mode.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{mode.name}</h4>
                          <p className="text-xs text-muted-foreground">{mode.description || "No description"}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created {new Date(mode.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {statusBadge(mode.status)}
                          {mode.is_public && <Badge variant="secondary" className="text-xs">Public</Badge>}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
