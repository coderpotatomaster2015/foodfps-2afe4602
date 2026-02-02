import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Swords, Plus, Trash2, Save, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CustomWeapon {
  id: string;
  name: string;
  damage: number;
  fire_rate: number;
  ammo: number;
  spread: number;
  bullet_speed: number;
  color: string;
  is_melee: boolean;
  game_mode: string | null;
  price_coins: number;
  price_gems: number;
  created_at: string;
}

export const WeaponEditorPanel = () => {
  const [weapons, setWeapons] = useState<CustomWeapon[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingWeapon, setEditingWeapon] = useState<CustomWeapon | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [damage, setDamage] = useState("50");
  const [fireRate, setFireRate] = useState("0.2");
  const [ammoCount, setAmmoCount] = useState("30");
  const [spread, setSpread] = useState("5");
  const [bulletSpeed, setBulletSpeed] = useState("400");
  const [color, setColor] = useState("#FFB84D");
  const [isMelee, setIsMelee] = useState(false);
  const [gameMode, setGameMode] = useState<string>("all");
  const [priceCoins, setPriceCoins] = useState("100");
  const [priceGems, setPriceGems] = useState("0");

  useEffect(() => {
    loadWeapons();
  }, []);

  const loadWeapons = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("shop_items")
        .select("*")
        .eq("item_type", "weapon")
        .order("created_at", { ascending: false });

      if (data) {
        // Transform shop_items to weapon format
        const weaponItems = data.map(item => ({
          id: item.id,
          name: item.name,
          damage: 50,
          fire_rate: 0.2,
          ammo: 30,
          spread: 5,
          bullet_speed: 400,
          color: "#FFB84D",
          is_melee: false,
          game_mode: null,
          price_coins: item.price_coins,
          price_gems: item.price_gems,
          created_at: item.created_at,
        }));
        setWeapons(weaponItems);
      }
    } catch (error) {
      console.error("Error loading weapons:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDamage("50");
    setFireRate("0.2");
    setAmmoCount("30");
    setSpread("5");
    setBulletSpeed("400");
    setColor("#FFB84D");
    setIsMelee(false);
    setGameMode("all");
    setPriceCoins("100");
    setPriceGems("0");
    setEditingWeapon(null);
  };

  const saveWeapon = async () => {
    if (!name.trim()) {
      toast.error("Please enter a weapon name");
      return;
    }

    setLoading(true);
    try {
      const weaponData = {
        name: name.trim(),
        description: `Custom weapon: ${isMelee ? "Melee" : "Ranged"}, ${damage} damage, ${gameMode === "all" ? "All modes" : gameMode}`,
        item_type: "weapon",
        item_id: `custom_weapon_${Date.now()}`,
        price_coins: parseInt(priceCoins) || 0,
        price_gems: parseInt(priceGems) || 0,
        price_gold: 0,
        is_active: true,
      };

      if (editingWeapon) {
        const { error } = await supabase
          .from("shop_items")
          .update(weaponData)
          .eq("id", editingWeapon.id);

        if (error) throw error;
        toast.success("Weapon updated!");
      } else {
        const { error } = await supabase
          .from("shop_items")
          .insert(weaponData);

        if (error) throw error;
        toast.success("Weapon created!");
      }

      resetForm();
      loadWeapons();
    } catch (error) {
      console.error("Error saving weapon:", error);
      toast.error("Failed to save weapon");
    } finally {
      setLoading(false);
    }
  };

  const deleteWeapon = async (id: string) => {
    try {
      const { error } = await supabase
        .from("shop_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Weapon deleted!");
      loadWeapons();
    } catch (error) {
      console.error("Error deleting weapon:", error);
      toast.error("Failed to delete weapon");
    }
  };

  const editWeapon = (weapon: CustomWeapon) => {
    setEditingWeapon(weapon);
    setName(weapon.name);
    setDamage(weapon.damage.toString());
    setFireRate(weapon.fire_rate.toString());
    setAmmoCount(weapon.ammo.toString());
    setSpread(weapon.spread.toString());
    setBulletSpeed(weapon.bullet_speed.toString());
    setColor(weapon.color);
    setIsMelee(weapon.is_melee);
    setGameMode(weapon.game_mode || "all");
    setPriceCoins(weapon.price_coins.toString());
    setPriceGems(weapon.price_gems.toString());
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Swords className="w-4 h-4 text-primary" />
          {editingWeapon ? "Edit Weapon" : "Create New Weapon"}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Weapon Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Thunder Blaster"
            />
          </div>

          <div>
            <Label>Damage</Label>
            <Input
              type="number"
              value={damage}
              onChange={(e) => setDamage(e.target.value)}
              min="1"
              max="500"
            />
          </div>

          <div>
            <Label>Fire Rate (seconds)</Label>
            <Input
              type="number"
              value={fireRate}
              onChange={(e) => setFireRate(e.target.value)}
              step="0.01"
              min="0.01"
              max="5"
            />
          </div>

          <div>
            <Label>Ammo Count</Label>
            <Input
              type="number"
              value={ammoCount}
              onChange={(e) => setAmmoCount(e.target.value)}
              min="1"
              max="999"
            />
          </div>

          <div>
            <Label>Spread (degrees)</Label>
            <Input
              type="number"
              value={spread}
              onChange={(e) => setSpread(e.target.value)}
              min="0"
              max="90"
            />
          </div>

          <div>
            <Label>Bullet Speed</Label>
            <Input
              type="number"
              value={bulletSpeed}
              onChange={(e) => setBulletSpeed(e.target.value)}
              min="0"
              max="2000"
            />
          </div>

          <div>
            <Label>Bullet Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-10 p-1"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#FFB84D"
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label>Weapon Type</Label>
            <Select value={isMelee ? "melee" : "ranged"} onValueChange={(v) => setIsMelee(v === "melee")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ranged">Ranged</SelectItem>
                <SelectItem value="melee">Melee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Game Mode</Label>
            <Select value={gameMode} onValueChange={setGameMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="solo">Solo Only</SelectItem>
                <SelectItem value="ranked">Ranked Only</SelectItem>
                <SelectItem value="boss">Boss Mode Only</SelectItem>
                <SelectItem value="youvsme">You vs Me Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Price (Coins)</Label>
            <Input
              type="number"
              value={priceCoins}
              onChange={(e) => setPriceCoins(e.target.value)}
              min="0"
            />
          </div>

          <div>
            <Label>Price (Gems)</Label>
            <Input
              type="number"
              value={priceGems}
              onChange={(e) => setPriceGems(e.target.value)}
              min="0"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={saveWeapon} disabled={loading} className="flex-1 gap-2">
            <Save className="w-4 h-4" />
            {editingWeapon ? "Update Weapon" : "Create Weapon"}
          </Button>
          {editingWeapon && (
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Custom Weapons</h3>
        <ScrollArea className="h-[200px]">
          {loading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : weapons.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No custom weapons yet</p>
          ) : (
            <div className="space-y-2">
              {weapons.map((weapon) => (
                <div key={weapon.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: weapon.color }}
                    />
                    <div>
                      <p className="font-medium">{weapon.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {weapon.damage} DMG | {weapon.is_melee ? "Melee" : "Ranged"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => editWeapon(weapon)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteWeapon(weapon.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
};
