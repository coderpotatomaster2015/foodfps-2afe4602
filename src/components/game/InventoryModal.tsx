import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Backpack, Zap, Heart, Swords, Check, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEquipPower?: (power: string | null) => void;
}

interface InventoryItem {
  id: string;
  item_type: string;
  item_id: string;
  quantity: number;
  is_equipped: boolean;
}

const POWER_DESCRIPTIONS: Record<string, string> = {
  teleport: "Press SHIFT to teleport forward (3s cooldown)",
  double_damage: "Deal 2x damage with all weapons",
  speed: "30% movement speed increase",
  shield: "Start with 125 HP instead of 100",
  slow_motion: "Enemies move 50% slower near you",
  invisibility: "Enemies have reduced accuracy targeting you",
};

const HEALTH_PACK_VALUES: Record<string, number> = {
  small_health: 25,
  medium_health: 50,
  large_health: 100,
};

export const InventoryModal = ({ open, onOpenChange, onEquipPower }: InventoryModalProps) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [equippedPower, setEquippedPower] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadInventory();
    }
  }, [open]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("player_inventory")
        .select("*")
        .eq("user_id", user.id);

      if (data) {
        setInventory(data);
        const equipped = data.find(item => item.item_type === "power" && item.is_equipped);
        if (equipped) {
          setEquippedPower(equipped.item_id);
        }
      }
    } catch (error) {
      console.error("Error loading inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const equipPower = async (itemId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Unequip all powers first
      await supabase
        .from("player_inventory")
        .update({ is_equipped: false })
        .eq("user_id", user.id)
        .eq("item_type", "power");

      // Equip selected power
      await supabase
        .from("player_inventory")
        .update({ is_equipped: true })
        .eq("user_id", user.id)
        .eq("item_id", itemId);

      setEquippedPower(itemId);
      setInventory(prev => prev.map(item => ({
        ...item,
        is_equipped: item.item_type === "power" && item.item_id === itemId
      })));

      // Save to localStorage for game use
      localStorage.setItem("equippedPower", itemId);
      onEquipPower?.(itemId);
      toast.success(`Equipped ${itemId.replace(/_/g, " ")}!`);
    } catch (error) {
      console.error("Error equipping power:", error);
      toast.error("Failed to equip power");
    }
  };

  const unequipPower = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("player_inventory")
        .update({ is_equipped: false })
        .eq("user_id", user.id)
        .eq("item_type", "power");

      setEquippedPower(null);
      setInventory(prev => prev.map(item => ({
        ...item,
        is_equipped: item.item_type === "power" ? false : item.is_equipped
      })));

      localStorage.removeItem("equippedPower");
      onEquipPower?.(null);
      toast.success("Power unequipped");
    } catch (error) {
      console.error("Error unequipping power:", error);
    }
  };

  const useHealthPack = async (itemId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const item = inventory.find(i => i.item_id === itemId);
      if (!item || item.quantity <= 0) {
        toast.error("No health packs available!");
        return;
      }

      // Store in localStorage for game to use
      const pendingHealthPacks = JSON.parse(localStorage.getItem("pendingHealthPacks") || "[]");
      pendingHealthPacks.push({ itemId, healAmount: HEALTH_PACK_VALUES[itemId] });
      localStorage.setItem("pendingHealthPacks", JSON.stringify(pendingHealthPacks));

      // Reduce quantity
      if (item.quantity <= 1) {
        await supabase
          .from("player_inventory")
          .delete()
          .eq("user_id", user.id)
          .eq("item_id", itemId);
      } else {
        await supabase
          .from("player_inventory")
          .update({ quantity: item.quantity - 1 })
          .eq("user_id", user.id)
          .eq("item_id", itemId);
      }

      setInventory(prev => {
        const updated = prev.map(i => {
          if (i.item_id === itemId) {
            return { ...i, quantity: i.quantity - 1 };
          }
          return i;
        }).filter(i => i.quantity > 0);
        return updated;
      });

      toast.success(`Health pack queued! Will restore ${HEALTH_PACK_VALUES[itemId]} HP in game.`);
    } catch (error) {
      console.error("Error using health pack:", error);
      toast.error("Failed to use health pack");
    }
  };

  const powers = inventory.filter(item => item.item_type === "power");
  const healthPacks = inventory.filter(item => item.item_type === "health_pack");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Backpack className="w-5 h-5 text-primary" />
            Inventory
          </DialogTitle>
          <DialogDescription>
            Manage your powers and items
          </DialogDescription>
        </DialogHeader>

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
            <ScrollArea className="h-[300px]">
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : powers.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No powers owned</p>
                  <p className="text-xs mt-1">Buy powers from the Shop!</p>
                </div>
              ) : (
                <div className="space-y-3 p-1">
                  {powers.map(item => (
                    <Card key={item.id} className={`p-4 ${item.is_equipped ? "ring-2 ring-primary" : ""}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium capitalize">{item.item_id.replace(/_/g, " ")}</h4>
                            <p className="text-xs text-muted-foreground">
                              {POWER_DESCRIPTIONS[item.item_id]}
                            </p>
                          </div>
                        </div>
                        {item.is_equipped ? (
                          <Button size="sm" variant="outline" onClick={unequipPower}>
                            <Check className="w-4 h-4 mr-1" /> Equipped
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => equipPower(item.item_id)}>
                            Equip
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="health" className="mt-4">
            <ScrollArea className="h-[300px]">
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : healthPacks.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Heart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No health packs owned</p>
                  <p className="text-xs mt-1">Buy health packs from the Shop!</p>
                </div>
              ) : (
                <div className="space-y-3 p-1">
                  {healthPacks.map(item => (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                            <Heart className="w-5 h-5 text-red-500" />
                          </div>
                          <div>
                            <h4 className="font-medium capitalize">{item.item_id.replace(/_/g, " ")}</h4>
                            <p className="text-xs text-muted-foreground">
                              Restores {HEALTH_PACK_VALUES[item.item_id]} HP
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">x{item.quantity}</Badge>
                          <Button size="sm" onClick={() => useHealthPack(item.item_id)}>
                            Use
                          </Button>
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
