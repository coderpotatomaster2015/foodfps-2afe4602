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
  Loader2, Check, X, Clock, Play
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
  const [submitting, setSubmitting] = useState(false);
  const [myModes, setMyModes] = useState<any[]>([]);
  const [tab, setTab] = useState("create");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (open) loadMyModes();
  }, [open]);

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
      });

      if (error) {
        if (error.code === "23505") toast.error("A gamemode with this name already exists");
        else throw error;
        return;
      }

      toast.success("Gamemode submitted for approval!");
      setName(""); setDescription(""); setEnemyHealth(100); setPlayerHealth(100);
      setAllowedWeapons(["pistol"]); setShowScore(true); setShowHealthGui(true);
      setEnemySpeedMult(1.0); setPlayerSpeedMult(1.0); setSpawnInterval(2.0);
      setScoreMultiplier(1.0); setEnemyColor("#FF0000"); setBgColorTop("#0a0a1a");
      setBgColorBottom("#1a1a2e"); setMaxEnemies(10); setPickupChance(0.3);
      loadMyModes();
      setTab("my-modes");
    } catch (error) {
      console.error("Error creating gamemode:", error);
      toast.error("Failed to create gamemode");
    } finally {
      setSubmitting(false);
    }
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
          <DialogDescription>Design your own custom gamemode and submit it for approval</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
          <TabsList className="mx-auto">
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="my-modes">My Modes ({myModes.length})</TabsTrigger>
          </TabsList>

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
                  </div>
                </Card>

                {/* Health Settings */}
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Heart className="w-4 h-4 text-red-400" />Health</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Player Health: {playerHealth}</Label>
                      <Slider min={25} max={500} step={25} value={[playerHealth]} onValueChange={v => setPlayerHealth(v[0])} />
                    </div>
                    <div>
                      <Label>Enemy Health: {enemyHealth}</Label>
                      <Slider min={10} max={500} step={10} value={[enemyHealth]} onValueChange={v => setEnemyHealth(v[0])} />
                    </div>
                  </div>
                </Card>

                {/* Speed & Spawning */}
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" />Speed & Spawning</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Player Speed: {playerSpeedMult.toFixed(2)}x</Label>
                      <Slider min={0.5} max={2.0} step={0.05} value={[playerSpeedMult]} onValueChange={v => setPlayerSpeedMult(v[0])} />
                    </div>
                    <div>
                      <Label>Enemy Speed: {enemySpeedMult.toFixed(2)}x</Label>
                      <Slider min={0.3} max={2.0} step={0.05} value={[enemySpeedMult]} onValueChange={v => setEnemySpeedMult(v[0])} />
                    </div>
                    <div>
                      <Label>Spawn Interval: {spawnInterval.toFixed(1)}s</Label>
                      <Slider min={0.3} max={5.0} step={0.1} value={[spawnInterval]} onValueChange={v => setSpawnInterval(v[0])} />
                    </div>
                    <div>
                      <Label>Max Enemies: {maxEnemies}</Label>
                      <Slider min={3} max={30} step={1} value={[maxEnemies]} onValueChange={v => setMaxEnemies(v[0])} />
                    </div>
                    <div>
                      <Label>Score Multiplier: {scoreMultiplier.toFixed(1)}x</Label>
                      <Slider min={0.5} max={3.0} step={0.1} value={[scoreMultiplier]} onValueChange={v => setScoreMultiplier(v[0])} />
                    </div>
                    <div>
                      <Label>Pickup Chance: {(pickupChance * 100).toFixed(0)}%</Label>
                      <Slider min={0} max={1} step={0.05} value={[pickupChance]} onValueChange={v => setPickupChance(v[0])} />
                    </div>
                  </div>
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

                {/* Visuals */}
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Palette className="w-4 h-4 text-purple-400" />Visuals</h3>
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

                  {/* Preview */}
                  <div className="mt-3">
                    <Label className="text-xs text-muted-foreground">Preview</Label>
                    <div 
                      className="w-full h-24 rounded-lg border border-border mt-1 flex items-center justify-center relative overflow-hidden"
                      style={{ background: `linear-gradient(to bottom, ${bgColorTop}, ${bgColorBottom})` }}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/80 border-2 border-primary" />
                      <div className="w-5 h-5 rounded-full absolute top-4 right-8" style={{ backgroundColor: enemyColor }} />
                      <div className="w-5 h-5 rounded-full absolute bottom-6 left-12" style={{ backgroundColor: enemyColor }} />
                    </div>
                  </div>
                </Card>

                {/* HUD Options */}
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Eye className="w-4 h-4 text-blue-400" />HUD Options</h3>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={showScore} onCheckedChange={setShowScore} />
                      <Label>Show Score</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={showHealthGui} onCheckedChange={setShowHealthGui} />
                      <Label>Show Health Bar</Label>
                    </div>
                  </div>
                </Card>

                <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2" size="lg">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit for Approval
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>

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
