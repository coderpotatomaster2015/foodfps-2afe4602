import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bug, X, ChevronDown, ChevronUp } from "lucide-react";

interface DebugValues {
  enemyHealth: number;
  playerHealth: number;
  maxEnemies: number;
  enemySpeed: number;
  playerSpeed: number;
  spawnInterval: number;
  enemyHostile: boolean;
  godMode: boolean;
  infiniteAmmo: boolean;
  scoreMultiplier: number;
}

interface OwnerDebugPanelProps {
  values: DebugValues;
  onChange: (values: Partial<DebugValues>) => void;
  enemyCount: number;
  playerPos: { x: number; y: number };
  fps: number;
}

export const OwnerDebugPanel = ({ values, onChange, enemyCount, playerPos, fps }: OwnerDebugPanelProps) => {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 bg-destructive/80 hover:bg-destructive text-destructive-foreground p-2 rounded-lg backdrop-blur-sm border border-destructive/50 transition-all"
        title="Owner Debug Mode"
      >
        <Bug className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed right-4 bottom-20 z-50 w-72 bg-card/95 backdrop-blur-sm border border-destructive/40 rounded-lg shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-destructive/10 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-destructive" />
          <span className="text-sm font-bold text-destructive">DEBUG MODE</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-secondary rounded">
            {collapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-secondary rounded">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <ScrollArea className="max-h-[50vh]">
          <div className="p-3 space-y-3 text-xs">
            {/* Live Stats */}
            <div className="bg-secondary/50 rounded p-2 space-y-1 font-mono">
              <div className="flex justify-between"><span className="text-muted-foreground">FPS</span><span className="text-primary">{fps}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Enemies</span><span>{enemyCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Player Pos</span><span>{Math.round(playerPos.x)}, {Math.round(playerPos.y)}</span></div>
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">God Mode</Label>
                <Switch checked={values.godMode} onCheckedChange={(v) => onChange({ godMode: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Infinite Ammo</Label>
                <Switch checked={values.infiniteAmmo} onCheckedChange={(v) => onChange({ infiniteAmmo: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Enemies Hostile</Label>
                <Switch checked={values.enemyHostile} onCheckedChange={(v) => onChange({ enemyHostile: v })} />
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Enemy HP: {values.enemyHealth}</Label>
                <Slider min={1} max={1000} step={10} value={[values.enemyHealth]} onValueChange={v => onChange({ enemyHealth: v[0] })} />
              </div>
              <div>
                <Label className="text-xs">Player HP: {values.playerHealth}</Label>
                <Slider min={1} max={1000} step={10} value={[values.playerHealth]} onValueChange={v => onChange({ playerHealth: v[0] })} />
              </div>
              <div>
                <Label className="text-xs">Max Enemies: {values.maxEnemies}</Label>
                <Slider min={1} max={50} step={1} value={[values.maxEnemies]} onValueChange={v => onChange({ maxEnemies: v[0] })} />
              </div>
              <div>
                <Label className="text-xs">Enemy Speed: {values.enemySpeed.toFixed(2)}x</Label>
                <Slider min={0} max={3} step={0.1} value={[values.enemySpeed]} onValueChange={v => onChange({ enemySpeed: v[0] })} />
              </div>
              <div>
                <Label className="text-xs">Player Speed: {values.playerSpeed.toFixed(2)}x</Label>
                <Slider min={0.1} max={3} step={0.1} value={[values.playerSpeed]} onValueChange={v => onChange({ playerSpeed: v[0] })} />
              </div>
              <div>
                <Label className="text-xs">Spawn Interval: {values.spawnInterval.toFixed(1)}s</Label>
                <Slider min={0.2} max={10} step={0.1} value={[values.spawnInterval]} onValueChange={v => onChange({ spawnInterval: v[0] })} />
              </div>
              <div>
                <Label className="text-xs">Score Mult: {values.scoreMultiplier.toFixed(1)}x</Label>
                <Slider min={0.1} max={10} step={0.1} value={[values.scoreMultiplier]} onValueChange={v => onChange({ scoreMultiplier: v[0] })} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-1 flex-wrap">
              <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => onChange({ enemyHealth: 1 })}>1HP Enemies</Button>
              <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => onChange({ playerHealth: 9999, godMode: true })}>Invincible</Button>
              <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => onChange({ spawnInterval: 0.2, maxEnemies: 50 })}>Max Spawn</Button>
              <Button size="sm" variant="destructive" className="text-[10px] h-6 px-2" onClick={() => onChange({ 
                enemyHealth: 100, playerHealth: 100, maxEnemies: 10, enemySpeed: 1, playerSpeed: 1, 
                spawnInterval: 2, enemyHostile: true, godMode: false, infiniteAmmo: false, scoreMultiplier: 1
              })}>Reset All</Button>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
