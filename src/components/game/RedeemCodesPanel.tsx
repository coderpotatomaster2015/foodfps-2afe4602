import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, Copy, Trash2, Gift, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RedeemCode {
  id: string;
  code: string;
  reward_type: string;
  reward_value: number;
  skin_id: string | null;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface CustomSkin {
  id: string;
  name: string;
}

export const RedeemCodesPanel = () => {
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [customSkins, setCustomSkins] = useState<CustomSkin[]>([]);
  const [loading, setLoading] = useState(false);

  // Create code form
  const [newCode, setNewCode] = useState("");
  const [rewardType, setRewardType] = useState("coins");
  const [rewardValue, setRewardValue] = useState("");
  const [selectedSkin, setSelectedSkin] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresHours, setExpiresHours] = useState("");

  useEffect(() => {
    loadCodes();
    loadCustomSkins();
  }, []);

  const loadCodes = async () => {
    const { data } = await supabase
      .from("redeem_codes")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setCodes(data);
  };

  const loadCustomSkins = async () => {
    const { data } = await supabase
      .from("custom_skins")
      .select("id, name")
      .eq("is_active", true);
    
    if (data) setCustomSkins(data);
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(code);
  };

  const createCode = async () => {
    if (!newCode.trim()) {
      toast.error("Please enter a code");
      return;
    }

    if (rewardType === "skin" && !selectedSkin) {
      toast.error("Please select a skin");
      return;
    }

    if (rewardType !== "skin" && (!rewardValue || parseInt(rewardValue) <= 0)) {
      toast.error("Please enter a reward value");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const expiresAt = expiresHours 
        ? new Date(Date.now() + parseInt(expiresHours) * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase.from("redeem_codes").insert({
        code: newCode.toUpperCase().trim(),
        reward_type: rewardType,
        reward_value: rewardType === "skin" ? 0 : parseInt(rewardValue),
        skin_id: rewardType === "skin" ? selectedSkin : null,
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt,
        created_by: user.id,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Code already exists");
        } else {
          toast.error("Failed to create code: " + error.message);
        }
        return;
      }

      toast.success("Code created!");
      setNewCode("");
      setRewardValue("");
      setSelectedSkin("");
      setMaxUses("");
      setExpiresHours("");
      loadCodes();
    } catch (error) {
      console.error("Error creating code:", error);
      toast.error("Failed to create code");
    } finally {
      setLoading(false);
    }
  };

  const toggleCode = async (code: RedeemCode) => {
    const { error } = await supabase
      .from("redeem_codes")
      .update({ is_active: !code.is_active })
      .eq("id", code.id);

    if (error) {
      toast.error("Failed to update code");
    } else {
      toast.success(code.is_active ? "Code disabled" : "Code enabled");
      loadCodes();
    }
  };

  const deleteCode = async (id: string) => {
    const { error } = await supabase
      .from("redeem_codes")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete code");
    } else {
      toast.success("Code deleted");
      loadCodes();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  const getRewardLabel = (code: RedeemCode) => {
    switch (code.reward_type) {
      case "coins": return `${code.reward_value} Coins`;
      case "gems": return `${code.reward_value} Gems`;
      case "gold": return `${code.reward_value} Gold`;
      case "all_currency": return `${code.reward_value} of each currency`;
      case "skin": {
        const skin = customSkins.find(s => s.id === code.skin_id);
        return `Skin: ${skin?.name || "Unknown"}`;
      }
      default: return "Unknown reward";
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Ticket className="w-4 h-4 text-primary" />
          Create Redeem Code
        </h3>

        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Code</Label>
              <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g., FREEGEMS100"
                maxLength={16}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={generateRandomCode}>
                Generate
              </Button>
            </div>
          </div>

          <div>
            <Label>Reward Type</Label>
            <Select value={rewardType} onValueChange={setRewardType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coins">Coins</SelectItem>
                <SelectItem value="gems">Gems</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="all_currency">All Currencies</SelectItem>
                <SelectItem value="skin">Custom Skin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rewardType === "skin" ? (
            <div>
              <Label>Select Skin</Label>
              <Select value={selectedSkin} onValueChange={setSelectedSkin}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a skin" />
                </SelectTrigger>
                <SelectContent>
                  {customSkins.map((skin) => (
                    <SelectItem key={skin.id} value={skin.id}>
                      {skin.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={rewardValue}
                onChange={(e) => setRewardValue(e.target.value)}
                placeholder="e.g., 500"
                min="1"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Max Uses (optional)</Label>
              <Input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                min="1"
              />
            </div>
            <div>
              <Label>Expires in (hours)</Label>
              <Input
                type="number"
                value={expiresHours}
                onChange={(e) => setExpiresHours(e.target.value)}
                placeholder="Never"
                min="1"
              />
            </div>
          </div>

          <Button onClick={createCode} disabled={loading} className="w-full gap-2">
            <Gift className="w-4 h-4" />
            {loading ? "Creating..." : "Create Code"}
          </Button>
        </div>
      </Card>

      <h3 className="font-semibold">Active Codes</h3>
      {codes.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No codes created yet</p>
      ) : (
        <div className="space-y-2">
          {codes.map((code) => (
            <Card key={code.id} className={`p-3 ${!code.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <code className="font-mono font-bold text-primary">{code.code}</code>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyCode(code.code)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    {!code.is_active && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Disabled</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Coins className="w-3 h-3" />
                    <span>{getRewardLabel(code)}</span>
                    <span>•</span>
                    <span>Uses: {code.current_uses}{code.max_uses ? `/${code.max_uses}` : ""}</span>
                    {code.expires_at && (
                      <>
                        <span>•</span>
                        <span>Expires: {new Date(code.expires_at).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant={code.is_active ? "outline" : "default"} onClick={() => toggleCode(code)}>
                    {code.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteCode(code.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
