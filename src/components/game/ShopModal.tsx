import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Zap, Heart, Coins, Gem, Star, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShopItem {
  id: string;
  item_type: string;
  item_id: string;
  name: string;
  description: string | null;
  price_coins: number;
  price_gems: number;
  price_gold: number;
}

interface Currencies {
  coins: number;
  gems: number;
  gold: number;
}

export const ShopModal = ({ open, onOpenChange }: ShopModalProps) => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [ownedItems, setOwnedItems] = useState<Set<string>>(new Set());
  const [currencies, setCurrencies] = useState<Currencies>({ coins: 0, gems: 0, gold: 0 });
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

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

      // Load shop items
      const { data: shopItems } = await supabase
        .from("shop_items")
        .select("*")
        .eq("is_active", true);

      if (shopItems) setItems(shopItems);

      // Load owned items
      const { data: inventory } = await supabase
        .from("player_inventory")
        .select("item_id")
        .eq("user_id", user.id);

      if (inventory) {
        setOwnedItems(new Set(inventory.map(i => i.item_id)));
      }

      // Load currencies
      const { data: currData } = await supabase
        .from("player_currencies")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (currData) {
        setCurrencies({ coins: currData.coins, gems: currData.gems, gold: currData.gold });
      }
    } catch (error) {
      console.error("Error loading shop data:", error);
    } finally {
      setLoading(false);
    }
  };

  const purchaseItem = async (item: ShopItem) => {
    if (ownedItems.has(item.item_id) && item.item_type === "power") {
      toast.error("You already own this power!");
      return;
    }

    // Check if can afford
    if (item.price_coins > 0 && currencies.coins < item.price_coins) {
      toast.error("Not enough coins!");
      return;
    }
    if (item.price_gems > 0 && currencies.gems < item.price_gems) {
      toast.error("Not enough gems!");
      return;
    }
    if (item.price_gold > 0 && currencies.gold < item.price_gold) {
      toast.error("Not enough gold!");
      return;
    }

    setPurchasing(item.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Deduct currencies
      const newCurrencies = {
        coins: currencies.coins - item.price_coins,
        gems: currencies.gems - item.price_gems,
        gold: currencies.gold - item.price_gold,
      };

      await supabase
        .from("player_currencies")
        .update(newCurrencies)
        .eq("user_id", user.id);

      // Add to inventory (or increase quantity for health packs)
      if (item.item_type === "health_pack" && ownedItems.has(item.item_id)) {
        // Increase quantity
        const { data: existing } = await supabase
          .from("player_inventory")
          .select("quantity")
          .eq("user_id", user.id)
          .eq("item_id", item.item_id)
          .single();

        if (existing) {
          await supabase
            .from("player_inventory")
            .update({ quantity: existing.quantity + 1 })
            .eq("user_id", user.id)
            .eq("item_id", item.item_id);
        }
      } else {
        await supabase.from("player_inventory").insert({
          user_id: user.id,
          item_type: item.item_type,
          item_id: item.item_id,
          quantity: 1,
          is_equipped: false,
        });
      }

      setCurrencies(newCurrencies);
      setOwnedItems(prev => new Set([...prev, item.item_id]));
      toast.success(`Purchased ${item.name}!`);
    } catch (error) {
      console.error("Error purchasing item:", error);
      toast.error("Failed to purchase item");
    } finally {
      setPurchasing(null);
    }
  };

  const powers = items.filter(item => item.item_type === "power");
  const healthPacks = items.filter(item => item.item_type === "health_pack");

  const getPrice = (item: ShopItem) => {
    if (item.price_coins > 0) return { amount: item.price_coins, type: "coins" as const };
    if (item.price_gems > 0) return { amount: item.price_gems, type: "gems" as const };
    if (item.price_gold > 0) return { amount: item.price_gold, type: "gold" as const };
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            Item Shop
          </DialogTitle>
          <DialogDescription>
            Buy powers and health packs
          </DialogDescription>
        </DialogHeader>

        {/* Currency display */}
        <div className="flex gap-4 justify-center py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            <span className="font-bold">{currencies.coins}</span>
          </div>
          <div className="flex items-center gap-2">
            <Gem className="w-5 h-5 text-purple-400" />
            <span className="font-bold">{currencies.gems}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            <span className="font-bold">{currencies.gold}</span>
          </div>
        </div>

        <Tabs defaultValue="powers" className="flex-1">
          <TabsList className="w-full">
            <TabsTrigger value="powers" className="flex-1 gap-1">
              <Zap className="w-4 h-4" />
              Powers
            </TabsTrigger>
            <TabsTrigger value="health" className="flex-1 gap-1">
              <Heart className="w-4 h-4" />
              Health Packs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="powers" className="mt-4">
            <ScrollArea className="h-[350px]">
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
                  {powers.map(item => {
                    const owned = ownedItems.has(item.item_id);
                    const price = getPrice(item);

                    return (
                      <Card key={item.id} className={`p-4 ${owned ? "opacity-75" : ""}`}>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                              <Zap className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{item.name}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          {owned ? (
                            <Badge variant="secondary" className="w-fit gap-1">
                              <Check className="w-3 h-3" /> Owned
                            </Badge>
                          ) : price && (
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => purchaseItem(item)}
                              disabled={purchasing === item.id}
                            >
                              {purchasing === item.id ? "Purchasing..." : (
                                <>
                                  {price.type === "coins" && <Coins className="w-4 h-4 mr-1 text-yellow-400" />}
                                  {price.type === "gems" && <Gem className="w-4 h-4 mr-1 text-purple-400" />}
                                  {price.type === "gold" && <Star className="w-4 h-4 mr-1 text-amber-400" />}
                                  {price.amount}
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="health" className="mt-4">
            <ScrollArea className="h-[350px]">
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
                  {healthPacks.map(item => {
                    const price = getPrice(item);

                    return (
                      <Card key={item.id} className="p-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                              <Heart className="w-6 h-6 text-red-500" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{item.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          {price && (
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => purchaseItem(item)}
                              disabled={purchasing === item.id}
                            >
                              {purchasing === item.id ? "Purchasing..." : (
                                <>
                                  {price.type === "coins" && <Coins className="w-4 h-4 mr-1 text-yellow-400" />}
                                  {price.type === "gems" && <Gem className="w-4 h-4 mr-1 text-purple-400" />}
                                  {price.type === "gold" && <Star className="w-4 h-4 mr-1 text-amber-400" />}
                                  {price.amount}
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
