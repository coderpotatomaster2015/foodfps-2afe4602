import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Biohazard, Bot, Circle, Crown, Crosshair, Dumbbell, Flag, FlipHorizontal, Gauge,
  Ghost, GraduationCap, Heart, Lock, Mountain, Orbit, Shield, Skull, Snowflake,
  Sparkles, Swords, Target, Timer, Trophy, User, UserCheck, Users, Wifi, Zap,
  Droplets, Shuffle, Star, Box, HeartPulse, Bomb, Coins, UserMinus
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { GameMode } from "@/pages/Index";
import { toast } from "sonner";

interface GameModeSelectorProps {
  username: string;
  onModeSelect: (mode: GameMode, roomCode?: string, timedMinutes?: number) => void;
  soloDisabled?: boolean;
  multiplayerDisabled?: boolean;
  bossDisabled?: boolean;
  isClassMode?: boolean;
}

interface ModeCard {
  mode: Exclude<GameMode, null | "host" | "join" | "offline" | "timed-host" | "timed-join">;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  estMinutes: string;
  colorClass: string;
  icon: LucideIcon;
  disabledBy?: "solo" | "boss";
}

const ALL_MODES: ModeCard[] = [
  { mode: "solo", title: "Solo", description: "Endless waves", difficulty: "Easy", estMinutes: "8-20m", colorClass: "group-hover:bg-primary", icon: User, disabledBy: "solo" },
  { mode: "3d-solo", title: "3D Solo", description: "3D FPS mode", difficulty: "Medium", estMinutes: "8-20m", colorClass: "group-hover:bg-emerald-500", icon: Box, disabledBy: "solo" },
  { mode: "boss", title: "Boss", description: "Fight bosses", difficulty: "Hard", estMinutes: "10-15m", colorClass: "group-hover:bg-destructive", icon: Skull, disabledBy: "boss" },
  { mode: "ranked", title: "Ranked", description: "7 waves, ranks", difficulty: "Hard", estMinutes: "6-10m", colorClass: "group-hover:bg-primary", icon: Swords },
  { mode: "payload", title: "Payload", description: "Escort cargo", difficulty: "Medium", estMinutes: "5-8m", colorClass: "group-hover:bg-purple-500", icon: Box },
  { mode: "sniper", title: "Sniper Elite", description: "Sniper only", difficulty: "Hard", estMinutes: "4-7m", colorClass: "group-hover:bg-teal-500", icon: Crosshair },
  { mode: "tag", title: "Tag", description: "Don't be IT", difficulty: "Easy", estMinutes: "3-5m", colorClass: "group-hover:bg-yellow-500", icon: UserMinus },
  { mode: "bounty", title: "Bounty", description: "Hunt targets", difficulty: "Medium", estMinutes: "6-10m", colorClass: "group-hover:bg-amber-500", icon: Coins },
  { mode: "demolition", title: "Demolition", description: "Plant bombs", difficulty: "Hard", estMinutes: "5-9m", colorClass: "group-hover:bg-red-500", icon: Bomb },
  { mode: "medic", title: "Medic", description: "Save allies", difficulty: "Hard", estMinutes: "5-8m", colorClass: "group-hover:bg-cyan-500", icon: HeartPulse },
  { mode: "youvsme", title: "You vs Me", description: "1v1 AI duel", difficulty: "Medium", estMinutes: "4-7m", colorClass: "group-hover:bg-accent", icon: Bot },
  { mode: "school", title: "School", description: "Elemental powers", difficulty: "Easy", estMinutes: "6-10m", colorClass: "group-hover:bg-green-500", icon: GraduationCap },
  { mode: "survival", title: "Survival", description: "Wave-based", difficulty: "Medium", estMinutes: "8-14m", colorClass: "group-hover:bg-orange-500", icon: Heart },
  { mode: "zombie", title: "Zombie", description: "Horde mode", difficulty: "Medium", estMinutes: "7-12m", colorClass: "group-hover:bg-emerald-500", icon: Biohazard },
  { mode: "arena", title: "Arena", description: "25-kill win", difficulty: "Hard", estMinutes: "5-10m", colorClass: "group-hover:bg-red-500", icon: Target },
  { mode: "infection", title: "Infection", description: "Survive infected", difficulty: "Medium", estMinutes: "6-9m", colorClass: "group-hover:bg-purple-500", icon: Shield },
  { mode: "ctf", title: "CTF", description: "Capture 3 flags", difficulty: "Medium", estMinutes: "8-12m", colorClass: "group-hover:bg-cyan-500", icon: Flag },
  { mode: "koth", title: "King of Hill", description: "Hold the zone", difficulty: "Hard", estMinutes: "7-10m", colorClass: "group-hover:bg-amber-600", icon: Mountain },
  { mode: "gungame", title: "Gun Game", description: "Cycle weapons", difficulty: "Medium", estMinutes: "5-8m", colorClass: "group-hover:bg-yellow-500", icon: Crosshair },
  { mode: "vip", title: "Protect VIP", description: "Guard the VIP", difficulty: "Hard", estMinutes: "6-10m", colorClass: "group-hover:bg-blue-500", icon: UserCheck },
  { mode: "lms", title: "Last Man", description: "No respawns", difficulty: "Hard", estMinutes: "4-8m", colorClass: "group-hover:bg-rose-500", icon: Zap },
  { mode: "dodgeball", title: "Dodgeball", description: "Dodge & throw", difficulty: "Easy", estMinutes: "4-6m", colorClass: "group-hover:bg-lime-500", icon: Circle },
  { mode: "blitz", title: "Blitz Rush", description: "Fast short bursts", difficulty: "Medium", estMinutes: "3-5m", colorClass: "group-hover:bg-indigo-500", icon: Gauge },
  { mode: "juggernaut", title: "Juggernaut", description: "Tank build survival", difficulty: "Hard", estMinutes: "8-12m", colorClass: "group-hover:bg-amber-500", icon: Crown },
  { mode: "stealth", title: "Stealth Ops", description: "Hard hits, low profile", difficulty: "Hard", estMinutes: "5-7m", colorClass: "group-hover:bg-violet-500", icon: Ghost },
  { mode: "mirror", title: "Mirror Match", description: "Mirrored controls", difficulty: "Hard", estMinutes: "4-8m", colorClass: "group-hover:bg-sky-500", icon: FlipHorizontal },
  { mode: "lowgrav", title: "Low Gravity", description: "Floaty movement", difficulty: "Easy", estMinutes: "5-9m", colorClass: "group-hover:bg-fuchsia-500", icon: Orbit },
  { mode: "chaos", title: "Chaos", description: "Unpredictable waves", difficulty: "Hard", estMinutes: "6-10m", colorClass: "group-hover:bg-pink-500", icon: Sparkles },
  { mode: "headhunter", title: "Headhunter", description: "Precision bonus", difficulty: "Hard", estMinutes: "6-9m", colorClass: "group-hover:bg-red-600", icon: Crosshair },
  { mode: "vampire", title: "Vampire", description: "Drain health on kills", difficulty: "Medium", estMinutes: "6-9m", colorClass: "group-hover:bg-rose-600", icon: Droplets },
  { mode: "frostbite", title: "Frostbite", description: "Slow enemies", difficulty: "Medium", estMinutes: "6-10m", colorClass: "group-hover:bg-blue-300", icon: Snowflake },
  { mode: "titan", title: "Titan Arena", description: "Big units, big hits", difficulty: "Hard", estMinutes: "9-14m", colorClass: "group-hover:bg-slate-500", icon: Dumbbell },
];

const FAVORITES_KEY = "foodfps_mode_favorites";
const RECENT_KEY = "foodfps_recent_modes";

export const GameModeSelector = ({
  username,
  onModeSelect,
  soloDisabled = false,
  multiplayerDisabled = false,
  bossDisabled = false,
  isClassMode = false,
}: GameModeSelectorProps) => {
  const [joinCode, setJoinCode] = useState("");
  const [showHostOptions, setShowHostOptions] = useState(false);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentModes, setRecentModes] = useState<string[]>([]);

  useEffect(() => {
    const savedFavorites = localStorage.getItem(FAVORITES_KEY);
    const savedRecent = localStorage.getItem(RECENT_KEY);
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedRecent) setRecentModes(JSON.parse(savedRecent));
  }, []);

  useEffect(() => { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem(RECENT_KEY, JSON.stringify(recentModes)); }, [recentModes]);

  const dailySpotlight = useMemo(() => {
    const day = new Date().getDate();
    return ALL_MODES[day % ALL_MODES.length];
  }, []);

  const filteredModes = useMemo(() => {
    const text = search.trim().toLowerCase();
    const matches = ALL_MODES.filter((mode) => {
      if (!text) return true;
      return `${mode.title} ${mode.description} ${mode.difficulty}`.toLowerCase().includes(text);
    });
    return matches.sort((a, b) => {
      const aFav = favorites.includes(a.mode) ? 1 : 0;
      const bFav = favorites.includes(b.mode) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return a.title.localeCompare(b.title);
    });
  }, [search, favorites]);

  const addRecentMode = (mode: string) => { setRecentModes((current) => [mode, ...current.filter((m) => m !== mode)].slice(0, 5)); };
  const isModeDisabled = (mode: ModeCard) => (mode.disabledBy === "solo" && soloDisabled) || (mode.disabledBy === "boss" && bossDisabled);
  const startMode = (mode: ModeCard["mode"]) => {
    const found = ALL_MODES.find((m) => m.mode === mode);
    if (!found || isModeDisabled(found)) { toast.error("That mode is currently disabled."); return; }
    onModeSelect(mode); addRecentMode(mode);
  };
  const handleJoinGame = () => { if (joinCode.length === 5) { onModeSelect("join", joinCode); } };
  const handleHostTimed = (minutes: number) => { onModeSelect("host", undefined, minutes); setShowHostOptions(false); };
  const toggleFavorite = (mode: string) => { setFavorites((current) => current.includes(mode) ? current.filter((m) => m !== mode) : [...current, mode]); };
  const launchRandomMode = () => { const available = ALL_MODES.filter((mode) => !isModeDisabled(mode)); const pick = available[Math.floor(Math.random() * available.length)]; toast.success(`Random mode selected: ${pick.title}`); startMode(pick.mode); };

  useEffect(() => {
    const handleHotkeys = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (!event.shiftKey) return;
      if (event.key.toLowerCase() === "r") { launchRandomMode(); return; }
      const index = Number(event.key) - 1;
      if (index >= 0 && index < filteredModes.length) startMode(filteredModes[index].mode);
    };
    window.addEventListener("keydown", handleHotkeys); return () => window.removeEventListener("keydown", handleHotkeys);
  }, [filteredModes]);

  if (isClassMode) {
    return (
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center justify-center gap-2"><GraduationCap className="w-8 h-8" /> School Mode</h1>
          <p className="text-muted-foreground">Welcome, <span className="text-primary font-semibold">{username}</span></p>
          <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">You joined via class code. Only School Mode is available.</p>
        </div>
        <Card className="p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50 hover:border-green-400 cursor-pointer group transition-all hover:scale-105" onClick={() => onModeSelect("school")}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-green-500/30 flex items-center justify-center transition-all group-hover:bg-green-500 group-hover:scale-110"><GraduationCap className="w-7 h-7 text-green-400 group-hover:text-white" /></div>
            <div><h3 className="text-xl font-bold">Play School Mode</h3><p className="text-sm text-muted-foreground">Use elemental powers: Fire, Water, Earth, Air</p></div>
          </div>
        </Card>
        <div className="space-y-2">
          <p className="text-xs text-center text-muted-foreground">Other modes are locked for class members</p>
          <div className="flex flex-wrap gap-2 justify-center opacity-50">
            <div className="flex items-center gap-1 text-xs bg-secondary/30 rounded px-2 py-1"><Lock className="w-3 h-3" /> Solo</div>
            <div className="flex items-center gap-1 text-xs bg-secondary/30 rounded px-2 py-1"><Lock className="w-3 h-3" /> Boss</div>
            <div className="flex items-center gap-1 text-xs bg-secondary/30 rounded px-2 py-1"><Lock className="w-3 h-3" /> Ranked</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl space-y-4">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">Food FPS</h1>
        <p className="text-muted-foreground">Welcome, <span className="text-primary font-semibold">{username}</span></p>
      </div>

      <Card className="p-3 bg-card border-border">
        <div className="flex flex-wrap gap-2 items-center">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search modes by name, difficulty, or description" className="min-w-56 flex-1" />
          <Button variant="secondary" size="sm" onClick={launchRandomMode} className="gap-2"><Shuffle className="w-4 h-4" /> Random</Button>
          <div className="text-xs text-muted-foreground">Hotkeys: Shift+1..9 and Shift+R</div>
        </div>
      </Card>

      <Card className="p-3 bg-card border-yellow-500/40">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div><p className="text-xs text-muted-foreground">Daily spotlight</p><p className="font-semibold">{dailySpotlight.title} · {dailySpotlight.description}</p></div>
          <Button variant="outline" size="sm" onClick={() => startMode(dailySpotlight.mode)}>Play spotlight</Button>
        </div>
      </Card>

      {recentModes.length > 0 && (
        <Card className="p-3 bg-card border-border">
          <p className="text-xs text-muted-foreground mb-2">Recent modes</p>
          <div className="flex flex-wrap gap-2">
            {recentModes.map((mode) => {
              const found = ALL_MODES.find((entry) => entry.mode === mode);
              if (!found) return null;
              return <Button key={mode} variant="outline" size="sm" onClick={() => startMode(found.mode)}>{found.title}</Button>;
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {filteredModes.map((mode) => {
          const Icon = mode.icon;
          const disabled = isModeDisabled(mode);
          const isFavorite = favorites.includes(mode.mode);
          return (
            <Card key={mode.mode} className={`p-4 bg-card border-border transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary cursor-pointer group"}`} onClick={() => !disabled && startMode(mode.mode)}>
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center transition-all ${mode.colorClass}`}><Icon className="w-5 h-5" /></div>
                  <button type="button" className="text-muted-foreground hover:text-yellow-400" onClick={(event) => { event.stopPropagation(); toggleFavorite(mode.mode); }}><Star className={`w-4 h-4 ${isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} /></button>
                </div>
                <div><h3 className="text-lg font-bold">{mode.title}</h3><p className="text-xs text-muted-foreground">{disabled ? "Disabled" : mode.description}</p></div>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground"><span>{mode.difficulty}</span><span>{mode.estMinutes}</span></div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className={`p-4 bg-card border-border ${multiplayerDisabled ? "opacity-50" : ""}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><Users className="w-5 h-5" /></div><div><h3 className="font-bold">Multiplayer</h3><p className="text-xs text-muted-foreground">Compete for kills</p></div></div>
          <div className="flex gap-2">
            <Button variant="gaming" size="sm" onClick={() => !multiplayerDisabled && setShowHostOptions(true)} disabled={multiplayerDisabled}><Wifi className="w-4 h-4 mr-1" />Host</Button>
            <div className="flex gap-1">
              <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))} placeholder="CODE" className="w-20 text-center text-sm font-mono" maxLength={5} disabled={multiplayerDisabled} />
              <Button onClick={handleJoinGame} variant="accent" size="sm" disabled={joinCode.length !== 5 || multiplayerDisabled}>Join</Button>
            </div>
          </div>
        </div>
      </Card>

      {showHostOptions && (
        <Card className="p-4 border-primary/30 animate-in fade-in slide-in-from-bottom-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold flex items-center gap-2"><Timer className="w-5 h-5 text-primary" /> Match Duration</h3><Button variant="ghost" size="sm" onClick={() => setShowHostOptions(false)}>Cancel</Button></div>
            <p className="text-xs text-muted-foreground"><Trophy className="w-3 h-3 inline mr-1" />Winner gets 5 coins, 5 gems, and 5 gold!</p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="gaming" onClick={() => handleHostTimed(5)} className="h-14 flex-col gap-0.5"><Timer className="w-5 h-5" /><span className="font-bold">5 Min</span></Button>
              <Button variant="gaming" onClick={() => handleHostTimed(10)} className="h-14 flex-col gap-0.5"><Timer className="w-5 h-5" /><span className="font-bold">10 Min</span></Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
