import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Lock, Unlock, Trophy, Coins, Gem, Crown, Shield, Zap, Skull, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SECRET_PASSWORD = "DonutSmp12!67kid";

const Hacks = () => {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  
  // Cheat values
  const [newScore, setNewScore] = useState("");
  const [newCoins, setNewCoins] = useState("");
  const [newGems, setNewGems] = useState("");
  const [newGold, setNewGold] = useState("");
  const [godmodeEnabled, setGodmodeEnabled] = useState(false);
  const [infiniteAmmo, setInfiniteAmmo] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState([1]);
  
  // Current stats
  const [currentScore, setCurrentScore] = useState(0);
  const [currentCoins, setCurrentCoins] = useState(0);
  const [currentGems, setCurrentGems] = useState(0);
  const [currentGold, setCurrentGold] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to access this page");
      navigate("/auth");
      return;
    }
    setUserId(user.id);
    
    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, total_score")
      .eq("user_id", user.id)
      .single();
    
    if (profile) {
      setUsername(profile.username);
      setCurrentScore(profile.total_score || 0);
    }

    // Load currencies
    const { data: currencies } = await supabase
      .from("player_currencies")
      .select("*")
      .eq("user_id", user.id)
      .single();
    
    if (currencies) {
      setCurrentCoins(currencies.coins || 0);
      setCurrentGems(currencies.gems || 0);
      setCurrentGold(currencies.gold || 0);
    }
  };

  const handlePasswordSubmit = () => {
    if (password === SECRET_PASSWORD) {
      setAuthenticated(true);
      toast.success("🔓 Access granted! Welcome to the cheat panel.");
    } else {
      toast.error("❌ Incorrect password");
      setPassword("");
    }
  };

  const setScore = async () => {
    if (!newScore || !userId) return;
    
    const scoreValue = parseInt(newScore);
    if (isNaN(scoreValue)) {
      toast.error("Invalid score value");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ total_score: scoreValue })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to update score");
    } else {
      toast.success(`Score set to ${scoreValue}`);
      setCurrentScore(scoreValue);
      setNewScore("");
    }
  };

  const addScore = async (amount: number) => {
    if (!userId) return;

    const newTotal = currentScore + amount;
    const { error } = await supabase
      .from("profiles")
      .update({ total_score: newTotal })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to update score");
    } else {
      toast.success(`Added ${amount} score`);
      setCurrentScore(newTotal);
    }
  };

  const setCurrency = async (type: "coins" | "gems" | "gold", value: string) => {
    if (!userId) return;
    
    const numValue = parseInt(value);
    if (isNaN(numValue)) {
      toast.error("Invalid value");
      return;
    }

    const { data: existing } = await supabase
      .from("player_currencies")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("player_currencies")
        .update({ [type]: numValue })
        .eq("user_id", userId);

      if (error) {
        toast.error(`Failed to update ${type}`);
      } else {
        toast.success(`${type} set to ${numValue}`);
        if (type === "coins") setCurrentCoins(numValue);
        if (type === "gems") setCurrentGems(numValue);
        if (type === "gold") setCurrentGold(numValue);
      }
    } else {
      const { error } = await supabase
        .from("player_currencies")
        .insert({ 
          user_id: userId, 
          coins: type === "coins" ? numValue : 0,
          gems: type === "gems" ? numValue : 0,
          gold: type === "gold" ? numValue : 0
        });

      if (error) {
        toast.error(`Failed to set ${type}`);
      } else {
        toast.success(`${type} set to ${numValue}`);
        if (type === "coins") setCurrentCoins(numValue);
        if (type === "gems") setCurrentGems(numValue);
        if (type === "gold") setCurrentGold(numValue);
      }
    }
  };

  const maxOutEverything = async () => {
    if (!userId) return;

    // Max score
    await supabase
      .from("profiles")
      .update({ total_score: 999999999 })
      .eq("user_id", userId);

    // Max currencies
    const { data: existing } = await supabase
      .from("player_currencies")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (existing) {
      await supabase
        .from("player_currencies")
        .update({ coins: 999999999, gems: 999999999, gold: 999999999 })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("player_currencies")
        .insert({ user_id: userId, coins: 999999999, gems: 999999999, gold: 999999999 });
    }

    setCurrentScore(999999999);
    setCurrentCoins(999999999);
    setCurrentGems(999999999);
    setCurrentGold(999999999);

    toast.success("🔥 MAXED OUT EVERYTHING!");
  };

  const unlockAllWeapons = async () => {
    if (!userId) return;

    const allWeapons = ["pistol", "shotgun", "sword", "rifle", "sniper", "smg", "knife", "rpg", "axe", "flamethrower", "minigun", "railgun"];
    
    await supabase
      .from("player_progress")
      .update({ unlocked_weapons: allWeapons })
      .eq("user_id", userId);

    toast.success("🔫 All weapons unlocked!");
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold">🔒 Secret Access</h1>
            <p className="text-muted-foreground text-sm">
              Enter the super secret password to access the cheat panel
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                  placeholder="Enter secret password..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button className="w-full gap-2" onClick={handlePasswordSubmit}>
              <Unlock className="w-4 h-4" />
              Access Cheats
            </Button>

            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              Back to Game
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
              <Skull className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-red-500">🔓 Cheat Panel</h1>
              <p className="text-sm text-muted-foreground">Welcome, {username}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Game
          </Button>
        </div>

        {/* Current Stats */}
        <Card className="p-4 bg-secondary/50">
          <h3 className="font-semibold mb-3">Current Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-background p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Score
              </div>
              <p className="text-xl font-bold">{currentScore.toLocaleString()}</p>
            </div>
            <div className="bg-background p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coins className="w-4 h-4 text-yellow-400" />
                Coins
              </div>
              <p className="text-xl font-bold">{currentCoins.toLocaleString()}</p>
            </div>
            <div className="bg-background p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Gem className="w-4 h-4 text-purple-500" />
                Gems
              </div>
              <p className="text-xl font-bold">{currentGems.toLocaleString()}</p>
            </div>
            <div className="bg-background p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Crown className="w-4 h-4 text-amber-500" />
                Gold
              </div>
              <p className="text-xl font-bold">{currentGold.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-4 bg-red-500/10 border-red-500/30">
          <h3 className="font-semibold mb-3 text-red-500">⚡ Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="destructive" 
              className="gap-2"
              onClick={maxOutEverything}
            >
              <Zap className="w-4 h-4" />
              MAX ALL
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 border-red-500 text-red-500"
              onClick={unlockAllWeapons}
            >
              🔫 All Weapons
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => addScore(10000)}
            >
              +10K Score
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => addScore(100000)}
            >
              +100K Score
            </Button>
          </div>
        </Card>

        {/* Score Management */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Score Management
          </h3>
          <div className="flex gap-2">
            <Input
              type="number"
              value={newScore}
              onChange={(e) => setNewScore(e.target.value)}
              placeholder="Enter new score..."
              className="flex-1"
            />
            <Button onClick={setScore}>Set Score</Button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => addScore(1000)}>+1K</Button>
            <Button variant="outline" size="sm" onClick={() => addScore(5000)}>+5K</Button>
            <Button variant="outline" size="sm" onClick={() => addScore(25000)}>+25K</Button>
            <Button variant="outline" size="sm" onClick={() => addScore(50000)}>+50K</Button>
          </div>
        </Card>

        {/* Currency Management */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              Coins
            </h3>
            <div className="flex gap-2">
              <Input
                type="number"
                value={newCoins}
                onChange={(e) => setNewCoins(e.target.value)}
                placeholder="Amount..."
              />
              <Button onClick={() => setCurrency("coins", newCoins)}>Set</Button>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Gem className="w-5 h-5 text-purple-500" />
              Gems
            </h3>
            <div className="flex gap-2">
              <Input
                type="number"
                value={newGems}
                onChange={(e) => setNewGems(e.target.value)}
                placeholder="Amount..."
              />
              <Button onClick={() => setCurrency("gems", newGems)}>Set</Button>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Gold
            </h3>
            <div className="flex gap-2">
              <Input
                type="number"
                value={newGold}
                onChange={(e) => setNewGold(e.target.value)}
                placeholder="Amount..."
              />
              <Button onClick={() => setCurrency("gold", newGold)}>Set</Button>
            </div>
          </Card>
        </div>

        {/* Game Cheats */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            In-Game Cheats
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            These settings will apply when you start a game. Use commands in-game for instant effects.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Godmode</span>
              </div>
              <Switch checked={godmodeEnabled} onCheckedChange={setGodmodeEnabled} />
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span>Infinite Ammo</span>
              </div>
              <Switch checked={infiniteAmmo} onCheckedChange={setInfiniteAmmo} />
            </div>
          </div>
          <div className="mt-4 p-3 bg-secondary/50 rounded-lg">
            <Label className="flex items-center gap-2 mb-2">
              Speed Multiplier: {speedMultiplier[0]}x
            </Label>
            <Slider
              value={speedMultiplier}
              onValueChange={setSpeedMultiplier}
              min={1}
              max={5}
              step={0.5}
            />
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          ⚠️ Use cheats responsibly. Changes are permanent and may affect your gameplay experience.
        </p>
      </div>
    </div>
  );
};

export default Hacks;
