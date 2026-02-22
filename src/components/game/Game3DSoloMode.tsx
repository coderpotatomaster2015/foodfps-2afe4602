import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text, Plane } from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Shield, Camera } from "lucide-react";
import { AdminChat } from "./AdminChat";
import { OnlinePlayersModal } from "./OnlinePlayersModal";
import { BanModal } from "./BanModal";
import { TouchControls } from "./TouchControls";
import type { GameMode } from "@/pages/Index";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────
interface Game3DSoloModeProps {
  mode: GameMode;
  username: string;
  roomCode: string;
  onBack: () => void;
  adminAbuseEvents?: { event_type: string; expires_at: string }[];
  touchscreenMode?: boolean;
  playerSkin?: string;
}

type Weapon = "pistol" | "shotgun" | "minigun" | "sniper" | "sword" | "knife" | "axe" | "rifle" | "smg" | "rpg" | "flamethrower" | "railgun" | "crossbow" | "laser_pistol" | "grenade_launcher" | "katana" | "dual_pistols" | "plasma_rifle" | "boomerang" | "whip" | "freeze_ray" | "harpoon_gun";

interface WeaponConfig {
  name: string; fireRate: number; damage: number; ammo: number; maxAmmo: number;
  spread: number; bulletSpeed: number; color: string; isMelee: boolean; unlockScore: number;
}

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

// ── Game scale: 1 unit = ~1 meter ──────────────────────────────────────
const ARENA_W = 48; // 48 meters wide
const ARENA_H = 32; // 32 meters tall
const SCALE = ARENA_W / 960; // conversion from old pixel coords

// ── Shared mutable game state (passed via ref to Three.js scene) ──────
interface Enemy3D {
  id: string; x: number; z: number; r: number; speed: number;
  hp: number; maxHp: number; color: string; stun: number; lastShot: number;
}
interface Bullet3D {
  x: number; z: number; vx: number; vz: number; r: number;
  life: number; dmg: number; color: string;
}
interface Pickup3D {
  x: number; z: number; r: number; amt: number; ttl: number;
}
interface Particle3D {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  life: number; color: string;
}
interface PlayerState {
  x: number; z: number; r: number; speed: number; angle: number;
  weapon: Weapon; lastShot: number; lastMelee: number;
  hp: number; maxHp: number; score: number; ammo: number; maxAmmo: number;
}

interface GameState {
  player: PlayerState;
  enemies: Enemy3D[];
  bullets: Bullet3D[];
  enemyBullets: Bullet3D[];
  pickups: Pickup3D[];
  particles: Particle3D[];
  keys: Record<string, boolean>;
  mouseDown: boolean;
  mouseNDC: { x: number; y: number }; // normalised device coords for raycasting
  time: number;
  lastSpawn: number;
  spawnInterval: number;
  gameOver: boolean;
  cameraMode: "fps" | "topdown";
  godMode: boolean;
  infiniteAmmo: boolean;
  speedMultiplier: number;
  spawnImmune: boolean;
  aimbot: boolean;
}

// ── 3D Scene (runs inside Canvas) ─────────────────────────────────────
const GameScene = ({ gs, onStateChange }: { gs: React.MutableRefObject<GameState>; onStateChange: () => void }) => {
  const { camera, gl } = useThree();
  const groundRef = useRef<THREE.Mesh>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouseVec = useMemo(() => new THREE.Vector2(), []);
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  // Update camera based on mode
  const updateCamera = useCallback(() => {
    const p = gs.current.player;
    if (gs.current.cameraMode === "fps") {
      // First person: camera at player position, looking forward
      const eyeHeight = 1.6;
      camera.position.set(p.x, eyeHeight, p.z);
      const lookX = p.x + Math.cos(p.angle) * 10;
      const lookZ = p.z + Math.sin(p.angle) * 10;
      camera.lookAt(lookX, eyeHeight * 0.9, lookZ);
      (camera as THREE.PerspectiveCamera).fov = 75;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    } else {
      // Top-down isometric
      const height = 35;
      camera.position.set(p.x, height, p.z + 15);
      camera.lookAt(p.x, 0, p.z);
      (camera as THREE.PerspectiveCamera).fov = 50;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
  }, [camera, gs]);

  // Mouse move handler to get aim direction
  useEffect(() => {
    const canvas = gl.domElement;
    const handleMouseMove = (e: MouseEvent) => {
      // Skip mouse aim when aimbot is active
      if (gs.current.aimbot) return;
      
      const rect = canvas.getBoundingClientRect();
      gs.current.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      gs.current.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycast to ground plane to get aim point
      mouseVec.set(gs.current.mouseNDC.x, gs.current.mouseNDC.y);
      raycaster.setFromCamera(mouseVec, camera);
      const hit = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, hit);
      if (hit) {
        const p = gs.current.player;
        p.angle = Math.atan2(hit.z - p.z, hit.x - p.x);
      }
    };
    const handleMouseDown = (e: MouseEvent) => { if (e.button === 0) gs.current.mouseDown = true; };
    const handleMouseUp = (e: MouseEvent) => { if (e.button === 0) gs.current.mouseDown = false; };
    const handleContextMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("contextmenu", handleContextMenu);
    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [gl, camera, gs, raycaster, mouseVec, groundPlane]);

  // Main game loop running in Three.js frame
  useFrame((_, delta) => {
    const dt = Math.min(0.033, delta);
    const g = gs.current;
    g.time += dt;
    const p = g.player;

    if (p.hp <= 0 && !g.godMode) {
      if (!g.gameOver) {
        g.gameOver = true;
        onStateChange();
      }
      updateCamera();
      return;
    }

    // ── Aimbot: auto-aim at nearest enemy ──
    if (g.aimbot && g.enemies.length > 0) {
      let nearest: Enemy3D | null = null;
      let nearestDist = Infinity;
      for (const e of g.enemies) {
        const d = Math.hypot(e.x - p.x, e.z - p.z);
        if (d < nearestDist) { nearestDist = d; nearest = e; }
      }
      if (nearest) {
        p.angle = Math.atan2(nearest.z - p.z, nearest.x - p.x);
        g.mouseDown = true; // auto-shoot
      }
    }

    // ── Movement ──
    let dx = 0, dz = 0;
    if (g.keys["w"] || g.keys["arrowup"]) dz -= 1;
    if (g.keys["s"] || g.keys["arrowdown"]) dz += 1;
    if (g.keys["a"] || g.keys["arrowleft"]) dx -= 1;
    if (g.keys["d"] || g.keys["arrowright"]) dx += 1;

    if (dx !== 0 || dz !== 0) {
      const len = Math.hypot(dx, dz);
      dx /= len; dz /= len;
      const spd = p.speed * g.speedMultiplier * dt;
      p.x = Math.max(-ARENA_W / 2 + 1, Math.min(ARENA_W / 2 - 1, p.x + dx * spd));
      p.z = Math.max(-ARENA_H / 2 + 1, Math.min(ARENA_H / 2 - 1, p.z + dz * spd));
    }

    // ── Shooting ──
    const weapon = WEAPONS[p.weapon];
    if (weapon.isMelee) {
      if (g.mouseDown && g.time - p.lastMelee >= weapon.fireRate) {
        p.lastMelee = g.time;
        const meleeRange = 2.5;
        for (let i = g.enemies.length - 1; i >= 0; i--) {
          const e = g.enemies[i];
          const d = Math.hypot(e.x - p.x, e.z - p.z);
          const angleToEnemy = Math.atan2(e.z - p.z, e.x - p.x);
          const angleDiff = Math.abs(angleToEnemy - p.angle);
          if (d <= meleeRange && angleDiff < 0.5) {
            e.hp -= weapon.damage;
            e.stun = 0.6;
            if (e.hp <= 0) {
              p.score += 10;
              if (Math.random() < 0.35) g.pickups.push({ x: e.x, z: e.z, r: 0.5, amt: 2, ttl: 18 });
              g.enemies.splice(i, 1);
            }
          }
        }
        onStateChange();
      }
    } else {
      const fireRate = g.godMode ? 0 : weapon.fireRate;
      const hasInfiniteAmmo = g.godMode || g.infiniteAmmo;
      if (g.mouseDown && g.time - p.lastShot >= fireRate && (hasInfiniteAmmo || p.ammo > 0)) {
        p.lastShot = g.time;
        if (!hasInfiniteAmmo) p.ammo--;

        const bulletsToFire = p.weapon === "shotgun" ? 5 : 1;
        for (let i = 0; i < bulletsToFire; i++) {
          const spread = weapon.spread * (Math.PI / 180);
          const finalAngle = p.angle + (Math.random() - 0.5) * spread * 2;
          const speed = weapon.bulletSpeed * SCALE;
          g.bullets.push({
            x: p.x + Math.cos(p.angle) * 0.8,
            z: p.z + Math.sin(p.angle) * 0.8,
            vx: Math.cos(finalAngle) * speed,
            vz: Math.sin(finalAngle) * speed,
            r: 0.15,
            life: 2.5,
            dmg: weapon.damage,
            color: weapon.color,
          });
        }
        onStateChange();
      }
    }

    // ── Update bullets ──
    for (let i = g.bullets.length - 1; i >= 0; i--) {
      const b = g.bullets[i];
      b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt;
      if (b.life <= 0 || Math.abs(b.x) > ARENA_W || Math.abs(b.z) > ARENA_H) {
        g.bullets.splice(i, 1); continue;
      }
      for (let j = g.enemies.length - 1; j >= 0; j--) {
        const e = g.enemies[j];
        if (Math.hypot(b.x - e.x, b.z - e.z) < e.r + b.r) {
          e.hp -= b.dmg; e.stun = 0.6;
          // Particles
          for (let k = 0; k < 5; k++) {
            g.particles.push({ x: b.x, y: 0.5, z: b.z, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 4, life: 0.5, color: "#FFF3D6" });
          }
          if (e.hp <= 0) {
            p.score += 10;
            for (let k = 0; k < 10; k++) {
              g.particles.push({ x: e.x, y: 0.5, z: e.z, vx: (Math.random() - 0.5) * 6, vy: Math.random() * 5, vz: (Math.random() - 0.5) * 6, life: 0.8, color: e.color });
            }
            if (Math.random() < 0.35) g.pickups.push({ x: e.x, z: e.z, r: 0.5, amt: 2, ttl: 18 });
            g.enemies.splice(j, 1);
          }
          g.bullets.splice(i, 1);
          onStateChange();
          break;
        }
      }
    }

    // ── Update enemy bullets ──
    for (let i = g.enemyBullets.length - 1; i >= 0; i--) {
      const b = g.enemyBullets[i];
      b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt;
      if (b.life <= 0 || Math.abs(b.x) > ARENA_W || Math.abs(b.z) > ARENA_H) {
        g.enemyBullets.splice(i, 1); continue;
      }
      if (Math.hypot(b.x - p.x, b.z - p.z) < p.r + b.r) {
        if (!g.godMode && !g.spawnImmune) {
          p.hp -= b.dmg;
          onStateChange();
        }
        g.enemyBullets.splice(i, 1);
      }
    }

    // ── Update enemies ──
    for (const e of g.enemies) {
      if (e.stun > 0) { e.stun -= dt; continue; }
      const vx = p.x - e.x, vz = p.z - e.z;
      const d = Math.hypot(vx, vz);
      if (d > 0) { e.x += (vx / d) * e.speed * dt; e.z += (vz / d) * e.speed * dt; }
      // Contact damage
      if (d < p.r + e.r && !g.godMode && !g.spawnImmune) {
        p.hp -= 5 * dt;
        onStateChange();
      }
      // Enemy shooting
      if (d < 17.5 && g.time - e.lastShot >= 3.5) {
        e.lastShot = g.time;
        const ang = Math.atan2(p.z - e.z, p.x - e.x);
        const spd = 10 * SCALE;
        g.enemyBullets.push({ x: e.x, z: e.z, vx: Math.cos(ang) * spd, vz: Math.sin(ang) * spd, r: 0.3, life: 3, dmg: 10, color: "#FF4444" });
      }
    }

    // ── Update pickups ──
    for (let i = g.pickups.length - 1; i >= 0; i--) {
      const pk = g.pickups[i];
      pk.ttl -= dt;
      if (pk.ttl <= 0) { g.pickups.splice(i, 1); continue; }
      if (Math.hypot(pk.x - p.x, pk.z - p.z) < p.r + pk.r) {
        if (!weapon.isMelee) { p.ammo = Math.min(p.maxAmmo, p.ammo + pk.amt); }
        g.pickups.splice(i, 1);
        onStateChange();
      }
    }

    // ── Update particles ──
    for (let i = g.particles.length - 1; i >= 0; i--) {
      const pt = g.particles[i];
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.z += pt.vz * dt;
      pt.vy -= 9.8 * dt; // gravity
      pt.life -= dt;
      if (pt.life <= 0 || pt.y < -1) g.particles.splice(i, 1);
    }

    // ── Spawn enemies ──
    if (g.time - g.lastSpawn > g.spawnInterval) {
      g.lastSpawn = g.time;
      const side = Math.floor(Math.random() * 4);
      let ex = 0, ez = 0;
      const hw = ARENA_W / 2, hh = ARENA_H / 2;
      if (side === 0) { ex = (Math.random() - 0.5) * ARENA_W; ez = -hh - 2; }
      else if (side === 1) { ex = (Math.random() - 0.5) * ARENA_W; ez = hh + 2; }
      else if (side === 2) { ex = -hw - 2; ez = (Math.random() - 0.5) * ARENA_H; }
      else { ex = hw + 2; ez = (Math.random() - 0.5) * ARENA_H; }
      g.enemies.push({
        id: `e_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        x: ex, z: ez, r: 0.8,
        speed: 2 + Math.random() * 2,
        hp: 60, maxHp: 60,
        color: "#FF6B6B", stun: 0, lastShot: -1,
      });
      if (g.spawnInterval > 0.6) g.spawnInterval *= 0.993;
    }

    updateCamera();
  });

  // ── Render 3D scene ──
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[20, 40, 15]} intensity={1.0} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-far={100} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} />
      <pointLight position={[0, 8, 0]} intensity={0.4} color="#FFB84D" distance={40} />
      <pointLight position={[-15, 6, -10]} intensity={0.2} color="#6BAFFF" distance={25} />
      <pointLight position={[15, 6, 10]} intensity={0.2} color="#FF6B6B" distance={25} />
      <hemisphereLight args={["#1a2040", "#0a0e14", 0.3]} />

      {/* Sky dome */}
      <mesh>
        <sphereGeometry args={[200, 64, 64]} />
        <meshBasicMaterial color="#060a14" side={THREE.BackSide} />
      </mesh>

      {/* Stars */}
      <StarField />

      {/* Ground with better texture */}
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ARENA_W, ARENA_H]} />
        <meshStandardMaterial color="#141822" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Ground detail - secondary layer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[ARENA_W - 0.5, ARENA_H - 0.5]} />
        <meshStandardMaterial color="#181d2a" roughness={0.85} metalness={0.05} transparent opacity={0.8} />
      </mesh>

      {/* Grid lines on ground */}
      <gridHelper args={[Math.max(ARENA_W, ARENA_H), 32, "#1b3444", "#0d1520"]} position={[0, 0.01, 0]} />

      {/* Arena walls with glow effect */}
      <ArenaWalls />

      {/* Cover objects / environment */}
      <EnvironmentObjects />

      {/* Player (only visible in top-down) */}
      {gs.current.cameraMode === "topdown" && <PlayerMesh gs={gs} />}

      {/* FPS weapon model */}
      {gs.current.cameraMode === "fps" && <FPSWeaponModel gs={gs} />}

      {/* Enemies */}
      {gs.current.enemies.map((e) => <EnemyMesh key={e.id} enemy={e} />)}

      {/* Player bullets */}
      {gs.current.bullets.map((b, i) => <BulletMesh key={`pb_${i}`} bullet={b} />)}

      {/* Enemy bullets */}
      {gs.current.enemyBullets.map((b, i) => <BulletMesh key={`eb_${i}`} bullet={b} />)}

      {/* Pickups */}
      {gs.current.pickups.map((pk, i) => <PickupMesh key={`pk_${i}`} pickup={pk} />)}

      {/* Particles */}
      {gs.current.particles.map((pt, i) => <ParticleMesh key={`pt_${i}`} particle={pt} />)}

      {/* Crosshair in FPS mode */}
      {gs.current.cameraMode === "fps" && <FPSCrosshair />}

      {/* Fog effect */}
      <fog attach="fog" args={["#060a14", 30, 80]} />
    </>
  );
};

// ── Sub-components ────────────────────────────────────────────────────

const StarField = () => {
  const starsRef = useRef<THREE.Points>(null);
  const [positions] = useState(() => {
    const pos = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const r = 150 + Math.random() * 40;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return pos;
  });
  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={200} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.4} sizeAttenuation transparent opacity={0.7} />
    </points>
  );
};

const EnvironmentObjects = () => {
  // Static cover objects placed around the arena
  const objects = useMemo(() => {
    const hw = ARENA_W / 2 - 3, hh = ARENA_H / 2 - 3;
    return [
      // Crates
      { pos: [8, 0.75, 5] as [number, number, number], size: [1.5, 1.5, 1.5] as [number, number, number], color: "#5a3a1a" },
      { pos: [-10, 0.75, -7] as [number, number, number], size: [1.5, 1.5, 1.5] as [number, number, number], color: "#5a3a1a" },
      { pos: [15, 0.75, -10] as [number, number, number], size: [1.5, 1.5, 1.5] as [number, number, number], color: "#4a2a10" },
      { pos: [-5, 0.75, 12] as [number, number, number], size: [1.5, 1.5, 1.5] as [number, number, number], color: "#5a3a1a" },
      // Tall barriers
      { pos: [0, 1.5, -8] as [number, number, number], size: [4, 3, 0.5] as [number, number, number], color: "#2a3545" },
      { pos: [-12, 1.5, 3] as [number, number, number], size: [0.5, 3, 4] as [number, number, number], color: "#2a3545" },
      { pos: [12, 1.5, 8] as [number, number, number], size: [0.5, 3, 4] as [number, number, number], color: "#2a3545" },
      // Low cover
      { pos: [5, 0.5, -3] as [number, number, number], size: [3, 1, 0.8] as [number, number, number], color: "#333d4a" },
      { pos: [-7, 0.5, 7] as [number, number, number], size: [3, 1, 0.8] as [number, number, number], color: "#333d4a" },
      // Pillars
      { pos: [-18, 2, -12] as [number, number, number], size: [1, 4, 1] as [number, number, number], color: "#3a4555" },
      { pos: [18, 2, 12] as [number, number, number], size: [1, 4, 1] as [number, number, number], color: "#3a4555" },
      { pos: [18, 2, -12] as [number, number, number], size: [1, 4, 1] as [number, number, number], color: "#3a4555" },
      { pos: [-18, 2, 12] as [number, number, number], size: [1, 4, 1] as [number, number, number], color: "#3a4555" },
    ];
  }, []);

  return (
    <group>
      {objects.map((obj, i) => (
        <mesh key={i} position={obj.pos} castShadow receiveShadow>
          <boxGeometry args={obj.size} />
          <meshStandardMaterial color={obj.color} roughness={0.8} metalness={0.1} />
        </mesh>
      ))}
      {/* Glowing floor markers */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[2, 2.3, 32]} />
        <meshBasicMaterial color="#FFB84D" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[4, 4.2, 32]} />
        <meshBasicMaterial color="#FFB84D" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const ArenaWalls = () => {
  const hw = ARENA_W / 2, hh = ARENA_H / 2;
  const wallH = 4, wallThick = 0.4;
  return (
    <group>
      {/* North */}
      <mesh position={[0, wallH / 2, -hh]} castShadow>
        <boxGeometry args={[ARENA_W, wallH, wallThick]} />
        <meshStandardMaterial color="#1a2535" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* North wall top glow */}
      <mesh position={[0, wallH, -hh]}>
        <boxGeometry args={[ARENA_W, 0.1, wallThick + 0.1]} />
        <meshStandardMaterial color="#FFB84D" emissive="#FFB84D" emissiveIntensity={0.5} transparent opacity={0.6} />
      </mesh>
      {/* South */}
      <mesh position={[0, wallH / 2, hh]} castShadow>
        <boxGeometry args={[ARENA_W, wallH, wallThick]} />
        <meshStandardMaterial color="#1a2535" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, wallH, hh]}>
        <boxGeometry args={[ARENA_W, 0.1, wallThick + 0.1]} />
        <meshStandardMaterial color="#FFB84D" emissive="#FFB84D" emissiveIntensity={0.5} transparent opacity={0.6} />
      </mesh>
      {/* West */}
      <mesh position={[-hw, wallH / 2, 0]} castShadow>
        <boxGeometry args={[wallThick, wallH, ARENA_H]} />
        <meshStandardMaterial color="#1a2535" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[-hw, wallH, 0]}>
        <boxGeometry args={[wallThick + 0.1, 0.1, ARENA_H]} />
        <meshStandardMaterial color="#6BAFFF" emissive="#6BAFFF" emissiveIntensity={0.5} transparent opacity={0.6} />
      </mesh>
      {/* East */}
      <mesh position={[hw, wallH / 2, 0]} castShadow>
        <boxGeometry args={[wallThick, wallH, ARENA_H]} />
        <meshStandardMaterial color="#1a2535" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[hw, wallH, 0]}>
        <boxGeometry args={[wallThick + 0.1, 0.1, ARENA_H]} />
        <meshStandardMaterial color="#6BAFFF" emissive="#6BAFFF" emissiveIntensity={0.5} transparent opacity={0.6} />
      </mesh>
    </group>
  );
};

const PlayerMesh = ({ gs }: { gs: React.MutableRefObject<GameState> }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!meshRef.current) return;
    const p = gs.current.player;
    meshRef.current.position.set(p.x, 0.7, p.z);
    meshRef.current.rotation.y = -p.angle + Math.PI / 2;
  });
  return (
    <group>
      <mesh ref={meshRef} castShadow>
        <capsuleGeometry args={[0.5, 0.8, 8, 16]} />
        <meshStandardMaterial color="#FFF3D6" />
      </mesh>
    </group>
  );
};

const FPSWeaponModel = ({ gs }: { gs: React.MutableRefObject<GameState> }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useFrame(() => {
    if (!groupRef.current) return;
    // Position weapon relative to camera (bottom right of view)
    const offset = new THREE.Vector3(0.4, -0.3, -0.7);
    offset.applyQuaternion(camera.quaternion);
    groupRef.current.position.copy(camera.position).add(offset);
    groupRef.current.quaternion.copy(camera.quaternion);
  });
  const weapon = WEAPONS[gs.current.player.weapon];
  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={weapon.isMelee ? [0.06, 0.06, 0.6] : [0.1, 0.08, 0.4]} />
        <meshStandardMaterial color={weapon.color} />
      </mesh>
      {/* Gun grip */}
      {!weapon.isMelee && (
        <mesh position={[0, -0.08, 0.1]}>
          <boxGeometry args={[0.06, 0.12, 0.08]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      )}
    </group>
  );
};

const EnemyMesh = ({ enemy }: { enemy: Enemy3D }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => new THREE.Color(enemy.color), [enemy.color]);
  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.set(enemy.x, 0.7, enemy.z);
  });
  return (
    <group>
      <mesh ref={meshRef} castShadow>
        <capsuleGeometry args={[enemy.r * 0.6, enemy.r, 8, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
      </mesh>
      {/* Health bar */}
      <mesh position={[enemy.x, 1.8, enemy.z]}>
        <planeGeometry args={[1.4, 0.15]} />
        <meshBasicMaterial color="#333" />
      </mesh>
      <mesh position={[enemy.x - 0.7 * (1 - enemy.hp / enemy.maxHp) / 2, 1.8, enemy.z + 0.01]}>
        <planeGeometry args={[1.4 * Math.max(0, enemy.hp / enemy.maxHp), 0.12]} />
        <meshBasicMaterial color={enemy.color} />
      </mesh>
    </group>
  );
};

const BulletMesh = ({ bullet }: { bullet: Bullet3D }) => {
  const color = useMemo(() => new THREE.Color(bullet.color), [bullet.color]);
  return (
    <mesh position={[bullet.x, 0.5, bullet.z]}>
      <sphereGeometry args={[bullet.r, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
    </mesh>
  );
};

const PickupMesh = ({ pickup }: { pickup: Pickup3D }) => (
  <mesh position={[pickup.x, 0.3 + Math.sin(pickup.ttl * 3) * 0.15, pickup.z]}>
    <sphereGeometry args={[pickup.r, 12, 12]} />
    <meshStandardMaterial color="#A6FFB3" emissive="#A6FFB3" emissiveIntensity={0.5} />
  </mesh>
);

const ParticleMesh = ({ particle }: { particle: Particle3D }) => {
  const color = useMemo(() => new THREE.Color(particle.color), [particle.color]);
  return (
    <mesh position={[particle.x, particle.y, particle.z]}>
      <boxGeometry args={[0.08, 0.08, 0.08]} />
      <meshBasicMaterial color={color} transparent opacity={Math.max(0, particle.life)} />
    </mesh>
  );
};

const FPSCrosshair = () => {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    const dir = new THREE.Vector3(0, 0, -2);
    dir.applyQuaternion(camera.quaternion);
    groupRef.current.position.copy(camera.position).add(dir);
    groupRef.current.quaternion.copy(camera.quaternion);
  });
  return (
    <group ref={groupRef}>
      <mesh>
        <ringGeometry args={[0.015, 0.025, 32]} />
        <meshBasicMaterial color="white" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// ── Main component ─────────────────────────────────────────────────────
export const Game3DSoloMode = ({ mode, username, roomCode, onBack, adminAbuseEvents = [], touchscreenMode = false, playerSkin = "#FFF3D6" }: Game3DSoloModeProps) => {
  const [score, setScore] = useState(0);
  const [ammo, setAmmo] = useState(10);
  const [maxAmmo, setMaxAmmo] = useState(10);
  const [currentWeapon, setCurrentWeapon] = useState<Weapon>("pistol");
  const [health, setHealth] = useState(100);
  const [maxHealth] = useState(100);
  const [unlockedWeapons, setUnlockedWeapons] = useState<Weapon[]>(["pistol"]);
  const [gameOver, setGameOver] = useState(false);
  const [kills, setKills] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [spawnImmunity, setSpawnImmunity] = useState(true);
  const [cameraMode, setCameraMode] = useState<"fps" | "topdown">("topdown");
  const [chatOpen, setChatOpen] = useState(false);
  const [onlinePlayersOpen, setOnlinePlayersOpen] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [aimbotActive, setAimbotActive] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [, setForceUpdate] = useState(0);

  // Mode display name mapping
  const MODE_NAMES: Record<string, string> = {
    "solo": "Solo", "3d-solo": "3D Solo", "boss": "Boss", "ranked": "Ranked",
    "youvsme": "You vs Me", "school": "School", "survival": "Survival",
    "zombie": "Zombie", "arena": "Arena", "infection": "Infection",
    "ctf": "CTF", "koth": "King of Hill", "gungame": "Gun Game",
    "vip": "Protect VIP", "lms": "Last Man", "dodgeball": "Dodgeball",
    "payload": "Payload", "sniper": "Sniper Elite", "tag": "Tag",
    "bounty": "Bounty Hunter", "demolition": "Demolition", "medic": "Medic",
    "blitz": "Blitz Rush", "juggernaut": "Juggernaut", "stealth": "Stealth Ops",
    "mirror": "Mirror Match", "lowgrav": "Low Gravity", "chaos": "Chaos",
    "headhunter": "Headhunter", "vampire": "Vampire", "frostbite": "Frostbite",
    "titan": "Titan Arena", "offline": "Offline", "host": "Host", "join": "Join",
  };
  const modeName = MODE_NAMES[mode || ""] || "Solo";

  const gsRef = useRef<GameState>({
    player: {
      x: 0, z: 0, r: 0.7, speed: 9, angle: 0,
      weapon: "pistol", lastShot: -1, lastMelee: -1,
      hp: 100, maxHp: 100, score: 0, ammo: 10, maxAmmo: 10,
    },
    enemies: [], bullets: [], enemyBullets: [], pickups: [], particles: [],
    keys: {}, mouseDown: false, mouseNDC: { x: 0, y: 0 },
    time: 0, lastSpawn: 0, spawnInterval: 2.0,
    gameOver: false, cameraMode: "topdown",
    godMode: false, infiniteAmmo: false, speedMultiplier: 1,
    spawnImmune: true, aimbot: false,
  });

  // Sync React state from game state
  const handleStateChange = useCallback(() => {
    const g = gsRef.current;
    const p = g.player;
    setScore(p.score);
    setAmmo(p.ammo);
    setMaxAmmo(p.maxAmmo);
    setHealth(Math.max(0, Math.round(p.hp)));
    if (g.gameOver && !gameOver) {
      setGameOver(true);
      setDeaths(prev => prev + 1);
      saveProgress(p.score);
    }
    setForceUpdate(prev => prev + 1);
  }, [gameOver]);

  // Periodic state sync (for HUD updates)
  useEffect(() => {
    const interval = setInterval(() => {
      const p = gsRef.current.player;
      setScore(p.score);
      setAmmo(p.ammo);
      setHealth(Math.max(0, Math.round(p.hp)));
      setKills(p.score / 10); // approximate
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Spawn immunity timer
  useEffect(() => {
    gsRef.current.spawnImmune = true;
    setSpawnImmunity(true);
    const timer = setTimeout(() => {
      gsRef.current.spawnImmune = false;
      setSpawnImmunity(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      gsRef.current.keys[key] = true;

      // F7 = toggle camera
      if (e.key === "F7") {
        e.preventDefault();
        const newMode = gsRef.current.cameraMode === "fps" ? "topdown" : "fps";
        gsRef.current.cameraMode = newMode;
        setCameraMode(newMode);
        toast.info(`Camera: ${newMode === "fps" ? "First Person" : "Top Down"}`);
      }

      // F9 = toggle aimbot (owner only)
      if (e.key === "F9") {
        e.preventDefault();
        if (isOwner) {
          const newAimbot = !gsRef.current.aimbot;
          gsRef.current.aimbot = newAimbot;
          setAimbotActive(newAimbot);
          toast.info(`Aimbot ${newAimbot ? "ON 🎯" : "OFF"}`);
        }
      }

      // R = reload
      if (key === "r") {
        const p = gsRef.current.player;
        const wc = WEAPONS[p.weapon];
        if (!wc.isMelee && p.ammo < wc.maxAmmo) {
          p.ammo = wc.maxAmmo;
          setAmmo(p.ammo);
        }
      }

      // Number keys = weapon switch
      const num = parseInt(e.key);
      if (num >= 1 && num <= unlockedWeapons.length) {
        const w = unlockedWeapons[num - 1];
        const p = gsRef.current.player;
        p.weapon = w;
        const wc = WEAPONS[w];
        p.ammo = wc.ammo; p.maxAmmo = wc.maxAmmo;
        setCurrentWeapon(w);
        setAmmo(wc.ammo);
        setMaxAmmo(wc.maxAmmo);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      gsRef.current.keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [unlockedWeapons, isOwner]);

  // Load user progress (weapons)
  useEffect(() => {
    loadUserProgress();
    checkPermissions();
  }, []);

  // Apply admin abuse events
  useEffect(() => {
    const now = new Date();
    for (const event of adminAbuseEvents) {
      if (new Date(event.expires_at) > now) {
        if (event.event_type === "godmode") gsRef.current.godMode = true;
        if (event.event_type === "all_weapons") setUnlockedWeapons([...WEAPON_ORDER]);
      }
    }
  }, [adminAbuseEvents]);

  // Spawn initial enemies
  useEffect(() => {
    const g = gsRef.current;
    for (let i = 0; i < 3; i++) {
      const hw = ARENA_W / 2, hh = ARENA_H / 2;
      const side = Math.floor(Math.random() * 4);
      let ex = 0, ez = 0;
      if (side === 0) { ex = (Math.random() - 0.5) * ARENA_W; ez = -hh - 2; }
      else if (side === 1) { ex = (Math.random() - 0.5) * ARENA_W; ez = hh + 2; }
      else if (side === 2) { ex = -hw - 2; ez = (Math.random() - 0.5) * ARENA_H; }
      else { ex = hw + 2; ez = (Math.random() - 0.5) * ARENA_H; }
      g.enemies.push({
        id: `e_init_${i}`, x: ex, z: ez, r: 0.8,
        speed: 2 + Math.random() * 2, hp: 60, maxHp: 60,
        color: "#FF6B6B", stun: 0, lastShot: -1,
      });
    }
  }, []);

  const checkPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Check owner role
    const { data: ownerData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "owner").maybeSingle();
    if (ownerData) { setIsOwner(true); setHasPermission(true); return; }
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (roleData) { setHasPermission(true); gsRef.current.godMode = false; return; }
    const { data: permData } = await supabase.from("chat_permissions").select("can_use_commands").eq("user_id", user.id).maybeSingle();
    if (permData?.can_use_commands) setHasPermission(true);
  };

  const loadUserProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setUnlockedWeapons(["pistol"]); return; }
      const { data: profile } = await supabase.from("profiles").select("total_score").eq("user_id", user.id).single();
      setTotalScore(profile?.total_score || 0);

      const { data: loadout } = await supabase.from("equipped_loadout").select("*").eq("user_id", user.id).maybeSingle();
      if (loadout) {
        const equipped = [loadout.slot_1, loadout.slot_2, loadout.slot_3, loadout.slot_4, loadout.slot_5].filter(Boolean) as Weapon[];
        setUnlockedWeapons(equipped.length > 0 ? equipped : ["pistol"]);
      } else {
        setUnlockedWeapons(["pistol"]);
      }
    } catch { setUnlockedWeapons(["pistol"]); }
  };

  const saveProgress = async (newScore: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || newScore <= 0) return;
      const { data: currentProfile } = await supabase.from("profiles").select("total_score").eq("user_id", user.id).single();
      const currentTotal = currentProfile?.total_score || 0;
      const newTotal = currentTotal + newScore;
      await supabase.from("profiles").update({ total_score: newTotal }).eq("user_id", user.id);
      setTotalScore(newTotal);
    } catch (error) { console.error("Error saving progress:", error); }
  };

  const handleCommand = useCallback((cmd: string) => {
    if (!hasPermission) return;
    const g = gsRef.current;
    const p = g.player;
    if (cmd.startsWith("/godmode")) { g.godMode = !g.godMode; toast.info(`God mode ${g.godMode ? "ON" : "OFF"}`); }
    else if (cmd.startsWith("/revive")) { p.hp = 100; g.gameOver = false; setGameOver(false); setHealth(100); g.spawnImmune = true; setSpawnImmunity(true); setTimeout(() => { g.spawnImmune = false; setSpawnImmunity(false); }, 5000); toast.success("Revived!"); }
    else if (cmd.startsWith("/nuke")) { g.enemies.length = 0; toast.success("Nuked!"); }
    else if (cmd.startsWith("/infiniteammo")) { g.infiniteAmmo = !g.infiniteAmmo; toast.info(`Infinite ammo ${g.infiniteAmmo ? "ON" : "OFF"}`); }
    else if (cmd.startsWith("/give")) { setUnlockedWeapons([...WEAPON_ORDER]); toast.success("All weapons unlocked!"); }
    else if (cmd.startsWith("/heal")) { p.hp = Math.min(p.maxHp, p.hp + 100); setHealth(p.hp); toast.success("Healed!"); }
    else if (cmd.startsWith("/speed")) { const m = cmd.match(/\/speed\s+(\d+(?:\.\d+)?)/); if (m) { g.speedMultiplier = parseFloat(m[1]); toast.success(`Speed ${m[1]}x`); } }
  }, [hasPermission]);

  const handleBackToMenu = async () => {
    if (score > 0) saveProgress(score);
    onBack();
  };

  return (
    <div className="relative w-full h-screen" style={{ cursor: "none" }}>
      {/* Three.js Canvas - full screen */}
      <div className="w-full h-full" style={{ pointerEvents: "auto", cursor: "none" }}>
        <Canvas
          camera={{ fov: 50, near: 0.1, far: 500, position: [0, 35, 15] }}
          shadows
          style={{ background: "#0a0e1a", cursor: "none" }}
        >
          <GameScene gs={gsRef} onStateChange={handleStateChange} />
        </Canvas>
      </div>

      {/* Game Over overlay */}
      {gameOver && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-white">GAME OVER</h1>
            <p className="text-2xl text-muted-foreground">Score: {score}</p>
            <p className="text-lg text-muted-foreground">Kills: {kills} | Deaths: {deaths}</p>
            <p className="text-sm text-muted-foreground">Use /revive command or press Back to Menu</p>
          </div>
        </div>
      )}

      {/* HUD - Top left: controls */}
      <div className="fixed left-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-2 z-40" style={{ cursor: "default" }}>
        <div className="font-bold text-lg">Food FPS 3D · {modeName}</div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div><span className="text-primary font-mono">WASD</span> move</div>
          <div><span className="text-primary font-mono">Mouse</span> aim</div>
          <div><span className="text-primary font-mono">LMB</span> shoot</div>
          {!WEAPONS[currentWeapon].isMelee && <div><span className="text-primary font-mono">R</span> reload</div>}
          <div><span className="text-primary font-mono">1-{unlockedWeapons.length}</span> weapons</div>
          <div className="pt-1 border-t border-border">
            <span className="text-accent font-mono">F7</span> toggle camera
          </div>
          {isOwner && (
            <div>
              <span className="text-accent font-mono">F9</span> aimbot
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-accent">
          <Camera className="w-3 h-3" />
          {cameraMode === "fps" ? "First Person" : "Top Down"}
        </div>
        {aimbotActive && (
          <div className="flex items-center gap-2 text-xs text-destructive font-bold animate-pulse">
            🎯 AIMBOT ACTIVE
          </div>
        )}
      </div>

      {/* HUD - Top right: stats */}
      <div className="fixed right-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-3 min-w-[180px] z-40">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Health</span>
          <span className="font-bold text-lg">{health}</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-green-500 h-full transition-all duration-300"
            style={{ width: `${(health / maxHealth) * 100}%` }} />
        </div>

        {spawnImmunity && (
          <div className="flex items-center gap-2 text-yellow-500 text-sm">
            <Shield className="w-4 h-4" /><span>Spawn Protection</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Weapon</span>
          <span className="font-bold" style={{ color: WEAPONS[currentWeapon].color }}>{WEAPONS[currentWeapon].name}</span>
        </div>

        {!WEAPONS[currentWeapon].isMelee && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Ammo</span>
              <span className="font-bold text-lg">{ammo}/{maxAmmo}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${(ammo / maxAmmo) * 100}%` }} />
            </div>
          </>
        )}

        <div className="pt-2 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Score</span>
            <span className="font-bold text-lg text-primary">{score}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>K: {Math.floor(score / 10)} | D: {deaths}</span>
            <span>Total: {totalScore}</span>
          </div>
        </div>
      </div>

      {/* Hotbar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 flex gap-2 z-40">
        {unlockedWeapons.map((weapon, index) => (
          <div key={weapon}
            className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${
              currentWeapon === weapon ? "bg-primary text-primary-foreground ring-2 ring-primary" : "bg-secondary hover:bg-secondary/80"
            }`}
            onClick={() => {
              const p = gsRef.current.player;
              p.weapon = weapon;
              const wc = WEAPONS[weapon];
              p.ammo = wc.ammo; p.maxAmmo = wc.maxAmmo;
              setCurrentWeapon(weapon);
              setAmmo(wc.ammo);
              setMaxAmmo(wc.maxAmmo);
            }}
          >
            <span className="text-xs opacity-70">{index + 1}</span>
            <span className="text-xs font-medium text-center">{WEAPONS[weapon].name}</span>
          </div>
        ))}
      </div>

      {/* Bottom buttons */}
      <div className="fixed bottom-24 left-4 flex gap-2 z-50" style={{ pointerEvents: "auto" }}>
        <Button variant="outline" onClick={(e) => { e.stopPropagation(); handleBackToMenu(); }} className="bg-card/90 backdrop-blur-sm">
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Menu
        </Button>
        <Button variant="outline" onClick={(e) => { e.stopPropagation(); setChatOpen(!chatOpen); }} className="bg-card/90 backdrop-blur-sm">
          <MessageSquare className="w-4 h-4 mr-2" />Console
        </Button>
      </div>

      <AdminChat open={chatOpen} onOpenChange={setChatOpen} onCommand={handleCommand} onShowOnlinePlayers={() => setOnlinePlayersOpen(true)} />
      <OnlinePlayersModal open={onlinePlayersOpen} onOpenChange={setOnlinePlayersOpen} currentUsername={username} />
      <BanModal open={banModalOpen} onOpenChange={setBanModalOpen} />
    </div>
  );
};
