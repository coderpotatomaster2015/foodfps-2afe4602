import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Snowflake, Sun, Leaf, Candy, Heart, Sparkles, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PreMadeUpdate {
  id: string;
  name: string;
  description: string;
  summary: string;
  icon: React.ReactNode;
  season: string;
  features: string[];
  skinColors: string[];
  uiTheme: { primary: string; accent: string };
}

const PRE_MADE_UPDATES: PreMadeUpdate[] = [
  {
    id: "snow_update",
    name: "❄️ Snow Season Update",
    description: "Winter wonderland theme with snowy visuals, ice-themed skins, and holiday rewards!",
    summary: "Celebrate winter with exclusive snow skins, ice weapons, and festive rewards.",
    icon: <Snowflake className="w-6 h-6 text-cyan-400" />,
    season: "Winter",
    features: [
      "3 new ice-themed player skins",
      "Snowflake particle effects",
      "Frozen weapon variants",
      "Winter daily rewards",
      "Blue & white UI theme"
    ],
    skinColors: ["#A8D8EA", "#E8F4F8", "#87CEEB"],
    uiTheme: { primary: "195 100% 70%", accent: "180 100% 80%" }
  },
  {
    id: "summer_update",
    name: "☀️ Summer Beach Update",
    description: "Beach party vibes with tropical themes, sunny colors, and vacation rewards!",
    summary: "Hit the beach with tropical skins, beach weapons, and summer fun!",
    icon: <Sun className="w-6 h-6 text-yellow-400" />,
    season: "Summer",
    features: [
      "3 new tropical player skins",
      "Sun ray visual effects",
      "Beach weapon variants",
      "Summer daily rewards",
      "Orange & yellow UI theme"
    ],
    skinColors: ["#FFD93D", "#FF6B35", "#F4A460"],
    uiTheme: { primary: "45 100% 60%", accent: "25 100% 55%" }
  },
  {
    id: "fall_update",
    name: "🍂 Fall Harvest Update",
    description: "Autumn leaves, harvest themes, and cozy fall vibes with warm colors!",
    summary: "Experience autumn with harvest skins, leaf effects, and fall rewards.",
    icon: <Leaf className="w-6 h-6 text-orange-500" />,
    season: "Fall",
    features: [
      "3 new harvest player skins",
      "Falling leaves effects",
      "Autumn weapon variants",
      "Fall daily rewards",
      "Orange & brown UI theme"
    ],
    skinColors: ["#D2691E", "#CD853F", "#8B4513"],
    uiTheme: { primary: "25 80% 45%", accent: "15 70% 35%" }
  },
  {
    id: "halloween_update",
    name: "🎃 Halloween Update",
    description: "Spooky season with scary skins, ghost effects, and terrifying rewards!",
    summary: "Get spooky with Halloween skins, ghost weapons, and scary rewards!",
    icon: <Candy className="w-6 h-6 text-orange-400" />,
    season: "Halloween",
    features: [
      "3 new spooky player skins",
      "Ghost particle effects",
      "Haunted weapon variants",
      "Halloween daily rewards",
      "Purple & orange UI theme"
    ],
    skinColors: ["#4B0082", "#FF6600", "#2F4F4F"],
    uiTheme: { primary: "275 100% 25%", accent: "25 100% 50%" }
  },
  {
    id: "valentine_update",
    name: "💕 Valentine's Update",
    description: "Love is in the air with heart themes, romantic colors, and sweet rewards!",
    summary: "Spread love with Valentine skins, heart effects, and romantic rewards!",
    icon: <Heart className="w-6 h-6 text-pink-500" />,
    season: "Valentine",
    features: [
      "3 new romantic player skins",
      "Heart particle effects",
      "Cupid weapon variants",
      "Valentine daily rewards",
      "Pink & red UI theme"
    ],
    skinColors: ["#FF69B4", "#FF1493", "#DC143C"],
    uiTheme: { primary: "340 100% 65%", accent: "350 100% 60%" }
  },
  {
    id: "neon_update",
    name: "🌟 Neon Nights Update",
    description: "Cyberpunk vibes with glowing neon colors, futuristic themes, and high-tech rewards!",
    summary: "Enter the future with neon skins, cyber effects, and tech rewards!",
    icon: <Sparkles className="w-6 h-6 text-purple-400" />,
    season: "Neon",
    features: [
      "3 new neon player skins",
      "Glowing trail effects",
      "Cyber weapon variants",
      "Tech daily rewards",
      "Purple & cyan UI theme"
    ],
    skinColors: ["#FF00FF", "#00FFFF", "#FF1493"],
    uiTheme: { primary: "300 100% 50%", accent: "180 100% 50%" }
  }
];

export const PreMadeUpdatesPanel = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [activatedUpdates, setActivatedUpdates] = useState<Set<string>>(new Set());

  const activateUpdate = async (update: PreMadeUpdate) => {
    setLoading(update.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // Create the game update entry
      const { error: updateError } = await supabase.from("game_updates").insert({
        name: update.name,
        description: update.description,
        summary: update.summary,
        is_released: true,
        is_beta: false,
        is_seasonal: true,
        season: update.season,
        created_by: user.id,
        released_at: new Date().toISOString(),
      });

      if (updateError) throw updateError;

      // Create seasonal skins
      for (let i = 0; i < update.skinColors.length; i++) {
        const skinName = `${update.season} Skin ${i + 1}`;
        await supabase.from("player_skins").insert({
          name: skinName,
          color: update.skinColors[i],
          is_seasonal: true,
          season: update.season,
          price_coins: 100 * (i + 1),
          price_gems: 0,
          price_gold: 0,
        });
      }

      // Update UI theme in localStorage (for immediate preview)
      localStorage.setItem("foodfps_theme_primary", update.uiTheme.primary);
      localStorage.setItem("foodfps_theme_accent", update.uiTheme.accent);
      
      // Apply theme to document
      document.documentElement.style.setProperty("--primary", update.uiTheme.primary);
      document.documentElement.style.setProperty("--accent", update.uiTheme.accent);

      setActivatedUpdates(prev => new Set([...prev, update.id]));
      toast.success(`${update.name} activated!`);
    } catch (error) {
      console.error("Error activating update:", error);
      toast.error("Failed to activate update");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pre-made seasonal updates ready to deploy. Click to activate and add content to your game!
      </p>
      
      <ScrollArea className="h-[500px]">
        <div className="space-y-3 pr-4">
          {PRE_MADE_UPDATES.map((update) => {
            const isActivated = activatedUpdates.has(update.id);
            const isLoading = loading === update.id;

            return (
              <Card key={update.id} className={`p-4 space-y-3 ${isActivated ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {update.icon}
                    <div>
                      <h4 className="font-semibold">{update.name}</h4>
                      <Badge variant="outline" className="text-xs mt-1">
                        {update.season}
                      </Badge>
                    </div>
                  </div>
                  {isActivated ? (
                    <Badge className="bg-green-600">
                      <Check className="w-3 h-3 mr-1" />
                      Activated
                    </Badge>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => activateUpdate(update)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : null}
                      {isLoading ? "Activating..." : "Deploy"}
                    </Button>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  {update.description}
                </p>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Features:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {update.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <span className="text-primary">•</span> {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Preview:</span>
                  {update.skinColors.map((color, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full border border-border"
                      style={{ backgroundColor: color }}
                      title={`Skin color ${i + 1}`}
                    />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
