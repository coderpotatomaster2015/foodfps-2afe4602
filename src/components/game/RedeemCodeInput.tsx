import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ticket, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const RedeemCodeInput = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const redeemCode = async () => {
    if (!code.trim()) {
      toast.error("Please enter a code");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to redeem codes");
        return;
      }

      // Find the code
      const { data: codeData, error: findError } = await supabase
        .from("redeem_codes")
        .select("*")
        .eq("code", code.toUpperCase().trim())
        .eq("is_active", true)
        .single();

      if (findError || !codeData) {
        toast.error("Invalid or expired code");
        return;
      }

      // Check if already redeemed
      const { data: existingRedemption } = await supabase
        .from("redeemed_codes")
        .select("id")
        .eq("user_id", user.id)
        .eq("code_id", codeData.id)
        .single();

      if (existingRedemption) {
        toast.error("You've already redeemed this code");
        return;
      }

      // Check max uses
      if (codeData.max_uses && codeData.current_uses >= codeData.max_uses) {
        toast.error("This code has reached its maximum uses");
        return;
      }

      // Check expiry
      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        toast.error("This code has expired");
        return;
      }

      // Apply rewards based on type
      if (codeData.reward_type === "skin" && codeData.skin_id) {
        // Give skin
        const { error: skinError } = await supabase
          .from("player_custom_skins")
          .insert({
            user_id: user.id,
            skin_id: codeData.skin_id,
          });

        if (skinError) {
          if (skinError.code === "23505") {
            toast.error("You already own this skin");
          } else {
            toast.error("Failed to redeem skin");
          }
          return;
        }
      } else {
        // Give currency
        const coins = codeData.reward_type === "coins" || codeData.reward_type === "all_currency" ? codeData.reward_value : 0;
        const gems = codeData.reward_type === "gems" || codeData.reward_type === "all_currency" ? codeData.reward_value : 0;
        const gold = codeData.reward_type === "gold" || codeData.reward_type === "all_currency" ? codeData.reward_value : 0;

        const { error: currencyError } = await supabase.rpc("add_player_currency", {
          _user_id: user.id,
          _coins: coins,
          _gems: gems,
          _gold: gold,
        });

        if (currencyError) {
          toast.error("Failed to add currency");
          return;
        }
      }

      // Record redemption
      await supabase.from("redeemed_codes").insert({
        user_id: user.id,
        code_id: codeData.id,
      });

      // Update use count
      await supabase
        .from("redeem_codes")
        .update({ current_uses: codeData.current_uses + 1 })
        .eq("id", codeData.id);

      // Success message based on reward type
      if (codeData.reward_type === "skin") {
        toast.success("🎨 Skin unlocked! Check the Custom tab in the shop.");
      } else if (codeData.reward_type === "all_currency") {
        toast.success(`🎉 Received ${codeData.reward_value} coins, gems, and gold!`);
      } else {
        toast.success(`🎉 Received ${codeData.reward_value} ${codeData.reward_type}!`);
      }

      setCode("");
    } catch (error) {
      console.error("Error redeeming code:", error);
      toast.error("Failed to redeem code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold flex items-center gap-2">
        <Ticket className="w-4 h-4 text-primary" />
        Redeem Code
      </h3>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter code..."
          maxLength={16}
          onKeyDown={(e) => e.key === "Enter" && redeemCode()}
        />
        <Button onClick={redeemCode} disabled={loading} className="gap-1">
          <Check className="w-4 h-4" />
          {loading ? "..." : "Redeem"}
        </Button>
      </div>
    </Card>
  );
};
