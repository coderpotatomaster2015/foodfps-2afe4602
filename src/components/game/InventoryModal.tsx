import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Backpack, Zap, Heart, Swords, Check, Package, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEquipPower?: (power: string | null) => void;
  onEquipWeapons?: (weapons: string[]) => void;
}

interface InventoryItem {
  id: string;
  item_type: string;
  item_id: string;
  quantity: number;
  is_equipped: boolean;
}

interface LoadoutSlots {
  slot_1: string | null;
  slot_2: string | null;
  slot_3: string | null;
  slot_4: string | null;
  slot_5: string | null;
  equipped_power: string | null;
}

const POWER_DESCRIPTIONS: Record<string, string> = {
  teleport: "Press SHIFT to teleport forward (3s cooldown)",
  double_damage: "Deal 2x damage with all weapons",
  speed: "30% movement speed increase",
  shield: "Start with 125 HP instead of 100",
  slow_motion: "Enemies move 50% slower near you",
  invisibility: "Enemies have reduced accuracy targeting you",
};

const WEAPON_DESCRIPTIONS: Record<string, string> = {
  pistol: "Standard sidearm - 40 damage, moderate fire rate",
  shotgun: "Spread shot - 25 damage per pellet, 5 pellets",
  sword: "Melee weapon - 80 damage, fast attacks",
  rifle: "Automatic - 35 damage, accurate",
  sniper: "Precision - 120 damage, slow fire rate",
  smg: "Rapid fire - 25 damage, very fast",
  knife: "Quick melee - 50 damage",
  rpg: "Explosive - 200 damage, slow reload",
  axe: "Heavy melee - 100 damage",
  flamethrower: "Continuous fire - 15 damage per hit",
  minigun: "Very fast - 20 damage, high ammo",
  railgun: "Ultimate precision - 250 damage",
};

const HEALTH_PACK_VALUES: Record<string, number> = {
  small_health: 25,
  medium_health: 50,
  large_health: 100,
};

const SLOT_NAMES = ["Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5"];

export const InventoryModal = ({ open, onOpenChange, onEquipPower, onEquipWeapons }: InventoryModalProps) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadout, setLoadout] = useState<LoadoutSlots>({
    slot_1: "pistol",
    slot_2: null,
    slot_3: null,
    slot_4: null,
    slot_5: null,
    equipped_power: null,
  });
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [equippedHealthPacks, setEquippedHealthPacks] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadInventory();
      loadLoadout();
      loadEquippedHealthPacks();
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
      }
    } catch (error) {
      console.error("Error loading inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLoadout = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("equipped_loadout")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setLoadout({
          slot_1: data.slot_1 || "pistol",
          slot_2: data.slot_2,
          slot_3: data.slot_3,
          slot_4: data.slot_4,
          slot_5: data.slot_5,
          equipped_power: data.equipped_power,
        });
      } else {
        // Create default loadout
        await supabase.from("equipped_loadout").insert({
          user_id: user.id,
          slot_1: "pistol",
        });
      }
    } catch (error) {
      console.error("Error loading loadout:", error);
    }
  };

  const loadEquippedHealthPacks = () => {
    const saved = localStorage.getItem("equippedHealthPacks");
    if (saved) {
      try {
        setEquippedHealthPacks(JSON.parse(saved));
      } catch {
        setEquippedHealthPacks([]);
      }
    }
  };

  const saveLoadout = async (newLoadout: LoadoutSlots) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("equipped_loadout")
        .upsert({
          user_id: user.id,
          ...newLoadout,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        console.error("Error saving loadout to DB:", error);
        toast.error("Failed to save loadout");
        return;
      }

      // Update localStorage for game use
      const equippedWeapons = [
        newLoadout.slot_1,
        newLoadout.slot_2,
        newLoadout.slot_3,
        newLoadout.slot_4,
        newLoadout.slot_5,
      ].filter(Boolean) as string[];

      localStorage.setItem("equippedWeapons", JSON.stringify(equippedWeapons));
      onEquipWeapons?.(equippedWeapons);

      if (newLoadout.equipped_power) {
        localStorage.setItem("equippedPower", newLoadout.equipped_power);
        onEquipPower?.(newLoadout.equipped_power);
      } else {
        localStorage.removeItem("equippedPower");
        onEquipPower?.(null);
      }
    } catch (error) {
      console.error("Error saving loadout:", error);
    }
  };

  const equipWeaponToSlot = async (weaponId: string, slotIndex: number) => {
    const slotKey = `slot_${slotIndex + 1}` as keyof LoadoutSlots;
    
    // Check if weapon is already equipped in another slot
    const existingSlot = Object.entries(loadout).find(
      ([key, value]) => key.startsWith("slot_") && value === weaponId
    );
    
    const newLoadout = { ...loadout };
    
    // If weapon is in another slot, swap
    if (existingSlot) {
      const oldSlotKey = existingSlot[0] as keyof LoadoutSlots;
      (newLoadout as any)[oldSlotKey] = loadout[slotKey];
    }
    
    (newLoadout as any)[slotKey] = weaponId;
    setLoadout(newLoadout);
    await saveLoadout(newLoadout);
    setSelectedSlot(null);
    toast.success(`${weaponId} equipped to ${SLOT_NAMES[slotIndex]}!`);
  };

  const clearSlot = async (slotIndex: number) => {
    // Slot 1 always has pistol
    if (slotIndex === 0) {
      toast.error("Slot 1 cannot be empty (pistol required)");
      return;
    }

    const slotKey = `slot_${slotIndex + 1}` as keyof LoadoutSlots;
    const newLoadout = { ...loadout, [slotKey]: null };
    setLoadout(newLoadout);
    await saveLoadout(newLoadout);
    toast.success(`${SLOT_NAMES[slotIndex]} cleared`);
  };

  const equipPower = async (powerId: string) => {
    const newLoadout = { ...loadout, equipped_power: powerId };
    setLoadout(newLoadout);
    await saveLoadout(newLoadout);
    toast.success(`${powerId.replace(/_/g, " ")} equipped!`);
  };

  const unequipPower = async () => {
    const newLoadout = { ...loadout, equipped_power: null };
    setLoadout(newLoadout);
    await saveLoadout(newLoadout);
    toast.success("Power unequipped");
  };

  const toggleHealthPackEquipped = (itemId: string) => {
    const newEquipped = equippedHealthPacks.includes(itemId)
      ? equippedHealthPacks.filter(id => id !== itemId)
      : [...equippedHealthPacks, itemId];
    
    setEquippedHealthPacks(newEquipped);
    localStorage.setItem("equippedHealthPacks", JSON.stringify(newEquipped));
    
    toast.success(
      equippedHealthPacks.includes(itemId) 
        ? `${itemId.replace(/_/g, " ")} unequipped` 
        : `${itemId.replace(/_/g, " ")} equipped - Press H in game to use`
    );
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

  const weapons = inventory.filter(item => item.item_type === "weapon");
  const powers = inventory.filter(item => item.item_type === "power");
  const healthPacks = inventory.filter(item => item.item_type === "health_pack");

  // Get available weapons (owned + pistol)
  const availableWeapons = ["pistol", ...weapons.map(w => w.item_id)];

  const getSlotWeapon = (slotIndex: number): string | null => {
    const slotKey = `slot_${slotIndex + 1}` as keyof LoadoutSlots;
    return loadout[slotKey] as string | null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Backpack className="w-5 h-5 text-primary" />
            Inventory & Loadout
          </DialogTitle>
          <DialogDescription>
            Equip weapons to slots, manage powers, and use health packs
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="loadout" className="flex-1">
          <TabsList className="w-full">
            <TabsTrigger value="loadout" className="flex-1 gap-1">
              <Swords className="w-4 h-4" />
              Weapon Slots
            </TabsTrigger>
            <TabsTrigger value="powers" className="flex-1 gap-1">
              <Zap className="w-4 h-4" />
              Powers
            </TabsTrigger>
            <TabsTrigger value="health" className="flex-1 gap-1">
              <Heart className="w-4 h-4" />
              Health Packs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="loadout" className="mt-4 space-y-4">
            {/* Weapon Slots */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Weapon Loadout (5 Slots)</h3>
              <p className="text-xs text-muted-foreground">Press 1-5 in game to switch weapons</p>
              <div className="grid grid-cols-5 gap-2">
                {SLOT_NAMES.map((name, index) => {
                  const weapon = getSlotWeapon(index);
                  const isSelected = selectedSlot === index;
                  
                  return (
                    <Card
                      key={index}
                      className={`p-3 cursor-pointer transition-all hover:scale-105 ${
                        isSelected ? "ring-2 ring-primary" : ""
                      } ${weapon ? "bg-primary/10" : "bg-muted/50"}`}
                      onClick={() => setSelectedSlot(isSelected ? null : index)}
                    >
                      <div className="flex flex-col items-center gap-2 text-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          weapon ? "bg-orange-500/20" : "bg-muted"
                        }`}>
                          {weapon ? (
                            <Swords className="w-5 h-5 text-orange-500" />
                          ) : (
                            <Plus className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="text-xs font-medium">{name}</div>
                        <div className="text-xs text-muted-foreground capitalize truncate w-full">
                          {weapon || "Empty"}
                        </div>
                        {weapon && index > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearSlot(index);
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Weapon Selection */}
            {selectedSlot !== null && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Select weapon for {SLOT_NAMES[selectedSlot]}</h3>
                <ScrollArea className="h-[200px]">
                  <div className="grid grid-cols-3 gap-2 p-1">
                    {availableWeapons.map(weaponId => (
                      <Card
                        key={weaponId}
                        className="p-3 cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => equipWeaponToSlot(weaponId, selectedSlot)}
                      >
                        <div className="flex items-center gap-2">
                          <Swords className="w-4 h-4 text-orange-500" />
                          <div>
                            <p className="text-sm font-medium capitalize">{weaponId}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {WEAPON_DESCRIPTIONS[weaponId]?.split(" - ")[0] || "Weapon"}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Owned Weapons Info */}
            <div className="text-xs text-muted-foreground">
              <p>Owned weapons: Pistol (default){weapons.length > 0 ? `, ${weapons.map(w => w.item_id).join(", ")}` : ""}</p>
              <p className="mt-1">Buy more weapons from the Shop!</p>
            </div>
          </TabsContent>

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
                    <Card key={item.id} className={`p-4 ${loadout.equipped_power === item.item_id ? "ring-2 ring-primary" : ""}`}>
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
                        {loadout.equipped_power === item.item_id ? (
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
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                <strong>Tip:</strong> Equip health packs and press H in game to heal!
              </div>
              
              <ScrollArea className="h-[280px]">
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
                    {healthPacks.map(item => {
                      const isEquipped = equippedHealthPacks.includes(item.item_id);
                      return (
                        <Card key={item.id} className={`p-4 ${isEquipped ? "ring-2 ring-red-500" : ""}`}>
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
                              <Button 
                                size="sm" 
                                variant={isEquipped ? "outline" : "secondary"}
                                onClick={() => toggleHealthPackEquipped(item.item_id)}
                              >
                                {isEquipped ? <Check className="w-4 h-4 mr-1" /> : null}
                                {isEquipped ? "Equipped" : "Equip"}
                              </Button>
                              <Button size="sm" onClick={() => useHealthPack(item.item_id)}>
                                Use Now
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
