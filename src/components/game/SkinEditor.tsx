import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paintbrush, Eraser, Save, Trash2, Zap, Eye, Gauge, Shield, Sparkles, Zap as TeleportIcon, Sword, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SkinEditorProps {
  onSave?: () => void;
}

const SPECIAL_POWERS = [
  { value: "none", label: "No Power", icon: null, description: "Regular skin with no special abilities" },
  { value: "invisibility", label: "Invisibility", icon: Eye, description: "Become semi-transparent (50% opacity)" },
  { value: "speed", label: "Speed Boost", icon: Gauge, description: "+30% movement speed" },
  { value: "shield", label: "Shield", icon: Shield, description: "Start with 25 extra HP" },
  { value: "rainbow", label: "Rainbow Aura", icon: Sparkles, description: "Skin cycles through rainbow colors" },
  { value: "teleport", label: "Teleport", icon: TeleportIcon, description: "Press SHIFT to teleport forward" },
  { value: "double_damage", label: "Double Damage", icon: Sword, description: "Deal 2x damage with all weapons" },
  { value: "slow_motion", label: "Slow Motion", icon: Clock, description: "Enemies move 50% slower around you" },
];

export const SkinEditor = ({ onSave }: SkinEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#FF5722");
  const [brushSize, setBrushSize] = useState([8]);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [skinName, setSkinName] = useState("");
  const [priceCoins, setPriceCoins] = useState("100");
  const [priceGems, setPriceGems] = useState("0");
  const [priceGold, setPriceGold] = useState("0");
  const [specialPower, setSpecialPower] = useState("none");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize with a circle representing the player
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "#666";
    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) ctx.beginPath();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);

    ctx.lineWidth = brushSize[0];
    ctx.lineCap = "round";
    ctx.strokeStyle = tool === "eraser" ? "#333" : brushColor;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "#666";
    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    ctx.fill();
  };

  const saveSkin = async () => {
    if (!skinName.trim()) {
      toast.error("Please enter a skin name");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        setSaving(false);
        return;
      }

      // Check if user is admin or owner
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "owner"]);

      if (!roleData || roleData.length === 0) {
        toast.error("Only admins and owners can create skins");
        setSaving(false);
        return;
      }

      const imageData = canvas.toDataURL("image/png");

      const { error } = await supabase.from("custom_skins").insert({
        name: skinName,
        image_data: imageData,
        price_coins: parseInt(priceCoins) || 0,
        price_gems: parseInt(priceGems) || 0,
        price_gold: parseInt(priceGold) || 0,
        created_by: user.id,
        special_power: specialPower === "none" ? null : specialPower,
      });

      if (error) {
        console.error("Error saving skin:", error);
        toast.error("Failed to save skin: " + error.message);
        setSaving(false);
        return;
      }

      toast.success("Skin created and added to shop!");
      setSkinName("");
      setSpecialPower("none");
      clearCanvas();
      onSave?.();
    } catch (error) {
      console.error("Error saving skin:", error);
      toast.error("Failed to save skin");
    } finally {
      setSaving(false);
    }
  };

  const selectedPowerInfo = SPECIAL_POWERS.find(p => p.value === specialPower);

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Paintbrush className="w-4 h-4 text-primary" />
        Skin Editor
      </h3>

      <div className="flex gap-4">
        <div className="space-y-3">
          <canvas
            ref={canvasRef}
            width={128}
            height={128}
            className="border rounded-lg cursor-crosshair bg-gray-900"
            style={{ width: 192, height: 192 }}
            onMouseDown={startDrawing}
            onMouseUp={stopDrawing}
            onMouseMove={draw}
            onMouseLeave={stopDrawing}
          />
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={tool === "brush" ? "default" : "outline"}
              onClick={() => setTool("brush")}
            >
              <Paintbrush className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={tool === "eraser" ? "default" : "outline"}
              onClick={() => setTool("eraser")}
            >
              <Eraser className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="destructive" onClick={clearCanvas}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <Label>Brush Color</Label>
            <Input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="h-10 w-full"
            />
          </div>

          <div>
            <Label>Brush Size: {brushSize[0]}px</Label>
            <Slider
              value={brushSize}
              onValueChange={setBrushSize}
              min={1}
              max={20}
              step={1}
            />
          </div>

          <div>
            <Label>Skin Name</Label>
            <Input
              value={skinName}
              onChange={(e) => setSkinName(e.target.value)}
              placeholder="e.g., Galaxy Warrior"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Coins</Label>
              <Input
                type="number"
                value={priceCoins}
                onChange={(e) => setPriceCoins(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Gems</Label>
              <Input
                type="number"
                value={priceGems}
                onChange={(e) => setPriceGems(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Gold</Label>
              <Input
                type="number"
                value={priceGold}
                onChange={(e) => setPriceGold(e.target.value)}
              />
            </div>
          </div>

          {/* Special Power Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Special Power
            </Label>
            <Select value={specialPower} onValueChange={setSpecialPower}>
              <SelectTrigger>
                <SelectValue placeholder="Select a power" />
              </SelectTrigger>
              <SelectContent>
                {SPECIAL_POWERS.map((power) => (
                  <SelectItem key={power.value} value={power.value}>
                    <div className="flex items-center gap-2">
                      {power.icon && <power.icon className="w-4 h-4" />}
                      {power.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPowerInfo && (
              <p className="text-xs text-muted-foreground">
                {selectedPowerInfo.description}
              </p>
            )}
          </div>

          <Button
            onClick={saveSkin}
            disabled={saving || !skinName.trim()}
            className="w-full gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save to Shop
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};