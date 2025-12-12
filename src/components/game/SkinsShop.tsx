import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gem, Coins, Star, Check, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SkinsShopProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSkinSelect: (color: string) => void;
  currentSkin: string;
}

interface Skin {
  id: string;
  name: string;
  color: string;
  price_gems: number;
  price_coins: number;
  price_gold: number;
  is_seasonal: boolean;
  season: string | null;
}

interface Currencies {
  gems: number;
  coins: number;
  gold: number;
}

export const SkinsShop = ({ open, onOpenChange, onSkinSelect, currentSkin }: SkinsShopProps) => {
  const [skins, setSkins] = useState<Skin[]>([]);
  const [ownedSkinIds, setOwnedSkinIds] = useState<Set<string>>(new Set());
  const [currencies, setCurrencies] = useState<Currencies>({ gems: 0, coins: 0, gold: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load all skins
      const { data: skinsData } = await supabase
        .from("player_skins")
        .select("*")
        .order("price_gems", { ascending: true });

      if (skinsData) setSkins(skinsData);

      // Load owned skins
      const { data: ownedData } = await supabase
        .from("player_owned_skins")
        .select("skin_id")
        .eq("user_id", user.id);

      const ownedIds = new Set(ownedData?.map(o => o.skin_id) || []);
      
      // Add default skin as owned
      const defaultSkin = skinsData?.find(s => s.name === "Default");
      if (defaultSkin) ownedIds.add(defaultSkin.id);
      
      setOwnedSkinIds(ownedIds);

      // Load currencies
      const { data: currData } = await supabase
        .from("player_currencies")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (currData) {
        setCurrencies({ gems: currData.gems, coins: currData.coins, gold: currData.gold });
      } else {
        // Create currency record
        await supabase.from("player_currencies").insert({ user_id: user.id });
      }
    } catch (error) {
      console.error("Error loading skins:", error);
    } finally {
      setLoading(false);
    }
  };

  const purchaseSkin = async (skin: Skin) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if can afford
      if (skin.price_gems > 0 && currencies.gems < skin.price_gems) {
        toast.error("Not enough gems!");
        return;
      }
      if (skin.price_coins > 0 && currencies.coins < skin.price_coins) {
        toast.error("Not enough coins!");
        return;
      }
      if (skin.price_gold > 0 && currencies.gold < skin.price_gold) {
        toast.error("Not enough gold!");
        return;
      }

      // Deduct currencies
      const newCurrencies = {
        gems: currencies.gems - skin.price_gems,
        coins: currencies.coins - skin.price_coins,
        gold: currencies.gold - skin.price_gold,
      };

      await supabase
        .from("player_currencies")
        .update(newCurrencies)
        .eq("user_id", user.id);

      // Add to owned skins
      await supabase.from("player_owned_skins").insert({
        user_id: user.id,
        skin_id: skin.id,
      });

      setCurrencies(newCurrencies);
      setOwnedSkinIds(prev => new Set([...prev, skin.id]));
      toast.success(`Purchased ${skin.name}!`);
    } catch (error) {
      console.error("Error purchasing skin:", error);
      toast.error("Failed to purchase skin");
    }
  };

  const selectSkin = (skin: Skin) => {
    if (!ownedSkinIds.has(skin.id) && skin.name !== "Default") {
      toast.error("You don't own this skin!");
      return;
    }
    onSkinSelect(skin.color);
    toast.success(`Equipped ${skin.name}!`);
  };

  const getPrice = (skin: Skin) => {
    if (skin.price_gems > 0) return { amount: skin.price_gems, type: "gems" as const };
    if (skin.price_coins > 0) return { amount: skin.price_coins, type: "coins" as const };
    if (skin.price_gold > 0) return { amount: skin.price_gold, type: "gold" as const };
    return null;
  };

  const regularSkins = skins.filter(s => !s.is_seasonal);
  const christmasSkins = skins.filter(s => s.season === "christmas");
  const halloweenSkins = skins.filter(s => s.season === "halloween");
  const thanksgivingSkins = skins.filter(s => s.season === "thanksgiving");

  const renderSkinCard = (skin: Skin) => {
    const owned = ownedSkinIds.has(skin.id) || skin.name === "Default";
    const isSelected = currentSkin === skin.color;
    const price = getPrice(skin);

    return (
      <Card
        key={skin.id}
        className={`p-4 cursor-pointer transition-all hover:scale-105 ${isSelected ? "ring-2 ring-primary" : ""}`}
        onClick={() => owned ? selectSkin(skin) : undefined}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-full border-4 border-border shadow-lg"
            style={{ backgroundColor: skin.color }}
          />
          <span className="font-medium text-sm text-center">{skin.name}</span>
          
          {owned ? (
            <Badge variant={isSelected ? "default" : "secondary"} className="gap-1">
              {isSelected ? <><Check className="w-3 h-3" /> Equipped</> : "Owned"}
            </Badge>
          ) : price ? (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); purchaseSkin(skin); }}>
              {price.type === "gems" && <Gem className="w-3 h-3 mr-1 text-purple-400" />}
              {price.type === "coins" && <Coins className="w-3 h-3 mr-1 text-yellow-400" />}
              {price.type === "gold" && <Star className="w-3 h-3 mr-1 text-amber-400" />}
              {price.amount}
            </Button>
          ) : (
            <Badge variant="outline">Free</Badge>
          )}
        </div>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Skins Shop
          </DialogTitle>
        </DialogHeader>

        {/* Currency display */}
        <div className="flex gap-4 justify-center py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Gem className="w-5 h-5 text-purple-400" />
            <span className="font-bold">{currencies.gems}</span>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            <span className="font-bold">{currencies.coins}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            <span className="font-bold">{currencies.gold}</span>
          </div>
        </div>

        <Tabs defaultValue="regular" className="flex-1 flex flex-col">
          <TabsList className="mx-auto">
            <TabsTrigger value="regular">Regular</TabsTrigger>
            <TabsTrigger value="christmas">🎄 Christmas</TabsTrigger>
            <TabsTrigger value="halloween">🎃 Halloween</TabsTrigger>
            <TabsTrigger value="thanksgiving">🦃 Thanksgiving</TabsTrigger>
          </TabsList>

          <TabsContent value="regular" className="flex-1">
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 p-2">
                {regularSkins.map(renderSkinCard)}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="christmas" className="flex-1">
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 p-2">
                {christmasSkins.map(renderSkinCard)}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="halloween" className="flex-1">
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 p-2">
                {halloweenSkins.map(renderSkinCard)}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="thanksgiving" className="flex-1">
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 p-2">
                {thanksgivingSkins.map(renderSkinCard)}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};