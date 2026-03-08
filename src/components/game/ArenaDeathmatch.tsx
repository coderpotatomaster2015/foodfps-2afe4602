import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Shield } from "lucide-react";
import { AdminChat } from "./AdminChat";
import { TouchControls } from "./TouchControls";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ArenaDeathmatchProps {
  username: string;
  onBack: () => void;
  adminAbuseEvents?: { event_type: string; expires_at: string }[];
  touchscreenMode?: boolean;
  playerSkin?: string;
}

type Weapon = "pistol" | "shotgun" | "minigun" | "sniper" | "sword" | "knife" | "axe" | "rifle" | "smg" | "rpg" | "flamethrower" | "railgun" | "crossbow" | "laser_pistol" | "grenade_launcher" | "katana" | "dual_pistols" | "plasma_rifle" | "boomerang" | "whip" | "freeze_ray" | "harpoon_gun";

interface WeaponConfig { name: string; fireRate: number; damage: number; ammo: number; maxAmmo: number; spread: number; bulletSpeed: number; color: string; isMelee: boolean; unlockScore: number; }

const WEAPONS: Record<Weapon, WeaponConfig> = {
  pistol: { name: "Pistol", fireRate: 0.18, damage: 40, ammo: 10, maxAmmo: 10, spread: 10, bulletSpeed: 420, color: "#FFB84D", isMelee: false, unlockScore: 0 },
  shotgun: { name: "Shotgun", fireRate: 0.5, damage: 25, ammo: 6, maxAmmo: 6, spread: 40, bulletSpeed: 380, color: "#FF6B6B", isMelee: false, unlockScore: 100 },
  sword: { name: "Sword", fireRate: 0.4, damage: 80, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 0, color: "#C0C0C0", isMelee: true, unlockScore: 200 },
  rifle: { name: "Rifle", fireRate: 0.12, damage: 35, ammo: 30, maxAmmo: 30, spread: 5, bulletSpeed: 600, color: "#8B7355", isMelee: false, unlockScore: 250 },
  sniper: { name: "Sniper", fireRate: 1.0, damage: 120, ammo: 5, maxAmmo: 5, spread: 0, bulletSpeed: 800, color: "#A6FFB3", isMelee: false, unlockScore: 300 },
  smg: { name: "SMG", fireRate: 0.08, damage: 25, ammo: 40, maxAmmo: 40, spread: 15, bulletSpeed: 480, color: "#FFD700", isMelee: false, unlockScore: 350 },
  knife: { name: "Knife", fireRate: 0.2, damage: 50, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 0, color: "#888888", isMelee: true, unlockScore: 400 },
  rpg: { name: "RPG", fireRate: 2.5, damage: 200, ammo: 3, maxAmmo: 3, spread: 0, bulletSpeed: 300, color: "#FF00FF", isMelee: false, unlockScore: 450 },
  axe: { name: "Axe", fireRate: 0.6, damage: 100, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 0, color: "#8B4513", isMelee: true, unlockScore: 500 },
  flamethrower: { name: "Flamethrower", fireRate: 0.03, damage: 15, ammo: 200, maxAmmo: 200, spread: 25, bulletSpeed: 200, color: "#FF4500", isMelee: false, unlockScore: 550 },
  minigun: { name: "Minigun", fireRate: 0.05, damage: 20, ammo: 100, maxAmmo: 100, spread: 20, bulletSpeed: 500, color: "#6BAFFF", isMelee: false, unlockScore: 600 },
  railgun: { name: "Railgun", fireRate: 1.8, damage: 250, ammo: 4, maxAmmo: 4, spread: 0, bulletSpeed: 1200, color: "#00FFFF", isMelee: false, unlockScore: 700 },
  crossbow: { name: "Crossbow", fireRate: 0.8, damage: 90, ammo: 8, maxAmmo: 8, spread: 2, bulletSpeed: 700, color: "#A0522D", isMelee: false, unlockScore: 750 },
  laser_pistol: { name: "Laser Pistol", fireRate: 0.15, damage: 45, ammo: 15, maxAmmo: 15, spread: 3, bulletSpeed: 900, color: "#FF1493", isMelee: false, unlockScore: 800 },
  grenade_launcher: { name: "Grenade Launcher", fireRate: 1.5, damage: 180, ammo: 4, maxAmmo: 4, spread: 8, bulletSpeed: 250, color: "#228B22", isMelee: false, unlockScore: 850 },
  katana: { name: "Katana", fireRate: 0.3, damage: 110, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 0, color: "#DC143C", isMelee: true, unlockScore: 900 },
  dual_pistols: { name: "Dual Pistols", fireRate: 0.1, damage: 30, ammo: 20, maxAmmo: 20, spread: 18, bulletSpeed: 420, color: "#DAA520", isMelee: false, unlockScore: 950 },
  plasma_rifle: { name: "Plasma Rifle", fireRate: 0.2, damage: 55, ammo: 25, maxAmmo: 25, spread: 6, bulletSpeed: 650, color: "#7B68EE", isMelee: false, unlockScore: 1000 },
  boomerang: { name: "Boomerang", fireRate: 0.7, damage: 70, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 350, color: "#FF8C00", isMelee: false, unlockScore: 1050 },
  whip: { name: "Whip", fireRate: 0.35, damage: 65, ammo: 999, maxAmmo: 999, spread: 0, bulletSpeed: 0, color: "#8B0000", isMelee: true, unlockScore: 1100 },
  freeze_ray: { name: "Freeze Ray", fireRate: 0.12, damage: 20, ammo: 30, maxAmmo: 30, spread: 12, bulletSpeed: 400, color: "#ADD8E6", isMelee: false, unlockScore: 1150 },
  harpoon_gun: { name: "Harpoon Gun", fireRate: 1.2, damage: 160, ammo: 3, maxAmmo: 3, spread: 0, bulletSpeed: 550, color: "#4682B4", isMelee: false, unlockScore: 1200 },
};

const WEAPON_ORDER: Weapon[] = ["pistol", "shotgun", "sword", "rifle", "sniper", "smg", "knife", "rpg", "axe", "flamethrower", "minigun", "railgun", "crossbow", "laser_pistol", "grenade_launcher", "katana", "dual_pistols", "plasma_rifle", "boomerang", "whip", "freeze_ray", "harpoon_gun"];

const KILL_TARGET = 10;
const QUEUE_TIMEOUT_MS = 30000;
const SYNC_INTERVAL_MS = 50;
const W = 960;
const H = 640;

// Remote player state received via broadcast
interface RemotePlayer {
  id: string;
  username: string;
  x: number;
  y: number;
  angle: number;
  hp: number;
  weapon: Weapon;
  kills: number;
  skin: string;
}

// Remote bullet received via broadcast
interface RemoteBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  color: string;
  life: number;
  ownerId: string;
}

export const ArenaDeathmatch = ({ username, onBack, adminAbuseEvents = [], touchscreenMode = false, playerSkin = "#FFF3D6" }: ArenaDeathmatchProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [ammo, setAmmo] = useState(10);
  const [maxAmmo, setMaxAmmo] = useState(10);
  const [currentWeapon, setCurrentWeapon] = useState<Weapon>("pistol");
  const [health, setHealth] = useState(100);
  const [maxHealth] = useState(100);
  const [unlockedWeapons, setUnlockedWeapons] = useState<Weapon[]>(["pistol"]);
  const [spawnImmunity, setSpawnImmunity] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [kills, setKills] = useState(0);
  const [victory, setVictory] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isQueueing, setIsQueueing] = useState(true);
  const [queueSeconds, setQueueSeconds] = useState(0);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [opponentKills, setOpponentKills] = useState(0);

  const adminStateRef = useRef({ active: false, godMode: false, speedMultiplier: 1, infiniteAmmo: false });
  const playerRef = useRef<any>(null);
  const spawnImmunityRef = useRef(true);
  const gameLoopRef = useRef<number | null>(null);
  const touchMoveRef = useRef({ x: 0, y: 0 });
  const touchAimRef = useRef({ x: W / 2, y: H / 2 });
  const touchShootingRef = useRef(false);
  const localPlayerIdRef = useRef(`arena_${crypto.randomUUID()}`);
  const killsRef = useRef(0);
  const gameOverRef = useRef(false);
  const victoryRef = useRef(false);

  // Multiplayer refs
  const matchChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const remotePlayerRef = useRef<RemotePlayer | null>(null);
  const remoteBulletsRef = useRef<RemoteBullet[]>([]);
  const isQueueingRef = useRef(true);
  const queueSecondsRef = useRef(0);
  const matchIdRef = useRef<string | null>(null);
  const opponentIdRef = useRef<string | null>(null);
  const pendingBulletsRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number; dmg: number; color: string; life: number }[]>([]);

  // Keep refs in sync with state
  useEffect(() => { isQueueingRef.current = isQueueing; }, [isQueueing]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { victoryRef.current = victory; }, [victory]);

  // ── Matchmaking ──
  useEffect(() => {
    let active = true;
    let queueTimeout: ReturnType<typeof setTimeout> | null = null;
    let queueTicker: ReturnType<typeof setInterval> | null = null;
    const queueChannel = supabase.channel("arena-pvp-queue");

    const startMatch = (opId: string, opUsername: string, mId: string) => {
      if (!active || matchIdRef.current) return;
      matchIdRef.current = mId;
      opponentIdRef.current = opId;
      setOpponentName(opUsername);
      setIsQueueing(false);

      // Set up match channel for game sync
      const channel = supabase.channel(`arena-match-${mId}`)
        .on("broadcast", { event: "player_state" }, ({ payload }) => {
          if (payload.id === localPlayerIdRef.current) return;
          remotePlayerRef.current = {
            id: payload.id,
            username: payload.username,
            x: payload.x,
            y: payload.y,
            angle: payload.angle,
            hp: payload.hp,
            weapon: payload.weapon,
            kills: payload.kills,
            skin: payload.skin,
          };
          setOpponentKills(payload.kills);
        })
        .on("broadcast", { event: "bullets_fired" }, ({ payload }) => {
          if (payload.ownerId === localPlayerIdRef.current) return;
          // Add remote bullets to our local simulation
          for (const b of payload.bullets) {
            remoteBulletsRef.current.push({
              x: b.x, y: b.y, vx: b.vx, vy: b.vy,
              r: b.r, dmg: b.dmg, color: b.color, life: b.life,
              ownerId: payload.ownerId,
            });
          }
        })
        .on("broadcast", { event: "melee_attack" }, ({ payload }) => {
          if (payload.ownerId === localPlayerIdRef.current) return;
          // Check if local player is in melee range
          const p = playerRef.current;
          if (!p || spawnImmunityRef.current || adminStateRef.current.godMode) return;
          const dx = p.x - payload.x;
          const dy = p.y - payload.y;
          const dist = Math.hypot(dx, dy);
          const angleToPlayer = Math.atan2(dy, dx);
          if (dist <= 50 && Math.abs(angleToPlayer - payload.angle) < 0.6) {
            p.hp -= payload.damage;
            setHealth(Math.max(0, p.hp));
          }
        })
        .on("broadcast", { event: "player_died" }, ({ payload }) => {
          if (payload.killerId === localPlayerIdRef.current) {
            // We got a kill confirmed by the victim
            killsRef.current++;
            setKills(killsRef.current);
            setScore(prev => prev + 50);
            toast.success(`Eliminated ${payload.victimUsername}!`);
          }
        })
        .on("broadcast", { event: "player_respawn" }, ({ payload }) => {
          if (payload.id !== localPlayerIdRef.current && remotePlayerRef.current) {
            remotePlayerRef.current.hp = 100;
            remotePlayerRef.current.x = payload.x;
            remotePlayerRef.current.y = payload.y;
          }
        })
        .on("broadcast", { event: "match_won" }, ({ payload }) => {
          if (payload.winnerId !== localPlayerIdRef.current) {
            // Opponent won
            setGameOver(true);
            gameOverRef.current = true;
            toast.error(`${payload.winnerUsername} wins the arena!`);
            saveProgress(scoreRef.current);
          }
        })
        .subscribe();

      matchChannelRef.current = channel;
      toast.success(`Matched with ${opUsername}! Fight!`);
    };

    queueChannel
      .on("broadcast", { event: "arena_seek" }, ({ payload }) => {
        if (!active || matchIdRef.current || payload.playerId === localPlayerIdRef.current) return;
        // Deterministic: lower ID creates the match
        if (payload.playerId < localPlayerIdRef.current) {
          const mId = `arena_${payload.playerId}_${localPlayerIdRef.current}`;
          queueChannel.send({
            type: "broadcast",
            event: "arena_accept",
            payload: {
              matchId: mId,
              playerAId: payload.playerId,
              playerAUsername: payload.username,
              playerBId: localPlayerIdRef.current,
              playerBUsername: username,
            },
          });
          startMatch(payload.playerId, payload.username, mId);
        }
      })
      .on("broadcast", { event: "arena_accept" }, ({ payload }) => {
        if (!active || matchIdRef.current) return;
        const isA = payload.playerAId === localPlayerIdRef.current;
        const isB = payload.playerBId === localPlayerIdRef.current;
        if (!isA && !isB) return;
        const opId = isA ? payload.playerBId : payload.playerAId;
        const opUser = isA ? payload.playerBUsername : payload.playerAUsername;
        startMatch(opId, opUser, payload.matchId);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          queueChannel.send({
            type: "broadcast",
            event: "arena_seek",
            payload: { playerId: localPlayerIdRef.current, username },
          });
        }
      });

    // Re-broadcast seek every second
    queueTicker = setInterval(() => {
      queueSecondsRef.current++;
      setQueueSeconds(queueSecondsRef.current);
      if (!matchIdRef.current) {
        queueChannel.send({
          type: "broadcast",
          event: "arena_seek",
          payload: { playerId: localPlayerIdRef.current, username },
        });
      }
    }, 1000);

    // Timeout: start with bot opponent
    queueTimeout = setTimeout(() => {
      if (!active || matchIdRef.current) return;
      matchIdRef.current = "bot_match";
      opponentIdRef.current = "arena_bot";
      setOpponentName("ArenaBot");
      setIsQueueing(false);
      // Create a fake remote player for the bot
      remotePlayerRef.current = {
        id: "arena_bot", username: "ArenaBot",
        x: W / 2, y: H / 4, angle: 0, hp: 100, weapon: "pistol", kills: 0, skin: "#60A5FA",
      };
      toast.info("No opponent found — fighting ArenaBot!");
    }, QUEUE_TIMEOUT_MS);

    return () => {
      active = false;
      if (queueTimeout) clearTimeout(queueTimeout);
      if (queueTicker) clearInterval(queueTicker);
      supabase.removeChannel(queueChannel);
      if (matchChannelRef.current) {
        supabase.removeChannel(matchChannelRef.current);
        matchChannelRef.current = null;
      }
    };
  }, [username]);

  // ── Sync local state to opponent at 50ms intervals ──
  useEffect(() => {
    if (isQueueing) return;
    const channel = matchChannelRef.current;
    if (!channel && opponentIdRef.current !== "arena_bot") return;

    const interval = setInterval(() => {
      const p = playerRef.current;
      if (!p || !channel) return;
      channel.send({
        type: "broadcast",
        event: "player_state",
        payload: {
          id: localPlayerIdRef.current,
          username,
          x: p.x, y: p.y, angle: p.angle,
          hp: p.hp, weapon: p.weapon,
          kills: killsRef.current,
          skin: playerSkin,
        },
      });

      // Send any pending bullets
      if (pendingBulletsRef.current.length > 0) {
        channel.send({
          type: "broadcast",
          event: "bullets_fired",
          payload: {
            ownerId: localPlayerIdRef.current,
            bullets: pendingBulletsRef.current,
          },
        });
        pendingBulletsRef.current = [];
      }
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isQueueing, username, playerSkin]);

  // ── Load user data ──
  useEffect(() => { checkPermissions(); loadUserProgress(); }, []);

  useEffect(() => {
    const now = new Date();
    for (const event of adminAbuseEvents) {
      if (new Date(event.expires_at) > now) {
        if (event.event_type === "godmode") adminStateRef.current.godMode = true;
        else if (event.event_type === "all_weapons") setUnlockedWeapons([...WEAPON_ORDER]);
      }
    }
  }, [adminAbuseEvents]);

  const checkPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
    if (data) { setHasPermission(true); adminStateRef.current.active = true; }
  };

  const loadUserProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: loadout } = await supabase.from("equipped_loadout").select("*").eq("user_id", user.id).maybeSingle();
      if (loadout) {
        const equipped = [loadout.slot_1, loadout.slot_2, loadout.slot_3, loadout.slot_4, loadout.slot_5].filter(Boolean) as Weapon[];
        setUnlockedWeapons(equipped.length > 0 ? equipped : ["pistol"]);
      }
    } catch { setUnlockedWeapons(["pistol"]); }
  };

  const saveProgress = async (s: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || s <= 0) return;
      const { data: p } = await supabase.from("profiles").select("total_score").eq("user_id", user.id).single();
      await supabase.from("profiles").update({ total_score: (p?.total_score || 0) + s }).eq("user_id", user.id);
    } catch {}
  };

  const handleCommand = useCallback((cmd: string) => {
    if (!hasPermission) return;
    if (cmd.startsWith("/godmode")) { adminStateRef.current.godMode = !adminStateRef.current.godMode; }
    else if (cmd.startsWith("/revive")) {
      if (playerRef.current) {
        playerRef.current.hp = 100; setHealth(100); setGameOver(false); gameOverRef.current = false;
        spawnImmunityRef.current = true; setSpawnImmunity(true);
        setTimeout(() => { spawnImmunityRef.current = false; setSpawnImmunity(false); }, 5000);
      }
    }
    else if (cmd.startsWith("/give")) { setUnlockedWeapons([...WEAPON_ORDER]); }
    else if (cmd.startsWith("/heal")) { if (playerRef.current) { playerRef.current.hp = 100; setHealth(100); } }
    else if (cmd.startsWith("/infiniteammo")) { adminStateRef.current.infiniteAmmo = !adminStateRef.current.infiniteAmmo; }
  }, [hasPermission]);

  const handleTouchMove = useCallback((dx: number, dy: number) => { touchMoveRef.current = { x: dx, y: dy }; }, []);
  const handleTouchAim = useCallback((x: number, y: number) => { touchAimRef.current = { x, y }; }, []);
  const handleTouchShoot = useCallback((s: boolean) => { touchShootingRef.current = s; }, []);
  const handleTouchReload = useCallback(() => { if (playerRef.current) { const wc = WEAPONS[playerRef.current.weapon as Weapon]; playerRef.current.ammo = wc.maxAmmo; setAmmo(wc.maxAmmo); } }, []);

  // ── Main game loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    spawnImmunityRef.current = true; setSpawnImmunity(true);
    setTimeout(() => { spawnImmunityRef.current = false; setSpawnImmunity(false); }, 5000);

    const keys: Record<string, boolean> = {};
    const mouse = { x: W / 2, y: H / 2, down: false };
    const player = playerRef.current || {
      x: W / 4 + Math.random() * W / 2,
      y: H / 4 + Math.random() * H / 2,
      r: 14, speed: 200, angle: 0,
      weapon: "pistol" as Weapon,
      lastShot: -1, lastMelee: -1,
      hp: 100, maxHp: 100, score: 0,
      ammo: 10, maxAmmo: 10,
    };
    playerRef.current = player;

    let localBullets: any[] = [];
    let particles: any[] = [];
    let pickups: any[] = [];
    let time = 0;
    let last = performance.now();
    let botShootTimer = 0;

    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    const spawnParticles = (x: number, y: number, color: string, count = 10) => {
      for (let i = 0; i < count; i++) particles.push({ x, y, vx: rand(-150, 150), vy: rand(-150, 150), life: rand(0.2, 0.7), color });
    };

    // Spawn ammo pickups periodically
    let lastPickupSpawn = 0;
    const spawnPickup = () => {
      pickups.push({ x: rand(60, W - 60), y: rand(60, H - 60), r: 10, amt: 5, ttl: 20 });
    };
    // Initial pickups
    for (let i = 0; i < 3; i++) spawnPickup();

    const tryShoot = (t: number) => {
      const weapon = WEAPONS[player.weapon];
      if (weapon.isMelee) {
        if (mouse.down && t - player.lastMelee >= weapon.fireRate) {
          player.lastMelee = t;
          const meleeRange = 50;
          spawnParticles(player.x + Math.cos(player.angle) * meleeRange, player.y + Math.sin(player.angle) * meleeRange, weapon.color, 10);
          // Broadcast melee attack for remote hit detection
          matchChannelRef.current?.send({
            type: "broadcast",
            event: "melee_attack",
            payload: {
              ownerId: localPlayerIdRef.current,
              x: player.x, y: player.y,
              angle: player.angle,
              damage: weapon.damage,
            },
          });
          // Check hit on remote player locally too (for visual feedback)
          const rp = remotePlayerRef.current;
          if (rp) {
            const dx = rp.x - player.x, dy = rp.y - player.y;
            if (Math.hypot(dx, dy) <= meleeRange && Math.abs(Math.atan2(dy, dx) - player.angle) < 0.6) {
              spawnParticles(rp.x, rp.y, weapon.color, 12);
            }
          }
        }
        return;
      }

      const hasInfinite = adminStateRef.current.godMode || adminStateRef.current.infiniteAmmo;
      if (mouse.down && t - player.lastShot >= weapon.fireRate && (hasInfinite || player.ammo > 0)) {
        player.lastShot = t;
        if (!hasInfinite) { player.ammo--; setAmmo(player.ammo); }
        const count = player.weapon === "shotgun" ? 5 : 1;
        const newBullets: any[] = [];
        for (let i = 0; i < count; i++) {
          const spread = weapon.spread * (Math.PI / 180);
          const fa = player.angle + rand(-spread, spread);
          const bx = player.x + Math.cos(player.angle) * player.r * 1.6;
          const by = player.y + Math.sin(player.angle) * player.r * 1.6;
          const bullet = {
            x: bx, y: by,
            vx: Math.cos(fa) * weapon.bulletSpeed,
            vy: Math.sin(fa) * weapon.bulletSpeed,
            r: 8, life: 2.5, dmg: weapon.damage, color: weapon.color,
          };
          localBullets.push(bullet);
          newBullets.push({ x: bx, y: by, vx: bullet.vx, vy: bullet.vy, r: 8, dmg: weapon.damage, color: weapon.color, life: 2.5 });
        }
        // Queue bullets for broadcast
        pendingBulletsRef.current.push(...newBullets);
        spawnParticles(player.x + Math.cos(player.angle) * player.r * 1.6, player.y + Math.sin(player.angle) * player.r * 1.6, weapon.color, 6);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === "r" && !WEAPONS[player.weapon].isMelee) { player.ammo = player.maxAmmo; setAmmo(player.ammo); }
      const n = parseInt(e.key);
      if (n >= 1 && n <= unlockedWeapons.length) {
        const w = unlockedWeapons[n - 1];
        if (w) { player.weapon = w; const wc = WEAPONS[w]; player.ammo = wc.ammo; player.maxAmmo = wc.maxAmmo; setCurrentWeapon(w); setAmmo(wc.ammo); setMaxAmmo(wc.maxAmmo); }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    const handleMouseMove = (e: MouseEvent) => { const r = canvas.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * (W / r.width); mouse.y = (e.clientY - r.top) * (H / r.height); };
    const handleMouseDown = (e: MouseEvent) => { if (e.button === 0) mouse.down = true; };
    const handleMouseUp = (e: MouseEvent) => { if (e.button === 0) mouse.down = false; };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("contextmenu", e => e.preventDefault());

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      time += dt;

      // ── Queue screen ──
      if (isQueueingRef.current) {
        ctx.clearRect(0, 0, W, H);
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#100505");
        grad.addColorStop(1, "#1a0808");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Animated ring
        ctx.save();
        ctx.translate(W / 2, H / 2 - 40);
        ctx.strokeStyle = "#E53935";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 50 + Math.sin(time * 2) * 5, time * 2, time * 2 + Math.PI * 1.5);
        ctx.stroke();
        ctx.strokeStyle = "#FF8A80";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 35 + Math.sin(time * 3) * 3, -time * 3, -time * 3 + Math.PI);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = "#E53935";
        ctx.textAlign = "center";
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("⚔️ ARENA PvP", W / 2, H / 2 + 30);
        ctx.fillStyle = "#FF8A80";
        ctx.font = "18px sans-serif";
        ctx.fillText(`Searching for opponent... ${queueSecondsRef.current}s`, W / 2, H / 2 + 60);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.font = "14px sans-serif";
        ctx.fillText("Bot opponent after 30s", W / 2, H / 2 + 85);

        gameLoopRef.current = requestAnimationFrame(loop);
        return;
      }

      // ── Victory check ──
      if (killsRef.current >= KILL_TARGET && !victoryRef.current) {
        victoryRef.current = true;
        setVictory(true);
        saveProgress(scoreRef.current);
        matchChannelRef.current?.send({
          type: "broadcast",
          event: "match_won",
          payload: { winnerId: localPlayerIdRef.current, winnerUsername: username },
        });
        toast.success(`🏆 Arena Victory! ${KILL_TARGET} kills reached!`);
      }

      // ── Death ──
      if (player.hp <= 0 && !adminStateRef.current.godMode && !gameOverRef.current) {
        // Notify opponent they got the kill
        matchChannelRef.current?.send({
          type: "broadcast",
          event: "player_died",
          payload: {
            victimId: localPlayerIdRef.current,
            victimUsername: username,
            killerId: opponentIdRef.current,
          },
        });

        // Respawn after 3 seconds
        setTimeout(() => {
          if (!victoryRef.current) {
            const nx = rand(60, W - 60);
            const ny = rand(60, H - 60);
            player.x = nx; player.y = ny; player.hp = 100;
            setHealth(100);
            spawnImmunityRef.current = true; setSpawnImmunity(true);
            setTimeout(() => { spawnImmunityRef.current = false; setSpawnImmunity(false); }, 5000);
            matchChannelRef.current?.send({
              type: "broadcast",
              event: "player_respawn",
              payload: { id: localPlayerIdRef.current, x: nx, y: ny },
            });
          }
        }, 3000);

        player.hp = 0;
        setHealth(0);
      }

      // ── Input ──
      if (player.hp > 0) {
        let dx = 0, dy = 0;
        if (touchscreenMode) {
          dx = touchMoveRef.current.x; dy = touchMoveRef.current.y;
          mouse.x = touchAimRef.current.x; mouse.y = touchAimRef.current.y;
          mouse.down = touchShootingRef.current;
        } else {
          if (keys["w"]) dy -= 1; if (keys["s"]) dy += 1;
          if (keys["a"]) dx -= 1; if (keys["d"]) dx += 1;
        }
        player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
        if (dx !== 0 || dy !== 0) {
          const l = Math.hypot(dx, dy); dx /= l; dy /= l;
          player.x = Math.max(20, Math.min(W - 20, player.x + dx * player.speed * dt));
          player.y = Math.max(20, Math.min(H - 20, player.y + dy * player.speed * dt));
        }

        if (!victoryRef.current) tryShoot(time);
      }

      // ── Bot AI ──
      const isBot = opponentIdRef.current === "arena_bot";
      const rp = remotePlayerRef.current;
      if (isBot && rp && rp.hp > 0 && player.hp > 0) {
        // Bot chases player
        const bvx = player.x - rp.x;
        const bvy = player.y - rp.y;
        const bd = Math.hypot(bvx, bvy) || 1;
        const botSpeed = 140;
        rp.angle = Math.atan2(bvy, bvx);

        if (bd > 120) {
          rp.x = Math.max(20, Math.min(W - 20, rp.x + (bvx / bd) * botSpeed * dt));
          rp.y = Math.max(20, Math.min(H - 20, rp.y + (bvy / bd) * botSpeed * dt));
        } else {
          // Strafe
          rp.x = Math.max(20, Math.min(W - 20, rp.x + Math.cos(time * 2) * botSpeed * 0.5 * dt));
          rp.y = Math.max(20, Math.min(H - 20, rp.y + Math.sin(time * 2) * botSpeed * 0.5 * dt));
        }

        // Bot shoots
        botShootTimer -= dt;
        if (botShootTimer <= 0 && bd < 400) {
          botShootTimer = 0.4 + Math.random() * 0.3;
          const bAngle = rp.angle + rand(-0.15, 0.15);
          remoteBulletsRef.current.push({
            x: rp.x + Math.cos(rp.angle) * 20,
            y: rp.y + Math.sin(rp.angle) * 20,
            vx: Math.cos(bAngle) * 380,
            vy: Math.sin(bAngle) * 380,
            r: 6, dmg: 18, color: "#60A5FA", life: 2.5,
            ownerId: "arena_bot",
          });
        }

        // Bot takes damage from local bullets (check in bullet loop below)
      }

      // ── Local bullets update (our bullets) ──
      for (let i = localBullets.length - 1; i >= 0; i--) {
        const b = localBullets[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) { localBullets.splice(i, 1); continue; }

        // Hit remote player
        if (rp && rp.hp > 0) {
          if ((b.x - rp.x) ** 2 + (b.y - rp.y) ** 2 <= (b.r + 14) ** 2) {
            spawnParticles(b.x, b.y, "#FFF", 8);
            if (isBot) {
              rp.hp -= b.dmg;
              if (rp.hp <= 0) {
                spawnParticles(rp.x, rp.y, "#60A5FA", 20);
                killsRef.current++;
                setKills(killsRef.current);
                setScore(prev => prev + 50);
                toast.success("Eliminated ArenaBot!");
                // Respawn bot
                setTimeout(() => {
                  if (rp) {
                    rp.hp = 100;
                    rp.x = rand(60, W - 60);
                    rp.y = rand(60, H - 60);
                  }
                }, 3000);
              }
            }
            localBullets.splice(i, 1);
            continue;
          }
        }
      }

      // ── Remote bullets update (opponent's bullets hitting us) ──
      const isImmune = spawnImmunityRef.current;
      for (let i = remoteBulletsRef.current.length - 1; i >= 0; i--) {
        const b = remoteBulletsRef.current[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
          remoteBulletsRef.current.splice(i, 1); continue;
        }
        // Hit local player
        if (player.hp > 0 && (b.x - player.x) ** 2 + (b.y - player.y) ** 2 <= (b.r + player.r) ** 2) {
          if (!adminStateRef.current.godMode && !isImmune) {
            player.hp -= b.dmg;
            setHealth(Math.max(0, player.hp));
            spawnParticles(b.x, b.y, "#FF5252", 6);
          }
          remoteBulletsRef.current.splice(i, 1);
        }
      }

      // ── Pickups ──
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i]; p.ttl -= dt;
        if (p.ttl <= 0) { pickups.splice(i, 1); continue; }
        if (player.hp > 0 && (player.x - p.x) ** 2 + (player.y - p.y) ** 2 <= (player.r + p.r) ** 2) {
          if (!WEAPONS[player.weapon].isMelee) { player.ammo = Math.min(player.maxAmmo, player.ammo + p.amt); setAmmo(player.ammo); }
          pickups.splice(i, 1);
        }
      }
      // Spawn new pickups
      if (time - lastPickupSpawn > 10) { lastPickupSpawn = time; spawnPickup(); }

      // ── Particles ──
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // ═══════ DRAW ═══════
      ctx.clearRect(0, 0, W, H);

      // Arena background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#100505");
      bgGrad.addColorStop(1, "#1a0808");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Arena border
      ctx.save();
      ctx.strokeStyle = "#E53935"; ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, W - 20, H - 20);
      ctx.restore();

      // Grid
      ctx.save(); ctx.globalAlpha = 0.06; ctx.strokeStyle = "#E53935";
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();

      // ── Draw pickups ──
      for (const p of pickups) {
        ctx.save(); ctx.translate(p.x, p.y);
        ctx.fillStyle = "#A6FFB3"; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // ── Draw remote player ──
      if (rp && rp.hp > 0) {
        ctx.save();
        ctx.translate(rp.x, rp.y);
        ctx.rotate(rp.angle);
        ctx.fillStyle = rp.skin || "#60A5FA";
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
        // Gun
        ctx.fillStyle = WEAPONS[rp.weapon]?.color || "#888";
        ctx.fillRect(12, -5, 16, 10);
        ctx.restore();

        // Name tag
        ctx.save();
        ctx.fillStyle = "#fff"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(rp.username, rp.x, rp.y - 24);
        ctx.restore();

        // Health bar
        ctx.save();
        ctx.fillStyle = "#333"; ctx.fillRect(rp.x - 16, rp.y - 20, 32, 4);
        ctx.fillStyle = rp.hp > 50 ? "#22c55e" : rp.hp > 25 ? "#eab308" : "#ef4444";
        ctx.fillRect(rp.x - 16, rp.y - 20, 32 * Math.max(0, rp.hp / 100), 4);
        ctx.restore();
      } else if (rp && rp.hp <= 0) {
        // Dead indicator
        ctx.save();
        ctx.fillStyle = "rgba(255,50,50,0.3)"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("💀", rp.x, rp.y);
        ctx.restore();
      }

      // ── Draw local bullets ──
      for (const b of localBullets) {
        ctx.save(); ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // ── Draw remote bullets ──
      for (const b of remoteBulletsRef.current) {
        ctx.save(); ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // ── Draw player ──
      if (player.hp > 0) {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath(); ctx.ellipse(player.x, player.y + player.r * 0.8, player.r * 1.1, player.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);
        if (spawnImmunityRef.current) {
          ctx.strokeStyle = "#E53935"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, player.r + 5, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = playerSkin;
        ctx.beginPath(); ctx.arc(0, 0, player.r, 0, Math.PI * 2); ctx.fill();
        // Eye
        ctx.fillStyle = "#2b2b2b";
        ctx.beginPath(); ctx.arc(player.r * 0.45, -4, 3.5, 0, Math.PI * 2); ctx.fill();
        // Weapon
        ctx.fillStyle = WEAPONS[player.weapon].color;
        if (WEAPONS[player.weapon].isMelee) ctx.fillRect(player.r - 2, -3, 25, 6);
        else ctx.fillRect(player.r - 2, -6, 18, 12);
        ctx.restore();

        // Username
        ctx.save();
        ctx.fillStyle = "#fff"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(username, player.x, player.y - 24);
        ctx.restore();
      } else {
        // Death screen overlay
        ctx.fillStyle = "rgba(20,0,0,0.7)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#E53935"; ctx.font = "bold 42px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("ELIMINATED", W / 2, H / 2 - 20);
        ctx.fillStyle = "#FF8A80"; ctx.font = "20px sans-serif";
        ctx.fillText("Respawning in 3s...", W / 2, H / 2 + 20);
      }

      // ── Draw particles ──
      for (const p of particles) {
        ctx.save(); ctx.globalAlpha = Math.max(0, p.life / 0.7);
        ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        ctx.restore();
      }

      // ── Crosshair ──
      ctx.save(); ctx.strokeStyle = "#E53935"; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(mouse.x - 10, mouse.y); ctx.lineTo(mouse.x + 10, mouse.y);
      ctx.moveTo(mouse.x, mouse.y - 10); ctx.lineTo(mouse.x, mouse.y + 10); ctx.stroke();
      ctx.restore();

      // ── Kill progress HUD ──
      ctx.save();
      const hudY = 8;
      ctx.fillStyle = "rgba(229,57,53,0.12)"; ctx.fillRect(W / 2 - 150, hudY, 300, 44);
      ctx.strokeStyle = "#E53935"; ctx.lineWidth = 1; ctx.strokeRect(W / 2 - 150, hudY, 300, 44);

      // My kills
      ctx.fillStyle = "#fff"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`${username}: ${killsRef.current}`, W / 2 - 140, hudY + 18);

      // Opponent kills
      ctx.textAlign = "right";
      ctx.fillStyle = "#FF8A80";
      ctx.fillText(`${opponentName || "???"}: ${rp?.kills ?? 0}`, W / 2 + 140, hudY + 18);

      // Progress bar
      ctx.fillStyle = "rgba(229,57,53,0.2)"; ctx.fillRect(W / 2 - 140, hudY + 26, 280, 10);
      // My progress (left, red)
      ctx.fillStyle = "#E53935";
      ctx.fillRect(W / 2 - 140, hudY + 26, 140 * Math.min(1, killsRef.current / KILL_TARGET), 10);
      // Opponent progress (right, blue)
      ctx.fillStyle = "#60A5FA";
      const opKills = rp?.kills ?? 0;
      ctx.fillRect(W / 2 + 140 - 140 * Math.min(1, opKills / KILL_TARGET), hudY + 26, 140 * Math.min(1, opKills / KILL_TARGET), 10);

      // Center target
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`First to ${KILL_TARGET}`, W / 2, hudY + 35);

      if (victoryRef.current) {
        ctx.fillStyle = "#22c55e"; ctx.font = "bold 16px sans-serif";
        ctx.fillText("🏆 VICTORY!", W / 2, hudY + 18);
      }
      ctx.restore();

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [unlockedWeapons, playerSkin, touchscreenMode, username]);

  return (
    <div className="relative">
      <div className="fixed left-4 top-4 bg-card/80 backdrop-blur-sm border border-red-500/30 rounded-lg p-4 space-y-2 z-10">
        <div className="font-bold text-lg text-red-400">⚔️ Arena PvP</div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div><span className="text-red-400 font-mono">WASD</span> move</div>
          <div><span className="text-red-400 font-mono">Mouse</span> aim & shoot</div>
          <div><span className="text-red-400 font-mono">R</span> reload</div>
          <div><span className="text-red-400 font-mono">1-9</span> switch weapons</div>
          <div className="text-red-300 text-xs mt-2">First to {KILL_TARGET} kills wins!</div>
        </div>
      </div>

      <div className="fixed right-4 top-4 bg-card/80 backdrop-blur-sm border border-red-500/30 rounded-lg p-4 space-y-3 min-w-[180px] z-10">
        <div className="text-center font-bold text-red-400">
          {victory ? "🏆 VICTORY!" : `${kills}/${KILL_TARGET} Kills`}
        </div>
        <div className="text-xs text-muted-foreground">
          vs: <span className="text-foreground font-medium">
            {opponentName ? `${opponentName}${opponentIdRef.current === "arena_bot" ? " (Bot)" : ""}` : "Queueing..."}
          </span>
          {opponentName && <span className="text-red-300 ml-1">({opponentKills} kills)</span>}
        </div>
        <div className="flex justify-between"><span className="text-sm text-muted-foreground">Health</span><span className="font-bold">{Math.round(health)}</span></div>
        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
          <div className="bg-gradient-to-r from-red-700 to-red-400 h-full transition-all" style={{ width: `${(health / maxHealth) * 100}%` }} />
        </div>
        {spawnImmunity && <div className="flex items-center gap-2 text-red-400 text-sm"><Shield className="w-4 h-4" /><span>Protected</span></div>}
        <div className="flex justify-between"><span className="text-sm text-muted-foreground">Weapon</span><span className="font-bold" style={{ color: WEAPONS[currentWeapon].color }}>{WEAPONS[currentWeapon].name}</span></div>
        {!WEAPONS[currentWeapon].isMelee && <div className="flex justify-between"><span className="text-sm text-muted-foreground">Ammo</span><span className="font-bold">{ammo}/{maxAmmo}</span></div>}
        <div className="pt-2 border-t border-red-500/20">
          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Score</span><span className="font-bold text-red-400">{score}</span></div>
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border border-red-500/30 rounded-lg p-2 flex gap-2 z-10">
        {unlockedWeapons.map((weapon, index) => (
          <div key={weapon}
            className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${currentWeapon === weapon ? "bg-red-600 text-white ring-2 ring-red-400" : "bg-secondary hover:bg-secondary/80"}`}
            onClick={() => {
              if (playerRef.current) {
                playerRef.current.weapon = weapon;
                const wc = WEAPONS[weapon];
                playerRef.current.ammo = wc.ammo;
                playerRef.current.maxAmmo = wc.maxAmmo;
                setCurrentWeapon(weapon);
                setAmmo(wc.ammo);
                setMaxAmmo(wc.maxAmmo);
              }
            }}>
            <span className="text-xs opacity-70">{index + 1}</span>
            <span className="text-xs font-medium text-center">{WEAPONS[weapon].name}</span>
          </div>
        ))}
      </div>

      <canvas ref={canvasRef} width={W} height={H} className="border-2 border-red-500/30 rounded-lg shadow-2xl" />

      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={() => { if (score > 0) saveProgress(scoreRef.current); onBack(); }}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Menu
        </Button>
        <Button variant="outline" onClick={() => setChatOpen(!chatOpen)}>
          <MessageSquare className="w-4 h-4 mr-2" />Console
        </Button>
      </div>

      <AdminChat open={chatOpen} onOpenChange={setChatOpen} onCommand={handleCommand} onShowOnlinePlayers={() => {}} />
      {touchscreenMode && <TouchControls onMove={handleTouchMove} onAim={handleTouchAim} onShoot={handleTouchShoot} onReload={handleTouchReload} canvasWidth={W} canvasHeight={H} />}
    </div>
  );
};
