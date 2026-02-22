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
const ARENA_W = 48;
const ARENA_H = 32;
const SCALE = ARENA_W / 960;

// ── Mode Theme System ──────────────────────────────────────────────────
interface ModeTheme {
  skyColor: string;
  groundColor: string;
  groundColor2: string;
  gridColor1: string;
  gridColor2: string;
  wallColor: string;
  wallGlow1: string;
  wallGlow2: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  ambientIntensity: number;
  pointLights: { pos: [number, number, number]; color: string; intensity: number; distance: number }[];
  enemyColor: string;
  enemyHp: number;
  enemySpeed: [number, number]; // min, max
  spawnInterval: number;
  specialFeature: string; // description for HUD
  playerSpeed: number;
  enemyShootInterval: number;
}

const DEFAULT_THEME: ModeTheme = {
  skyColor: "#060a14", groundColor: "#141822", groundColor2: "#181d2a",
  gridColor1: "#1b3444", gridColor2: "#0d1520",
  wallColor: "#1a2535", wallGlow1: "#FFB84D", wallGlow2: "#6BAFFF",
  fogColor: "#060a14", fogNear: 30, fogFar: 80,
  ambientIntensity: 0.3,
  pointLights: [
    { pos: [0, 8, 0], color: "#FFB84D", intensity: 0.4, distance: 40 },
    { pos: [-15, 6, -10], color: "#6BAFFF", intensity: 0.2, distance: 25 },
    { pos: [15, 6, 10], color: "#FF6B6B", intensity: 0.2, distance: 25 },
  ],
  enemyColor: "#FF6B6B", enemyHp: 60, enemySpeed: [2, 4], spawnInterval: 2.0,
  specialFeature: "", playerSpeed: 9, enemyShootInterval: 3.5,
};

const MODE_THEMES: Record<string, Partial<ModeTheme>> = {
  boss: {
    skyColor: "#1a0a0a", groundColor: "#1a0808", groundColor2: "#200c0c",
    gridColor1: "#3a1515", gridColor2: "#150808",
    wallColor: "#2a1010", wallGlow1: "#FF2222", wallGlow2: "#FF4444",
    fogColor: "#1a0505", fogNear: 25, fogFar: 70,
    pointLights: [
      { pos: [0, 10, 0], color: "#FF3333", intensity: 0.6, distance: 50 },
      { pos: [-12, 8, -8], color: "#FF0000", intensity: 0.3, distance: 30 },
      { pos: [12, 8, 8], color: "#880000", intensity: 0.3, distance: 30 },
    ],
    enemyColor: "#FF2222", enemyHp: 200, enemySpeed: [1, 2], spawnInterval: 4.0,
    specialFeature: "Boss enemies have 3x HP", playerSpeed: 9,
    enemyShootInterval: 2.0,
  },
  ranked: {
    skyColor: "#0a0a1a", groundColor: "#101025", groundColor2: "#14142a",
    gridColor1: "#252560", gridColor2: "#0a0a20",
    wallColor: "#1a1a40", wallGlow1: "#FFD700", wallGlow2: "#FFD700",
    fogColor: "#0a0a1a", fogNear: 35, fogFar: 90,
    pointLights: [
      { pos: [0, 10, 0], color: "#FFD700", intensity: 0.5, distance: 45 },
      { pos: [-15, 6, -10], color: "#DAA520", intensity: 0.3, distance: 30 },
      { pos: [15, 6, 10], color: "#B8860B", intensity: 0.3, distance: 30 },
    ],
    enemyColor: "#DAA520", enemyHp: 80, enemySpeed: [3, 5], spawnInterval: 1.5,
    specialFeature: "Faster enemies, faster spawns", playerSpeed: 10,
    enemyShootInterval: 2.5,
  },
  survival: {
    skyColor: "#1a1508", groundColor: "#1a1508", groundColor2: "#201a0c",
    gridColor1: "#3a3015", gridColor2: "#151208",
    wallColor: "#2a2510", wallGlow1: "#FF8C00", wallGlow2: "#CD853F",
    fogColor: "#1a1508", fogNear: 20, fogFar: 60,
    pointLights: [
      { pos: [0, 8, 0], color: "#FF8C00", intensity: 0.5, distance: 40 },
      { pos: [-10, 5, -8], color: "#CD853F", intensity: 0.3, distance: 25 },
      { pos: [10, 5, 8], color: "#DEB887", intensity: 0.2, distance: 20 },
    ],
    enemyColor: "#CD853F", enemyHp: 40, enemySpeed: [3, 6], spawnInterval: 1.0,
    specialFeature: "Endless waves, fast spawns", playerSpeed: 10,
    enemyShootInterval: 3.0,
  },
  zombie: {
    skyColor: "#050a05", groundColor: "#0a1a0a", groundColor2: "#0c200c",
    gridColor1: "#153a15", gridColor2: "#081508",
    wallColor: "#102a10", wallGlow1: "#00FF00", wallGlow2: "#44FF44",
    fogColor: "#030803", fogNear: 15, fogFar: 50,
    ambientIntensity: 0.15,
    pointLights: [
      { pos: [0, 8, 0], color: "#33FF33", intensity: 0.3, distance: 35 },
      { pos: [-15, 4, -10], color: "#00FF00", intensity: 0.2, distance: 20 },
      { pos: [15, 4, 10], color: "#228B22", intensity: 0.15, distance: 20 },
    ],
    enemyColor: "#22AA22", enemyHp: 30, enemySpeed: [1.5, 3], spawnInterval: 0.8,
    specialFeature: "Hordes of weak zombies", playerSpeed: 8,
    enemyShootInterval: 5.0,
  },
  arena: {
    skyColor: "#0a0510", groundColor: "#18101e", groundColor2: "#1c1424",
    gridColor1: "#3a2050", gridColor2: "#100a18",
    wallColor: "#2a1540", wallGlow1: "#AA33FF", wallGlow2: "#FF33AA",
    fogColor: "#0a0510", fogNear: 30, fogFar: 75,
    pointLights: [
      { pos: [0, 10, 0], color: "#AA33FF", intensity: 0.5, distance: 45 },
      { pos: [-12, 6, -8], color: "#FF33AA", intensity: 0.3, distance: 25 },
      { pos: [12, 6, 8], color: "#9933FF", intensity: 0.3, distance: 25 },
    ],
    enemyColor: "#CC44FF", enemyHp: 70, enemySpeed: [2.5, 5], spawnInterval: 1.5,
    specialFeature: "Shift to dash, gladiator arena", playerSpeed: 11,
    enemyShootInterval: 3.0,
  },
  infection: {
    skyColor: "#0a100a", groundColor: "#0c180c", groundColor2: "#10200e",
    gridColor1: "#1a3a18", gridColor2: "#081508",
    wallColor: "#142a12", wallGlow1: "#44FF00", wallGlow2: "#88FF44",
    fogColor: "#050a04", fogNear: 15, fogFar: 55,
    ambientIntensity: 0.2,
    pointLights: [
      { pos: [0, 6, 0], color: "#66FF00", intensity: 0.5, distance: 35 },
      { pos: [-15, 5, -10], color: "#44FF00", intensity: 0.3, distance: 25 },
      { pos: [10, 3, 5], color: "#AAFF00", intensity: 0.2, distance: 15 },
    ],
    enemyColor: "#66FF00", enemyHp: 45, enemySpeed: [3, 5.5], spawnInterval: 1.2,
    specialFeature: "Toxic zone, enemies spread infection", playerSpeed: 9,
    enemyShootInterval: 2.5,
  },
  ctf: {
    skyColor: "#080a14", groundColor: "#101828", groundColor2: "#141c2c",
    gridColor1: "#203050", gridColor2: "#0a1020",
    wallColor: "#182840", wallGlow1: "#3388FF", wallGlow2: "#FF3333",
    fogColor: "#080a14", fogNear: 35, fogFar: 85,
    pointLights: [
      { pos: [-15, 8, 0], color: "#3388FF", intensity: 0.5, distance: 35 },
      { pos: [15, 8, 0], color: "#FF3333", intensity: 0.5, distance: 35 },
      { pos: [0, 6, 0], color: "#FFFFFF", intensity: 0.2, distance: 20 },
    ],
    enemyColor: "#FF4444", enemyHp: 50, enemySpeed: [3, 5], spawnInterval: 1.8,
    specialFeature: "Two team bases, capture zone", playerSpeed: 10,
    enemyShootInterval: 3.0,
  },
  koth: {
    skyColor: "#100a05", groundColor: "#1a1510", groundColor2: "#201a14",
    gridColor1: "#3a3020", gridColor2: "#151008",
    wallColor: "#2a2015", wallGlow1: "#FFAA00", wallGlow2: "#FF6600",
    fogColor: "#100a05", fogNear: 25, fogFar: 70,
    pointLights: [
      { pos: [0, 12, 0], color: "#FFAA00", intensity: 0.7, distance: 50 },
      { pos: [-10, 5, -8], color: "#FF6600", intensity: 0.3, distance: 25 },
      { pos: [10, 5, 8], color: "#CC8800", intensity: 0.2, distance: 20 },
    ],
    enemyColor: "#FF8800", enemyHp: 55, enemySpeed: [2, 4], spawnInterval: 1.5,
    specialFeature: "Hold the center hill to score", playerSpeed: 9,
    enemyShootInterval: 3.0,
  },
  gungame: {
    skyColor: "#0a0a0a", groundColor: "#181818", groundColor2: "#1c1c1c",
    gridColor1: "#333333", gridColor2: "#111111",
    wallColor: "#222222", wallGlow1: "#FFFFFF", wallGlow2: "#AAAAAA",
    fogColor: "#0a0a0a", fogNear: 30, fogFar: 80,
    pointLights: [
      { pos: [0, 8, 0], color: "#FFFFFF", intensity: 0.5, distance: 40 },
      { pos: [-15, 6, -10], color: "#CCCCCC", intensity: 0.2, distance: 25 },
      { pos: [15, 6, 10], color: "#DDDDDD", intensity: 0.2, distance: 25 },
    ],
    enemyColor: "#AAAAAA", enemyHp: 40, enemySpeed: [3, 5], spawnInterval: 1.5,
    specialFeature: "Weapon changes every 5 kills", playerSpeed: 10,
    enemyShootInterval: 3.0,
  },
  sniper: {
    skyColor: "#050810", groundColor: "#0a1018", groundColor2: "#0e141c",
    gridColor1: "#1a2840", gridColor2: "#081020",
    wallColor: "#101830", wallGlow1: "#00AAFF", wallGlow2: "#0066CC",
    fogColor: "#050810", fogNear: 40, fogFar: 120,
    ambientIntensity: 0.2,
    pointLights: [
      { pos: [0, 10, 0], color: "#0088FF", intensity: 0.3, distance: 50 },
      { pos: [-20, 8, -12], color: "#0044AA", intensity: 0.2, distance: 30 },
    ],
    enemyColor: "#4488CC", enemyHp: 40, enemySpeed: [1.5, 3], spawnInterval: 3.0,
    specialFeature: "Long-range only, 2x headshot dmg", playerSpeed: 7,
    enemyShootInterval: 4.0,
  },
  dodgeball: {
    skyColor: "#14080a", groundColor: "#201012", groundColor2: "#241418",
    gridColor1: "#402025", gridColor2: "#180a10",
    wallColor: "#301520", wallGlow1: "#FF4466", wallGlow2: "#FF6688",
    fogColor: "#14080a", fogNear: 30, fogFar: 75,
    pointLights: [
      { pos: [0, 10, 0], color: "#FF4466", intensity: 0.5, distance: 45 },
      { pos: [-12, 6, 0], color: "#FF6688", intensity: 0.3, distance: 25 },
      { pos: [12, 6, 0], color: "#CC3355", intensity: 0.3, distance: 25 },
    ],
    enemyColor: "#FF4466", enemyHp: 25, enemySpeed: [4, 7], spawnInterval: 0.6,
    specialFeature: "Fast projectiles, dodge to survive", playerSpeed: 12,
    enemyShootInterval: 1.5,
  },
  tag: {
    skyColor: "#081410", groundColor: "#102018", groundColor2: "#14241c",
    gridColor1: "#204030", gridColor2: "#0a1810",
    wallColor: "#183028", wallGlow1: "#33FF88", wallGlow2: "#88FFAA",
    fogColor: "#081410", fogNear: 30, fogFar: 80,
    pointLights: [
      { pos: [0, 8, 0], color: "#33FF88", intensity: 0.5, distance: 40 },
      { pos: [-15, 6, -10], color: "#88FFAA", intensity: 0.2, distance: 25 },
    ],
    enemyColor: "#33FF88", enemyHp: 35, enemySpeed: [4, 6], spawnInterval: 1.5,
    specialFeature: "Touch enemies to tag, speed boost", playerSpeed: 12,
    enemyShootInterval: 5.0,
  },
  bounty: {
    skyColor: "#100a08", groundColor: "#1a1410", groundColor2: "#201814",
    gridColor1: "#3a2a18", gridColor2: "#15100a",
    wallColor: "#2a2015", wallGlow1: "#FFD700", wallGlow2: "#B8860B",
    fogColor: "#100a08", fogNear: 25, fogFar: 70,
    pointLights: [
      { pos: [0, 10, 0], color: "#FFD700", intensity: 0.5, distance: 45 },
      { pos: [-10, 5, -8], color: "#B8860B", intensity: 0.3, distance: 25 },
    ],
    enemyColor: "#FFD700", enemyHp: 100, enemySpeed: [2, 3], spawnInterval: 3.0,
    specialFeature: "High-value bounty targets, 3x score", playerSpeed: 9,
    enemyShootInterval: 2.5,
  },
  demolition: {
    skyColor: "#140a05", groundColor: "#201208", groundColor2: "#24160c",
    gridColor1: "#402810", gridColor2: "#181008",
    wallColor: "#302010", wallGlow1: "#FF6600", wallGlow2: "#FF4400",
    fogColor: "#140a05", fogNear: 20, fogFar: 60,
    pointLights: [
      { pos: [0, 8, 0], color: "#FF6600", intensity: 0.6, distance: 40 },
      { pos: [-12, 6, -8], color: "#FF4400", intensity: 0.4, distance: 30 },
      { pos: [12, 6, 8], color: "#CC3300", intensity: 0.3, distance: 25 },
    ],
    enemyColor: "#FF6600", enemyHp: 50, enemySpeed: [2, 4], spawnInterval: 1.5,
    specialFeature: "Explosive kills, chain reactions", playerSpeed: 9,
    enemyShootInterval: 3.0,
  },
  medic: {
    skyColor: "#081014", groundColor: "#101820", groundColor2: "#141c24",
    gridColor1: "#203040", gridColor2: "#0a1520",
    wallColor: "#182838", wallGlow1: "#33AAFF", wallGlow2: "#66CCFF",
    fogColor: "#081014", fogNear: 30, fogFar: 80,
    pointLights: [
      { pos: [0, 8, 0], color: "#33AAFF", intensity: 0.4, distance: 40 },
      { pos: [-15, 6, -10], color: "#66CCFF", intensity: 0.3, distance: 25 },
    ],
    enemyColor: "#33AAFF", enemyHp: 50, enemySpeed: [2, 4], spawnInterval: 1.8,
    specialFeature: "Kills heal 10 HP", playerSpeed: 9,
    enemyShootInterval: 3.5,
  },
  lms: {
    skyColor: "#100810", groundColor: "#1a101a", groundColor2: "#20142a",
    gridColor1: "#302040", gridColor2: "#120a18",
    wallColor: "#221430", wallGlow1: "#DD44FF", wallGlow2: "#9922CC",
    fogColor: "#100810", fogNear: 25, fogFar: 70,
    pointLights: [
      { pos: [0, 10, 0], color: "#DD44FF", intensity: 0.5, distance: 45 },
      { pos: [-12, 6, -8], color: "#9922CC", intensity: 0.3, distance: 25 },
    ],
    enemyColor: "#DD44FF", enemyHp: 80, enemySpeed: [2, 4], spawnInterval: 2.0,
    specialFeature: "No respawns, survive the longest", playerSpeed: 9,
    enemyShootInterval: 3.0,
  },
  vip: {
    skyColor: "#0a0a12", groundColor: "#14142a", groundColor2: "#18183a",
    gridColor1: "#252550", gridColor2: "#0a0a20",
    wallColor: "#1a1a45", wallGlow1: "#FFD700", wallGlow2: "#FFA500",
    fogColor: "#0a0a12", fogNear: 30, fogFar: 80,
    pointLights: [
      { pos: [0, 10, 0], color: "#FFD700", intensity: 0.6, distance: 45 },
      { pos: [-10, 6, 0], color: "#FFA500", intensity: 0.3, distance: 25 },
    ],
    enemyColor: "#FFA500", enemyHp: 70, enemySpeed: [3, 5], spawnInterval: 1.5,
    specialFeature: "Protect the VIP zone", playerSpeed: 10,
    enemyShootInterval: 2.5,
  },
  payload: {
    skyColor: "#0a0810", groundColor: "#141020", groundColor2: "#181428",
    gridColor1: "#282040", gridColor2: "#0a0818",
    wallColor: "#201838", wallGlow1: "#FF8844", wallGlow2: "#CC6633",
    fogColor: "#0a0810", fogNear: 30, fogFar: 80,
    pointLights: [
      { pos: [0, 8, 0], color: "#FF8844", intensity: 0.5, distance: 40 },
      { pos: [-15, 6, -10], color: "#CC6633", intensity: 0.3, distance: 25 },
    ],
    enemyColor: "#FF8844", enemyHp: 55, enemySpeed: [2, 4], spawnInterval: 1.8,
    specialFeature: "Escort the payload zone", playerSpeed: 9,
    enemyShootInterval: 3.0,
  },
  school: {
    skyColor: "#0a1010", groundColor: "#101a1a", groundColor2: "#142020",
    gridColor1: "#1a3030", gridColor2: "#081515",
    wallColor: "#152828", wallGlow1: "#44CCCC", wallGlow2: "#228888",
    fogColor: "#0a1010", fogNear: 30, fogFar: 80,
    pointLights: [
      { pos: [0, 8, 0], color: "#44CCCC", intensity: 0.4, distance: 40 },
      { pos: [-15, 6, -10], color: "#228888", intensity: 0.2, distance: 25 },
    ],
    enemyColor: "#44CCCC", enemyHp: 50, enemySpeed: [2, 3], spawnInterval: 2.5,
    specialFeature: "Educational mode, math bonus", playerSpeed: 8,
    enemyShootInterval: 4.0,
  },
  youvsme: {
    skyColor: "#100508", groundColor: "#1a0c12", groundColor2: "#201018",
    gridColor1: "#3a1828", gridColor2: "#15080e",
    wallColor: "#2a1020", wallGlow1: "#FF2266", wallGlow2: "#2266FF",
    fogColor: "#100508", fogNear: 30, fogFar: 75,
    pointLights: [
      { pos: [-12, 8, 0], color: "#FF2266", intensity: 0.5, distance: 35 },
      { pos: [12, 8, 0], color: "#2266FF", intensity: 0.5, distance: 35 },
    ],
    enemyColor: "#FF2266", enemyHp: 100, enemySpeed: [3, 5], spawnInterval: 3.0,
    specialFeature: "1v1 duel arena", playerSpeed: 10,
    enemyShootInterval: 2.0,
  },
  blitz: {
    skyColor: "#14100a", groundColor: "#201a10", groundColor2: "#282014",
    gridColor1: "#403818", gridColor2: "#18140a",
    wallColor: "#302810", wallGlow1: "#FFCC00", wallGlow2: "#FF8800",
    fogColor: "#14100a", fogNear: 20, fogFar: 60,
    pointLights: [
      { pos: [0, 8, 0], color: "#FFCC00", intensity: 0.7, distance: 45 },
      { pos: [-12, 6, -8], color: "#FF8800", intensity: 0.4, distance: 30 },
      { pos: [12, 6, 8], color: "#FFAA00", intensity: 0.3, distance: 25 },
    ],
    enemyColor: "#FFCC00", enemyHp: 30, enemySpeed: [5, 8], spawnInterval: 0.5,
    specialFeature: "Ultra-fast spawns, speed is key", playerSpeed: 14,
    enemyShootInterval: 1.5,
  },
  juggernaut: {
    skyColor: "#0a0505", groundColor: "#1a0e0e", groundColor2: "#201212",
    gridColor1: "#3a2020", gridColor2: "#150a0a",
    wallColor: "#2a1515", wallGlow1: "#CC0000", wallGlow2: "#880000",
    fogColor: "#0a0505", fogNear: 25, fogFar: 70,
    ambientIntensity: 0.25,
    pointLights: [
      { pos: [0, 12, 0], color: "#CC0000", intensity: 0.6, distance: 50 },
      { pos: [-10, 5, -8], color: "#880000", intensity: 0.3, distance: 25 },
    ],
    enemyColor: "#CC0000", enemyHp: 300, enemySpeed: [1, 2], spawnInterval: 5.0,
    specialFeature: "Massive HP enemies, heavy firepower", playerSpeed: 8,
    enemyShootInterval: 1.5,
  },
  stealth: {
    skyColor: "#030308", groundColor: "#080810", groundColor2: "#0a0a14",
    gridColor1: "#151520", gridColor2: "#060608",
    wallColor: "#101018", wallGlow1: "#4444AA", wallGlow2: "#222266",
    fogColor: "#020206", fogNear: 10, fogFar: 40,
    ambientIntensity: 0.1,
    pointLights: [
      { pos: [0, 6, 0], color: "#333388", intensity: 0.2, distance: 20 },
      { pos: [-15, 4, -10], color: "#222266", intensity: 0.1, distance: 15 },
    ],
    enemyColor: "#6666CC", enemyHp: 40, enemySpeed: [1.5, 3], spawnInterval: 3.0,
    specialFeature: "Near-dark arena, enemies glow faintly", playerSpeed: 8,
    enemyShootInterval: 4.0,
  },
  mirror: {
    skyColor: "#0c0c0c", groundColor: "#1a1a1a", groundColor2: "#202020",
    gridColor1: "#404040", gridColor2: "#101010",
    wallColor: "#2a2a2a", wallGlow1: "#FFFFFF", wallGlow2: "#CCCCCC",
    fogColor: "#0c0c0c", fogNear: 30, fogFar: 80,
    pointLights: [
      { pos: [0, 10, 0], color: "#FFFFFF", intensity: 0.5, distance: 45 },
      { pos: [-12, 6, -8], color: "#DDDDDD", intensity: 0.3, distance: 25 },
      { pos: [12, 6, 8], color: "#BBBBBB", intensity: 0.3, distance: 25 },
    ],
    enemyColor: "#DDDDDD", enemyHp: 60, enemySpeed: [3, 5], spawnInterval: 1.8,
    specialFeature: "Enemies mirror your weapon", playerSpeed: 10,
    enemyShootInterval: 3.0,
  },
  lowgrav: {
    skyColor: "#050510", groundColor: "#0a0a1a", groundColor2: "#0e0e20",
    gridColor1: "#1a1a40", gridColor2: "#080818",
    wallColor: "#141430", wallGlow1: "#8866FF", wallGlow2: "#AA88FF",
    fogColor: "#050510", fogNear: 35, fogFar: 100,
    pointLights: [
      { pos: [0, 12, 0], color: "#8866FF", intensity: 0.4, distance: 50 },
      { pos: [-15, 8, -10], color: "#AA88FF", intensity: 0.3, distance: 30 },
      { pos: [15, 8, 10], color: "#6644DD", intensity: 0.2, distance: 25 },
    ],
    enemyColor: "#AA88FF", enemyHp: 50, enemySpeed: [1.5, 3], spawnInterval: 2.0,
    specialFeature: "Floaty movement, slow bullets", playerSpeed: 7,
    enemyShootInterval: 4.0,
  },
  chaos: {
    skyColor: "#100510", groundColor: "#200a18", groundColor2: "#280e20",
    gridColor1: "#401830", gridColor2: "#180a14",
    wallColor: "#301020", wallGlow1: "#FF00FF", wallGlow2: "#00FFFF",
    fogColor: "#100510", fogNear: 15, fogFar: 55,
    pointLights: [
      { pos: [0, 8, 0], color: "#FF00FF", intensity: 0.6, distance: 40 },
      { pos: [-12, 6, -8], color: "#00FFFF", intensity: 0.5, distance: 30 },
      { pos: [12, 6, 8], color: "#FFFF00", intensity: 0.4, distance: 25 },
    ],
    enemyColor: "#FF00FF", enemyHp: 35, enemySpeed: [4, 8], spawnInterval: 0.4,
    specialFeature: "Random enemy types, wild spawns", playerSpeed: 12,
    enemyShootInterval: 1.0,
  },
  headhunter: {
    skyColor: "#0a0808", groundColor: "#181210", groundColor2: "#201814",
    gridColor1: "#3a2818", gridColor2: "#15100a",
    wallColor: "#2a1c12", wallGlow1: "#FF4400", wallGlow2: "#CC3300",
    fogColor: "#0a0808", fogNear: 25, fogFar: 70,
    pointLights: [
      { pos: [0, 10, 0], color: "#FF4400", intensity: 0.5, distance: 45 },
      { pos: [-10, 5, -8], color: "#CC3300", intensity: 0.3, distance: 25 },
    ],
    enemyColor: "#FF4400", enemyHp: 80, enemySpeed: [2, 4], spawnInterval: 2.5,
    specialFeature: "Precision kills give 5x score", playerSpeed: 9,
    enemyShootInterval: 2.5,
  },
  vampire: {
    skyColor: "#0a0308", groundColor: "#180810", groundColor2: "#200c18",
    gridColor1: "#3a1028", gridColor2: "#15060e",
    wallColor: "#2a0a1a", wallGlow1: "#CC0044", wallGlow2: "#880033",
    fogColor: "#080208", fogNear: 15, fogFar: 55,
    ambientIntensity: 0.15,
    pointLights: [
      { pos: [0, 8, 0], color: "#CC0044", intensity: 0.4, distance: 35 },
      { pos: [-15, 5, -10], color: "#880033", intensity: 0.3, distance: 25 },
      { pos: [10, 3, 5], color: "#AA0044", intensity: 0.2, distance: 15 },
    ],
    enemyColor: "#CC0044", enemyHp: 60, enemySpeed: [3, 5], spawnInterval: 1.5,
    specialFeature: "Kills steal HP, health drains over time", playerSpeed: 10,
    enemyShootInterval: 2.5,
  },
  frostbite: {
    skyColor: "#081018", groundColor: "#101820", groundColor2: "#142028",
    gridColor1: "#203848", gridColor2: "#0a1420",
    wallColor: "#182838", wallGlow1: "#88DDFF", wallGlow2: "#44AADD",
    fogColor: "#081018", fogNear: 20, fogFar: 65,
    pointLights: [
      { pos: [0, 10, 0], color: "#88DDFF", intensity: 0.5, distance: 45 },
      { pos: [-12, 6, -8], color: "#44AADD", intensity: 0.3, distance: 30 },
      { pos: [12, 6, 8], color: "#66CCEE", intensity: 0.2, distance: 25 },
    ],
    enemyColor: "#88DDFF", enemyHp: 55, enemySpeed: [1.5, 3], spawnInterval: 2.0,
    specialFeature: "Icy arena, enemies slow on hit", playerSpeed: 8,
    enemyShootInterval: 3.5,
  },
  titan: {
    skyColor: "#080405", groundColor: "#14080a", groundColor2: "#1a0c10",
    gridColor1: "#301018", gridColor2: "#140608",
    wallColor: "#200a12", wallGlow1: "#FF6633", wallGlow2: "#CC4422",
    fogColor: "#080405", fogNear: 30, fogFar: 85,
    ambientIntensity: 0.25,
    pointLights: [
      { pos: [0, 14, 0], color: "#FF6633", intensity: 0.7, distance: 55 },
      { pos: [-15, 8, -10], color: "#CC4422", intensity: 0.4, distance: 35 },
      { pos: [15, 8, 10], color: "#AA3311", intensity: 0.3, distance: 30 },
    ],
    enemyColor: "#FF6633", enemyHp: 400, enemySpeed: [0.8, 1.5], spawnInterval: 6.0,
    specialFeature: "Colossal enemies, massive damage", playerSpeed: 9,
    enemyShootInterval: 1.5,
  },
};

function getTheme(mode: string): ModeTheme {
  const overrides = MODE_THEMES[mode] || {};
  return { ...DEFAULT_THEME, ...overrides };
}

// ── Shared mutable game state ──────────────────────────────────────────
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
  mouseNDC: { x: number; y: number };
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
  dashCooldown: number;
  lastDash: number;
  gunGameKills: number;
  gunGameWeaponIndex: number;
}

// ── 3D Scene ──────────────────────────────────────────────────────────
const GameScene = ({ gs, onStateChange, theme, mode }: {
  gs: React.MutableRefObject<GameState>;
  onStateChange: () => void;
  theme: ModeTheme;
  mode: string;
}) => {
  const { camera, gl } = useThree();
  const groundRef = useRef<THREE.Mesh>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouseVec = useMemo(() => new THREE.Vector2(), []);
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  const updateCamera = useCallback(() => {
    const p = gs.current.player;
    if (gs.current.cameraMode === "fps") {
      const eyeHeight = 1.6;
      camera.position.set(p.x, eyeHeight, p.z);
      const lookX = p.x + Math.sin(p.angle) * 10;
      const lookZ = p.z + Math.cos(p.angle) * 10;
      camera.lookAt(lookX, eyeHeight * 0.9, lookZ);
      (camera as THREE.PerspectiveCamera).fov = 75;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    } else {
      const height = 35;
      camera.position.set(p.x, height, p.z - 15);
      camera.lookAt(p.x, 0, p.z);
      (camera as THREE.PerspectiveCamera).fov = 50;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
  }, [camera, gs]);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleMouseMove = (e: MouseEvent) => {
      if (gs.current.aimbot) return;
      if (gs.current.cameraMode === "fps") {
        const sensitivity = 0.003;
        gs.current.player.angle += e.movementX * sensitivity;
      } else {
        const rect = canvas.getBoundingClientRect();
        gs.current.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        gs.current.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        mouseVec.set(gs.current.mouseNDC.x, gs.current.mouseNDC.y);
        raycaster.setFromCamera(mouseVec, camera);
        const hit = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, hit);
        if (hit) {
          const p = gs.current.player;
          p.angle = Math.atan2(hit.x - p.x, hit.z - p.z);
        }
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

  useFrame((_, delta) => {
    const dt = Math.min(0.033, delta);
    const g = gs.current;
    g.time += dt;
    const p = g.player;

    if (p.hp <= 0 && !g.godMode) {
      if (!g.gameOver) { g.gameOver = true; onStateChange(); }
      updateCamera();
      return;
    }

    // ── Aimbot ──
    if (g.aimbot && g.enemies.length > 0) {
      let nearest: Enemy3D | null = null;
      let nearestDist = Infinity;
      for (const e of g.enemies) {
        const d = Math.hypot(e.x - p.x, e.z - p.z);
        if (d < nearestDist) { nearestDist = d; nearest = e; }
      }
      if (nearest) {
        p.angle = Math.atan2(nearest.x - p.x, nearest.z - p.z);
        g.mouseDown = true;
      }
    }

    // ── Dash (arena/tag modes) ──
    if (g.keys["shift"] && g.time - g.lastDash > g.dashCooldown && (mode === "arena" || mode === "tag" || mode === "dodgeball")) {
      g.lastDash = g.time;
      const dashDist = 6;
      p.x = Math.max(-ARENA_W / 2 + 1, Math.min(ARENA_W / 2 - 1, p.x + Math.sin(p.angle) * dashDist));
      p.z = Math.max(-ARENA_H / 2 + 1, Math.min(ARENA_H / 2 - 1, p.z + Math.cos(p.angle) * dashDist));
      for (let k = 0; k < 8; k++) {
        g.particles.push({ x: p.x, y: 0.5, z: p.z, vx: (Math.random() - 0.5) * 5, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 5, life: 0.4, color: theme.wallGlow1 });
      }
    }

    // ── Vampire HP drain ──
    if (mode === "vampire" && !g.godMode) {
      p.hp -= 3 * dt; // slow drain
    }

    // ── Low gravity slower bullets ──
    // (handled via bullet speed in weapon config, but we slow enemy bullets)
    

    // ── Movement ──
    let dx = 0, dz = 0;
    if (g.keys["w"] || g.keys["arrowup"]) dz += 1;
    if (g.keys["s"] || g.keys["arrowdown"]) dz -= 1;
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
          const angleToEnemy = Math.atan2(e.x - p.x, e.z - p.z);
          const angleDiff = Math.abs(((angleToEnemy - p.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (d <= meleeRange && angleDiff < 0.5) {
            e.hp -= weapon.damage;
            e.stun = 0.6;
            if (e.hp <= 0) {
              p.score += 10;
              if (mode === "medic") { p.hp = Math.min(p.maxHp, p.hp + 10); }
              if (mode === "bounty") { p.score += 20; }
              if (mode === "gungame") { handleGunGameKill(g); }
              if (mode === "vampire") { p.hp = Math.min(p.maxHp, p.hp + 15); }
              if (mode === "headhunter") { p.score += 40; }
              if (mode === "frostbite") { /* enemies slowed on hit handled via stun */ e.stun = 1.2; }
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
            x: p.x + Math.sin(p.angle) * 0.8,
            z: p.z + Math.cos(p.angle) * 0.8,
            vx: Math.sin(finalAngle) * speed,
            vz: Math.cos(finalAngle) * speed,
            r: 0.15, life: 2.5, dmg: weapon.damage, color: weapon.color,
          });
        }
        onStateChange();
      }
    }

    // ── Update bullets ──
    for (let i = g.bullets.length - 1; i >= 0; i--) {
      const b = g.bullets[i];
      b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt;
      if (b.life <= 0 || Math.abs(b.x) > ARENA_W || Math.abs(b.z) > ARENA_H) { g.bullets.splice(i, 1); continue; }
      for (let j = g.enemies.length - 1; j >= 0; j--) {
        const e = g.enemies[j];
        if (Math.hypot(b.x - e.x, b.z - e.z) < e.r + b.r) {
          // Sniper mode: 2x damage
          const dmgMult = mode === "sniper" ? 2 : 1;
          e.hp -= b.dmg * dmgMult;
          e.stun = mode === "frostbite" ? 1.0 : 0.6;
          for (let k = 0; k < 5; k++) {
            g.particles.push({ x: b.x, y: 0.5, z: b.z, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 4, life: 0.5, color: "#FFF3D6" });
          }
          if (e.hp <= 0) {
            p.score += mode === "bounty" ? 30 : mode === "headhunter" ? 50 : 10;
            if (mode === "medic") { p.hp = Math.min(p.maxHp, p.hp + 10); }
            if (mode === "vampire") { p.hp = Math.min(p.maxHp, p.hp + 15); }
            if (mode === "gungame") { handleGunGameKill(g); }
            // Demolition: chain explosion
            if (mode === "demolition") {
              for (let k = g.enemies.length - 1; k >= 0; k--) {
                if (k === j) continue;
                const e2 = g.enemies[k];
                if (Math.hypot(e2.x - e.x, e2.z - e.z) < 5) {
                  e2.hp -= 50;
                  for (let m = 0; m < 8; m++) {
                    g.particles.push({ x: e2.x, y: 1, z: e2.z, vx: (Math.random() - 0.5) * 8, vy: Math.random() * 6, vz: (Math.random() - 0.5) * 8, life: 0.6, color: "#FF6600" });
                  }
                  if (e2.hp <= 0) { p.score += 10; g.enemies.splice(k, 1); if (k < j) j--; }
                }
              }
            }
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
      if (b.life <= 0 || Math.abs(b.x) > ARENA_W || Math.abs(b.z) > ARENA_H) { g.enemyBullets.splice(i, 1); continue; }
      if (Math.hypot(b.x - p.x, b.z - p.z) < p.r + b.r) {
        if (!g.godMode && !g.spawnImmune) { p.hp -= b.dmg; onStateChange(); }
        g.enemyBullets.splice(i, 1);
      }
    }

    // ── Update enemies ──
    for (const e of g.enemies) {
      if (e.stun > 0) { e.stun -= dt; continue; }
      const vx = p.x - e.x, vz = p.z - e.z;
      const d = Math.hypot(vx, vz);
      if (d > 0) { e.x += (vx / d) * e.speed * dt; e.z += (vz / d) * e.speed * dt; }
      if (d < p.r + e.r && !g.godMode && !g.spawnImmune) { p.hp -= 5 * dt; onStateChange(); }
      if (d < 17.5 && g.time - e.lastShot >= theme.enemyShootInterval) {
        e.lastShot = g.time;
        const ang = Math.atan2(p.x - e.x, p.z - e.z);
        const spd = 10 * SCALE;
        g.enemyBullets.push({ x: e.x, z: e.z, vx: Math.sin(ang) * spd, vz: Math.cos(ang) * spd, r: 0.3, life: 3, dmg: 10, color: "#FF4444" });
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
      pt.vy -= 9.8 * dt;
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
        speed: theme.enemySpeed[0] + Math.random() * (theme.enemySpeed[1] - theme.enemySpeed[0]),
        hp: theme.enemyHp, maxHp: theme.enemyHp,
        color: theme.enemyColor, stun: 0, lastShot: -1,
      });
      if (g.spawnInterval > 0.4) g.spawnInterval *= 0.993;
    }

    updateCamera();
  });

  // Gun game weapon progression helper
  const handleGunGameKill = (g: GameState) => {
    if (mode !== "gungame") return;
    g.gunGameKills++;
    if (g.gunGameKills % 5 === 0) {
      g.gunGameWeaponIndex = (g.gunGameWeaponIndex + 1) % WEAPON_ORDER.length;
      const newWeapon = WEAPON_ORDER[g.gunGameWeaponIndex];
      g.player.weapon = newWeapon;
      const wc = WEAPONS[newWeapon];
      g.player.ammo = wc.ammo;
      g.player.maxAmmo = wc.maxAmmo;
      onStateChange();
    }
  };

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={theme.ambientIntensity} />
      <directionalLight position={[20, 40, 15]} intensity={1.0} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-far={100} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} />
      {theme.pointLights.map((l, i) => (
        <pointLight key={i} position={l.pos} intensity={l.intensity} color={l.color} distance={l.distance} />
      ))}
      <hemisphereLight args={[theme.skyColor, "#000000", 0.3]} />

      {/* Sky dome */}
      <mesh>
        <sphereGeometry args={[200, 64, 64]} />
        <meshBasicMaterial color={theme.skyColor} side={THREE.BackSide} />
      </mesh>

      <StarField />

      {/* Ground */}
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ARENA_W, ARENA_H]} />
        <meshStandardMaterial color={theme.groundColor} roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[ARENA_W - 0.5, ARENA_H - 0.5]} />
        <meshStandardMaterial color={theme.groundColor2} roughness={0.85} metalness={0.05} transparent opacity={0.8} />
      </mesh>

      <gridHelper args={[Math.max(ARENA_W, ARENA_H), 32, theme.gridColor1, theme.gridColor2]} position={[0, 0.01, 0]} />

      <ThemedArenaWalls theme={theme} />

      <ModeEnvironment mode={mode} theme={theme} />

      {gs.current.cameraMode === "topdown" && <PlayerMesh gs={gs} />}
      {gs.current.cameraMode === "fps" && <FPSWeaponModel gs={gs} />}

      {gs.current.enemies.map((e) => <EnemyMesh key={e.id} enemy={e} />)}
      {gs.current.bullets.map((b, i) => <BulletMesh key={`pb_${i}`} bullet={b} />)}
      {gs.current.enemyBullets.map((b, i) => <BulletMesh key={`eb_${i}`} bullet={b} />)}
      {gs.current.pickups.map((pk, i) => <PickupMesh key={`pk_${i}`} pickup={pk} theme={theme} />)}
      {gs.current.particles.map((pt, i) => <ParticleMesh key={`pt_${i}`} particle={pt} />)}

      {gs.current.cameraMode === "fps" && <FPSCrosshair />}

      <fog attach="fog" args={[theme.fogColor, theme.fogNear, theme.fogFar]} />
    </>
  );
};

// ── Sub-components ────────────────────────────────────────────────────

const StarField = () => {
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
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={200} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.4} sizeAttenuation transparent opacity={0.7} />
    </points>
  );
};

// Mode-specific environment objects
const ModeEnvironment = ({ mode, theme }: { mode: string; theme: ModeTheme }) => {
  const timeRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null);

  // Animate moving platforms, bobbing, rotating objects
  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child) => {
      const ud = (child as any).userData;
      if (!ud) return;
      if (ud.movingPlatform) {
        child.position.x = ud.baseX + Math.sin(timeRef.current * ud.speed) * ud.range;
      }
      if (ud.movingZ) {
        child.position.z = ud.baseZ + Math.sin(timeRef.current * ud.speedZ) * ud.rangeZ;
      }
      if (ud.rotating) {
        child.rotation.y += delta * ud.rotSpeed;
      }
      if (ud.bobbing) {
        child.position.y = ud.baseY + Math.sin(timeRef.current * 2) * 0.3;
      }
    });
  });

  const objects = useMemo(() => {
    type EnvObj = { pos: [number, number, number]; size: [number, number, number]; color: string; emissive?: string; emissiveIntensity?: number; userData?: Record<string, any> };
    const items: EnvObj[] = [];

    // Base cover blocks in every mode
    items.push(
      { pos: [8, 0.75, 5], size: [1.5, 1.5, 1.5], color: theme.wallColor },
      { pos: [-10, 0.75, -7], size: [1.5, 1.5, 1.5], color: theme.wallColor },
      { pos: [15, 0.75, -10], size: [1.5, 1.5, 1.5], color: theme.wallColor },
      { pos: [-5, 0.75, 12], size: [1.5, 1.5, 1.5], color: theme.wallColor },
    );

    switch (mode) {
      case "ctf":
        items.push(
          { pos: [-18, 2, 0], size: [3, 4, 6], color: "#1a2244" },
          { pos: [18, 2, 0], size: [3, 4, 6], color: "#441a1a" },
          { pos: [-14, 1, -5], size: [0.5, 2, 3], color: "#1a2244" },
          { pos: [-14, 1, 5], size: [0.5, 2, 3], color: "#1a2244" },
          { pos: [14, 1, -5], size: [0.5, 2, 3], color: "#441a1a" },
          { pos: [14, 1, 5], size: [0.5, 2, 3], color: "#441a1a" },
          { pos: [0, 1, -4], size: [2, 2, 0.5], color: theme.wallColor },
          { pos: [0, 1, 4], size: [2, 2, 0.5], color: theme.wallColor },
        );
        break;
      case "koth":
        items.push(
          { pos: [0, 0.5, 0], size: [8, 1, 8], color: "#3a3020", emissive: theme.wallGlow1, emissiveIntensity: 0.1 },
          { pos: [-5, 0.25, 0], size: [2, 0.5, 4], color: "#2a2515" },
          { pos: [5, 0.25, 0], size: [2, 0.5, 4], color: "#2a2515" },
          { pos: [-12, 1, -8], size: [3, 2, 0.5], color: theme.wallColor },
          { pos: [12, 1, 8], size: [3, 2, 0.5], color: theme.wallColor },
        );
        break;
      case "arena":
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const r = 14;
          items.push({ pos: [Math.cos(a) * r, 2.5, Math.sin(a) * r], size: [1.2, 5, 1.2], color: "#2a1540" });
        }
        items.push(
          { pos: [0, 0.3, 0], size: [5, 0.6, 5], color: "#2a1540", emissive: "#AA33FF", emissiveIntensity: 0.15 },
          { pos: [-8, 0.4, 0], size: [3, 0.8, 2], color: "#3a2050", userData: { movingPlatform: true, baseX: -8, speed: 0.8, range: 4 } },
          { pos: [8, 0.4, 0], size: [3, 0.8, 2], color: "#3a2050", userData: { movingPlatform: true, baseX: 8, speed: 0.6, range: 5 } },
        );
        break;
      case "sniper":
        items.push(
          { pos: [0, 1.5, -8], size: [10, 3, 0.5], color: "#101830" },
          { pos: [0, 1.5, 8], size: [10, 3, 0.5], color: "#101830" },
          { pos: [-12, 1.5, 0], size: [0.5, 3, 8], color: "#101830" },
          { pos: [12, 1.5, 0], size: [0.5, 3, 8], color: "#101830" },
          { pos: [-18, 1, -12], size: [4, 2, 4], color: "#0a1020" },
          { pos: [18, 1, 12], size: [4, 2, 4], color: "#0a1020" },
          { pos: [-18, 2.5, -12], size: [5, 0.3, 5], color: "#101830" },
          { pos: [18, 2.5, 12], size: [5, 0.3, 5], color: "#101830" },
        );
        break;
      case "boss":
        items.push(
          { pos: [-10, 0.3, -6], size: [4, 0.6, 4], color: "#2a1010" },
          { pos: [10, 0.3, 6], size: [4, 0.6, 4], color: "#2a1010" },
          { pos: [0, 1.5, 0], size: [3, 3, 3], color: "#301515", emissive: "#FF2222", emissiveIntensity: 0.2 },
          { pos: [-6, 1.5, -6], size: [1, 3, 1], color: "#3a1515" },
          { pos: [6, 1.5, -6], size: [1, 3, 1], color: "#3a1515" },
          { pos: [-6, 1.5, 6], size: [1, 3, 1], color: "#3a1515" },
          { pos: [6, 1.5, 6], size: [1, 3, 1], color: "#3a1515" },
        );
        break;
      case "zombie":
        items.push(
          { pos: [-8, 0.5, -5], size: [4, 1, 0.5], color: "#1a2a1a" },
          { pos: [6, 0.5, 3], size: [0.5, 1, 4], color: "#1a2a1a" },
          { pos: [0, 0.75, -12], size: [6, 1.5, 0.5], color: "#0c200c" },
          { pos: [-15, 0.4, 8], size: [2, 0.8, 2], color: "#102a10" },
          { pos: [12, 0.6, -5], size: [0.8, 1.2, 0.8], color: "#228B22", emissive: "#00FF00", emissiveIntensity: 0.5 },
          { pos: [-4, 0.6, 10], size: [0.8, 1.2, 0.8], color: "#228B22", emissive: "#00FF00", emissiveIntensity: 0.5 },
        );
        break;
      case "infection":
        items.push(
          { pos: [-8, 0.05, 5], size: [5, 0.1, 5], color: "#44FF00", emissive: "#44FF00", emissiveIntensity: 0.4 },
          { pos: [10, 0.05, -8], size: [4, 0.1, 4], color: "#66FF00", emissive: "#66FF00", emissiveIntensity: 0.3 },
          { pos: [-14, 1.5, 0], size: [0.5, 3, 6], color: "#142a12" },
          { pos: [14, 1.5, 0], size: [0.5, 3, 6], color: "#142a12" },
        );
        break;
      case "dodgeball":
        items.push(
          { pos: [0, 0.05, 0], size: [0.3, 0.1, ARENA_H - 4], color: "#FF4466", emissive: "#FF4466", emissiveIntensity: 0.3 },
          { pos: [-6, 0.5, 0], size: [1, 1, 1], color: "#301520", userData: { movingZ: true, baseZ: 0, speedZ: 1.2, rangeZ: 8 } },
          { pos: [6, 0.5, 0], size: [1, 1, 1], color: "#301520", userData: { movingZ: true, baseZ: 0, speedZ: 0.9, rangeZ: 6 } },
        );
        break;
      case "survival":
        items.push(
          { pos: [0, 0.3, 0], size: [1.5, 0.6, 1.5], color: "#3a3015", emissive: "#FF8C00", emissiveIntensity: 0.6 },
          { pos: [-12, 0.5, -8], size: [3, 1, 1], color: "#2a2510" },
          { pos: [10, 0.5, 6], size: [1, 1, 3], color: "#2a2510" },
          { pos: [-5, 0.3, 10], size: [2, 0.6, 2], color: "#201a0c" },
          { pos: [16, 0.4, -4], size: [1.5, 0.8, 1.5], color: "#201a0c" },
        );
        break;
      case "tag":
        items.push(
          { pos: [-10, 0.05, -8], size: [3, 0.1, 3], color: "#33FF88", emissive: "#33FF88", emissiveIntensity: 0.5 },
          { pos: [10, 0.05, 8], size: [3, 0.1, 3], color: "#88FFAA", emissive: "#88FFAA", emissiveIntensity: 0.5 },
          { pos: [0, 0.05, 0], size: [2, 0.1, 2], color: "#33FF88", emissive: "#33FF88", emissiveIntensity: 0.7 },
          { pos: [-6, 0.5, 4], size: [3, 1, 0.3], color: "#183028" },
          { pos: [6, 0.5, -4], size: [3, 1, 0.3], color: "#183028" },
        );
        break;
      case "bounty":
        items.push(
          { pos: [-15, 1.5, -10], size: [0.3, 3, 2], color: "#2a2015", emissive: "#FFD700", emissiveIntensity: 0.1 },
          { pos: [15, 1.5, 10], size: [0.3, 3, 2], color: "#2a2015", emissive: "#FFD700", emissiveIntensity: 0.1 },
          { pos: [0, 0.4, 0], size: [1.5, 0.8, 1.5], color: "#B8860B", emissive: "#FFD700", emissiveIntensity: 0.3 },
          { pos: [-8, 0.3, 6], size: [1, 0.6, 1], color: "#B8860B", emissive: "#FFD700", emissiveIntensity: 0.2 },
        );
        break;
      case "demolition":
        items.push(
          { pos: [-8, 0.6, -5], size: [0.8, 1.2, 0.8], color: "#FF4400", emissive: "#FF6600", emissiveIntensity: 0.6 },
          { pos: [10, 0.6, 3], size: [0.8, 1.2, 0.8], color: "#FF4400", emissive: "#FF6600", emissiveIntensity: 0.6 },
          { pos: [0, 0.6, 10], size: [0.8, 1.2, 0.8], color: "#FF4400", emissive: "#FF6600", emissiveIntensity: 0.6 },
          { pos: [-14, 0.6, 8], size: [0.8, 1.2, 0.8], color: "#FF4400", emissive: "#FF6600", emissiveIntensity: 0.6 },
          { pos: [5, 0.3, -8], size: [3, 0.6, 2], color: "#302010" },
          { pos: [-12, 0.4, -10], size: [2, 0.8, 2], color: "#302010" },
        );
        break;
      case "medic":
        items.push(
          { pos: [-12, 0.8, 0], size: [1.5, 1.6, 1.5], color: "#182838", emissive: "#33AAFF", emissiveIntensity: 0.4 },
          { pos: [12, 0.8, 0], size: [1.5, 1.6, 1.5], color: "#182838", emissive: "#33AAFF", emissiveIntensity: 0.4 },
          { pos: [0, 0.5, -6], size: [4, 1, 0.3], color: "#203040" },
          { pos: [0, 0.5, 6], size: [4, 1, 0.3], color: "#203040" },
        );
        break;
      case "lms":
        items.push(
          { pos: [-8, 1, -6], size: [1, 2, 1], color: "#221430" },
          { pos: [8, 1, 6], size: [1, 2, 1], color: "#221430" },
          { pos: [-4, 1, 8], size: [1, 2, 1], color: "#221430" },
          { pos: [4, 1, -8], size: [1, 2, 1], color: "#221430" },
          { pos: [0, 2, 0], size: [2, 4, 2], color: "#302040", emissive: "#DD44FF", emissiveIntensity: 0.2 },
        );
        break;
      case "vip":
        items.push(
          { pos: [0, 0.3, 0], size: [6, 0.6, 6], color: "#1a1a45", emissive: "#FFD700", emissiveIntensity: 0.15 },
          { pos: [-4, 1.5, -4], size: [1, 3, 1], color: "#1a1a45" },
          { pos: [4, 1.5, -4], size: [1, 3, 1], color: "#1a1a45" },
          { pos: [-4, 1.5, 4], size: [1, 3, 1], color: "#1a1a45" },
          { pos: [4, 1.5, 4], size: [1, 3, 1], color: "#1a1a45" },
        );
        break;
      case "payload":
        items.push(
          { pos: [0, 0.05, 0], size: [ARENA_W - 8, 0.1, 1.5], color: "#FF8844", emissive: "#FF8844", emissiveIntensity: 0.2 },
          { pos: [-15, 1, 0], size: [1.5, 2, 1.5], color: "#201838", emissive: "#CC6633", emissiveIntensity: 0.3 },
          { pos: [0, 1, 0], size: [1.5, 2, 1.5], color: "#201838", emissive: "#CC6633", emissiveIntensity: 0.3 },
          { pos: [15, 1, 0], size: [1.5, 2, 1.5], color: "#201838", emissive: "#CC6633", emissiveIntensity: 0.3 },
          { pos: [-8, 1, 5], size: [3, 2, 0.5], color: theme.wallColor },
          { pos: [8, 1, -5], size: [3, 2, 0.5], color: theme.wallColor },
        );
        break;
      case "blitz":
        items.push(
          { pos: [-10, 0.05, 0], size: [2, 0.1, ARENA_H - 6], color: "#FFCC00", emissive: "#FFCC00", emissiveIntensity: 0.4 },
          { pos: [10, 0.05, 0], size: [2, 0.1, ARENA_H - 6], color: "#FF8800", emissive: "#FF8800", emissiveIntensity: 0.4 },
          { pos: [0, 0.6, 0], size: [2, 1.2, 2], color: "#302810", userData: { movingPlatform: true, baseX: 0, speed: 1.5, range: 10 } },
          { pos: [0, 0.6, 8], size: [2, 1.2, 2], color: "#302810", userData: { movingPlatform: true, baseX: 0, speed: 1.0, range: 8 } },
        );
        break;
      case "juggernaut":
        items.push(
          { pos: [0, 2, 0], size: [4, 4, 4], color: "#2a1515", emissive: "#CC0000", emissiveIntensity: 0.15 },
          { pos: [-10, 0.5, -6], size: [4, 1, 1], color: "#1a0e0e" },
          { pos: [10, 0.5, 6], size: [4, 1, 1], color: "#1a0e0e" },
          { pos: [-6, 0.5, 10], size: [1, 1, 4], color: "#1a0e0e" },
          { pos: [6, 0.5, -10], size: [1, 1, 4], color: "#1a0e0e" },
        );
        break;
      case "stealth":
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const r = 10;
          items.push({ pos: [Math.cos(a) * r, 1.5, Math.sin(a) * r], size: [1, 3, 1], color: "#101018" });
        }
        items.push(
          { pos: [-12, 0.4, -8], size: [0.5, 0.8, 0.5], color: "#4444AA", emissive: "#4444AA", emissiveIntensity: 0.8 },
          { pos: [12, 0.4, 8], size: [0.5, 0.8, 0.5], color: "#4444AA", emissive: "#4444AA", emissiveIntensity: 0.8 },
        );
        break;
      case "mirror":
        items.push(
          { pos: [-8, 2, -6], size: [1, 4, 1], color: "#CCCCCC", emissive: "#FFFFFF", emissiveIntensity: 0.1 },
          { pos: [8, 2, 6], size: [1, 4, 1], color: "#CCCCCC", emissive: "#FFFFFF", emissiveIntensity: 0.1 },
          { pos: [-8, 2, 6], size: [1, 4, 1], color: "#CCCCCC", emissive: "#FFFFFF", emissiveIntensity: 0.1 },
          { pos: [8, 2, -6], size: [1, 4, 1], color: "#CCCCCC", emissive: "#FFFFFF", emissiveIntensity: 0.1 },
          { pos: [0, 1, 0], size: [2, 2, 2], color: "#DDDDDD", emissive: "#FFFFFF", emissiveIntensity: 0.15 },
        );
        break;
      case "lowgrav":
        items.push(
          { pos: [-8, 2, -5], size: [3, 0.4, 3], color: "#1a1a40", emissive: "#8866FF", emissiveIntensity: 0.2, userData: { bobbing: true, baseY: 2 } },
          { pos: [8, 3, 5], size: [3, 0.4, 3], color: "#1a1a40", emissive: "#AA88FF", emissiveIntensity: 0.2, userData: { bobbing: true, baseY: 3 } },
          { pos: [0, 2.5, 0], size: [4, 0.4, 4], color: "#141430", emissive: "#8866FF", emissiveIntensity: 0.3, userData: { bobbing: true, baseY: 2.5 } },
          { pos: [-14, 1.5, 8], size: [0.8, 3, 0.8], color: "#6644DD", emissive: "#8866FF", emissiveIntensity: 0.4 },
          { pos: [14, 1.5, -8], size: [0.8, 3, 0.8], color: "#6644DD", emissive: "#AA88FF", emissiveIntensity: 0.4 },
        );
        break;
      case "chaos":
        items.push(
          { pos: [-10, 0.5, -8], size: [2, 1, 2], color: "#401830", userData: { rotating: true, rotSpeed: 1.5 } },
          { pos: [10, 0.5, 8], size: [2, 1, 2], color: "#301020", userData: { rotating: true, rotSpeed: -1.2 } },
          { pos: [0, 0.5, 0], size: [1.5, 1, 1.5], color: "#301020", userData: { rotating: true, rotSpeed: 2.0 } },
          { pos: [-5, 1, 5], size: [0.6, 0.6, 0.6], color: "#FF00FF", emissive: "#FF00FF", emissiveIntensity: 1.0, userData: { bobbing: true, baseY: 1 } },
          { pos: [5, 1, -5], size: [0.6, 0.6, 0.6], color: "#00FFFF", emissive: "#00FFFF", emissiveIntensity: 1.0, userData: { bobbing: true, baseY: 1 } },
          { pos: [0, 1.5, 10], size: [0.6, 0.6, 0.6], color: "#FFFF00", emissive: "#FFFF00", emissiveIntensity: 1.0, userData: { bobbing: true, baseY: 1.5 } },
        );
        break;
      case "headhunter":
        items.push(
          { pos: [-15, 1.5, 0], size: [0.3, 3, 2], color: "#2a1c12", emissive: "#FF4400", emissiveIntensity: 0.15 },
          { pos: [15, 1.5, 0], size: [0.3, 3, 2], color: "#2a1c12", emissive: "#FF4400", emissiveIntensity: 0.15 },
          { pos: [0, 0.05, 0], size: [6, 0.1, 0.3], color: "#FF4400", emissive: "#FF4400", emissiveIntensity: 0.3 },
          { pos: [0, 0.05, 0], size: [0.3, 0.1, 6], color: "#FF4400", emissive: "#FF4400", emissiveIntensity: 0.3 },
          { pos: [-8, 1, -6], size: [3, 2, 0.5], color: theme.wallColor },
          { pos: [8, 1, 6], size: [3, 2, 0.5], color: theme.wallColor },
        );
        break;
      case "vampire":
        items.push(
          { pos: [-10, 0.4, -8], size: [1, 0.8, 2.5], color: "#2a0a1a" },
          { pos: [10, 0.4, 8], size: [1, 0.8, 2.5], color: "#2a0a1a" },
          { pos: [-5, 0.03, 5], size: [4, 0.06, 4], color: "#CC0044", emissive: "#CC0044", emissiveIntensity: 0.3 },
          { pos: [8, 0.03, -3], size: [3, 0.06, 3], color: "#880033", emissive: "#880033", emissiveIntensity: 0.2 },
          { pos: [-14, 2, 0], size: [1, 4, 1], color: "#200a14" },
          { pos: [14, 2, 0], size: [1, 4, 1], color: "#200a14" },
        );
        break;
      case "frostbite":
        items.push(
          { pos: [-10, 1.5, -6], size: [1.2, 3, 1.2], color: "#88DDFF", emissive: "#88DDFF", emissiveIntensity: 0.3 },
          { pos: [10, 1.5, 6], size: [1.2, 3, 1.2], color: "#44AADD", emissive: "#44AADD", emissiveIntensity: 0.3 },
          { pos: [0, 2, 0], size: [0.8, 4, 0.8], color: "#66CCEE", emissive: "#88DDFF", emissiveIntensity: 0.4 },
          { pos: [-6, 0.03, 4], size: [5, 0.06, 5], color: "#88DDFF", emissive: "#88DDFF", emissiveIntensity: 0.15 },
          { pos: [8, 0.03, -6], size: [4, 0.06, 4], color: "#44AADD", emissive: "#44AADD", emissiveIntensity: 0.15 },
          { pos: [-14, 0.4, 10], size: [3, 0.8, 2], color: "#DDEEFF" },
          { pos: [16, 0.4, -10], size: [2, 0.8, 3], color: "#DDEEFF" },
        );
        break;
      case "titan":
        items.push(
          { pos: [-10, 3, -8], size: [2, 6, 2], color: "#200a12", emissive: "#FF6633", emissiveIntensity: 0.1 },
          { pos: [10, 3, 8], size: [2, 6, 2], color: "#200a12", emissive: "#FF6633", emissiveIntensity: 0.1 },
          { pos: [-10, 3, 8], size: [2, 6, 2], color: "#200a12", emissive: "#CC4422", emissiveIntensity: 0.1 },
          { pos: [10, 3, -8], size: [2, 6, 2], color: "#200a12", emissive: "#CC4422", emissiveIntensity: 0.1 },
          { pos: [0, 1.5, 0], size: [5, 3, 5], color: "#1a0810", emissive: "#FF6633", emissiveIntensity: 0.15 },
        );
        break;
      case "school":
        items.push(
          { pos: [-8, 0.5, -6], size: [3, 1, 1.5], color: "#152828" },
          { pos: [-4, 0.5, -6], size: [3, 1, 1.5], color: "#152828" },
          { pos: [0, 0.5, -6], size: [3, 1, 1.5], color: "#152828" },
          { pos: [4, 0.5, -6], size: [3, 1, 1.5], color: "#152828" },
          { pos: [0, 2, -14], size: [12, 3, 0.3], color: "#0a1a1a", emissive: "#228888", emissiveIntensity: 0.05 },
        );
        break;
      case "youvsme":
        items.push(
          { pos: [0, 0.05, 0], size: [0.2, 0.1, ARENA_H - 4], color: "#FF2266", emissive: "#FF2266", emissiveIntensity: 0.4 },
          { pos: [-16, 0.3, -12], size: [4, 0.6, 4], color: "#2a1020" },
          { pos: [16, 0.3, 12], size: [4, 0.6, 4], color: "#2a1020" },
        );
        break;
      case "gungame":
        items.push(
          { pos: [-10, 1, -6], size: [2, 2, 0.5], color: "#222222" },
          { pos: [10, 1, 6], size: [2, 2, 0.5], color: "#222222" },
          { pos: [0, 1, 0], size: [0.5, 2, 4], color: "#222222" },
          { pos: [-6, 0.4, 8], size: [1.5, 0.8, 1.5], color: "#333333", userData: { rotating: true, rotSpeed: 0.5 } },
        );
        break;
      case "ranked":
        items.push(
          { pos: [0, 0.3, 0], size: [4, 0.6, 4], color: "#1a1a40", emissive: "#FFD700", emissiveIntensity: 0.2 },
          { pos: [-12, 1, -8], size: [3, 2, 0.5], color: "#1a1a40" },
          { pos: [12, 1, 8], size: [3, 2, 0.5], color: "#1a1a40" },
          { pos: [-6, 1.5, 6], size: [1, 3, 1], color: "#252560" },
          { pos: [6, 1.5, -6], size: [1, 3, 1], color: "#252560" },
        );
        break;
      default:
        items.push(
          { pos: [0, 1.5, -8], size: [4, 3, 0.5], color: theme.wallColor },
          { pos: [-12, 1.5, 3], size: [0.5, 3, 4], color: theme.wallColor },
          { pos: [12, 1.5, 8], size: [0.5, 3, 4], color: theme.wallColor },
        );
        break;
    }
    return items;
  }, [mode, theme]);

  return (
    <group ref={groupRef}>
      {objects.map((obj, i) => (
        <mesh key={i} position={obj.pos} castShadow receiveShadow userData={obj.userData || {}}>
          <boxGeometry args={obj.size} />
          <meshStandardMaterial
            color={obj.color}
            roughness={0.8}
            metalness={obj.emissive ? 0.3 : 0.1}
            emissive={obj.emissive || "#000000"}
            emissiveIntensity={obj.emissiveIntensity || 0}
          />
        </mesh>
      ))}
      {/* Center glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[2, 2.3, 32]} />
        <meshBasicMaterial color={theme.wallGlow1} transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
      {mode === "koth" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[3.5, 4, 32]} />
          <meshBasicMaterial color={theme.wallGlow1} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
      {mode === "ctf" && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-18, 0.03, 0]}>
            <circleGeometry args={[2, 32]} />
            <meshBasicMaterial color="#3388FF" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[18, 0.03, 0]}>
            <circleGeometry args={[2, 32]} />
            <meshBasicMaterial color="#FF3333" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  );
};

const ThemedArenaWalls = ({ theme }: { theme: ModeTheme }) => {
  const hw = ARENA_W / 2, hh = ARENA_H / 2;
  const wallH = 4, wallThick = 0.4;
  return (
    <group>
      <mesh position={[0, wallH / 2, -hh]} castShadow>
        <boxGeometry args={[ARENA_W, wallH, wallThick]} />
        <meshStandardMaterial color={theme.wallColor} roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, wallH, -hh]}>
        <boxGeometry args={[ARENA_W, 0.1, wallThick + 0.1]} />
        <meshStandardMaterial color={theme.wallGlow1} emissive={theme.wallGlow1} emissiveIntensity={0.5} transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, wallH / 2, hh]} castShadow>
        <boxGeometry args={[ARENA_W, wallH, wallThick]} />
        <meshStandardMaterial color={theme.wallColor} roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, wallH, hh]}>
        <boxGeometry args={[ARENA_W, 0.1, wallThick + 0.1]} />
        <meshStandardMaterial color={theme.wallGlow1} emissive={theme.wallGlow1} emissiveIntensity={0.5} transparent opacity={0.6} />
      </mesh>
      <mesh position={[-hw, wallH / 2, 0]} castShadow>
        <boxGeometry args={[wallThick, wallH, ARENA_H]} />
        <meshStandardMaterial color={theme.wallColor} roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[-hw, wallH, 0]}>
        <boxGeometry args={[wallThick + 0.1, 0.1, ARENA_H]} />
        <meshStandardMaterial color={theme.wallGlow2} emissive={theme.wallGlow2} emissiveIntensity={0.5} transparent opacity={0.6} />
      </mesh>
      <mesh position={[hw, wallH / 2, 0]} castShadow>
        <boxGeometry args={[wallThick, wallH, ARENA_H]} />
        <meshStandardMaterial color={theme.wallColor} roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[hw, wallH, 0]}>
        <boxGeometry args={[wallThick + 0.1, 0.1, ARENA_H]} />
        <meshStandardMaterial color={theme.wallGlow2} emissive={theme.wallGlow2} emissiveIntensity={0.5} transparent opacity={0.6} />
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
    meshRef.current.rotation.y = -p.angle;
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

const PickupMesh = ({ pickup, theme }: { pickup: Pickup3D; theme: ModeTheme }) => (
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
  const theme = useMemo(() => getTheme(mode || "solo"), [mode]);
  
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
      x: 0, z: 0, r: 0.7, speed: theme.playerSpeed, angle: 0,
      weapon: "pistol", lastShot: -1, lastMelee: -1,
      hp: 100, maxHp: 100, score: 0, ammo: 10, maxAmmo: 10,
    },
    enemies: [], bullets: [], enemyBullets: [], pickups: [], particles: [],
    keys: {}, mouseDown: false, mouseNDC: { x: 0, y: 0 },
    time: 0, lastSpawn: 0, spawnInterval: theme.spawnInterval,
    gameOver: false, cameraMode: "topdown",
    godMode: false, infiniteAmmo: false, speedMultiplier: 1,
    spawnImmune: true, aimbot: false,
    dashCooldown: 2.0, lastDash: -10,
    gunGameKills: 0, gunGameWeaponIndex: 0,
  });

  const handleStateChange = useCallback(() => {
    const g = gsRef.current;
    const p = g.player;
    setScore(p.score);
    setAmmo(p.ammo);
    setMaxAmmo(p.maxAmmo);
    setCurrentWeapon(p.weapon);
    setHealth(Math.max(0, Math.round(p.hp)));
    if (g.gameOver && !gameOver) {
      setGameOver(true);
      setDeaths(prev => prev + 1);
      saveProgress(p.score);
    }
    setForceUpdate(prev => prev + 1);
  }, [gameOver]);

  useEffect(() => {
    const interval = setInterval(() => {
      const p = gsRef.current.player;
      setScore(p.score);
      setAmmo(p.ammo);
      setHealth(Math.max(0, Math.round(p.hp)));
      setKills(p.score / 10);
      setCurrentWeapon(p.weapon);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    gsRef.current.spawnImmune = true;
    setSpawnImmunity(true);
    const timer = setTimeout(() => {
      gsRef.current.spawnImmune = false;
      setSpawnImmunity(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      gsRef.current.keys[key] = true;

      if (e.key === "F7") {
        e.preventDefault();
        const newMode = gsRef.current.cameraMode === "fps" ? "topdown" : "fps";
        gsRef.current.cameraMode = newMode;
        setCameraMode(newMode);
        toast.info(`Camera: ${newMode === "fps" ? "First Person" : "Top Down"}`);
      }

      if (e.key === "F9") {
        e.preventDefault();
        if (isOwner) {
          const newAimbot = !gsRef.current.aimbot;
          gsRef.current.aimbot = newAimbot;
          setAimbotActive(newAimbot);
          toast.info(`Aimbot ${newAimbot ? "ON 🎯" : "OFF"}`);
        }
      }

      if (key === "r") {
        const p = gsRef.current.player;
        const wc = WEAPONS[p.weapon];
        if (!wc.isMelee && p.ammo < wc.maxAmmo) {
          p.ammo = wc.maxAmmo;
          setAmmo(p.ammo);
        }
      }

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

  useEffect(() => {
    loadUserProgress();
    checkPermissions();
  }, []);

  useEffect(() => {
    const now = new Date();
    for (const event of adminAbuseEvents) {
      if (new Date(event.expires_at) > now) {
        if (event.event_type === "godmode") gsRef.current.godMode = true;
        if (event.event_type === "all_weapons") setUnlockedWeapons([...WEAPON_ORDER]);
      }
    }
  }, [adminAbuseEvents]);

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
        speed: theme.enemySpeed[0] + Math.random() * (theme.enemySpeed[1] - theme.enemySpeed[0]),
        hp: theme.enemyHp, maxHp: theme.enemyHp,
        color: theme.enemyColor, stun: 0, lastShot: -1,
      });
    }
  }, []);

  const checkPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
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
      <div className="w-full h-full" style={{ pointerEvents: "auto", cursor: "none" }}>
        <Canvas
          camera={{ fov: 50, near: 0.1, far: 500, position: [0, 35, 15] }}
          shadows
          style={{ background: theme.skyColor, cursor: "none" }}
        >
          <GameScene gs={gsRef} onStateChange={handleStateChange} theme={theme} mode={mode || "solo"} />
        </Canvas>
      </div>

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

      {/* HUD - Top left */}
      <div className="fixed left-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-2 z-40" style={{ cursor: "default" }}>
        <div className="font-bold text-lg">Food FPS 3D · {modeName}</div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div><span className="text-primary font-mono">WASD</span> move</div>
          <div><span className="text-primary font-mono">Mouse</span> aim</div>
          <div><span className="text-primary font-mono">LMB</span> shoot</div>
          {!WEAPONS[currentWeapon].isMelee && <div><span className="text-primary font-mono">R</span> reload</div>}
          <div><span className="text-primary font-mono">1-{unlockedWeapons.length}</span> weapons</div>
          {(mode === "arena" || mode === "tag" || mode === "dodgeball") && (
            <div><span className="text-accent font-mono">Shift</span> dash</div>
          )}
          <div className="pt-1 border-t border-border">
            <span className="text-accent font-mono">F7</span> toggle camera
          </div>
          {isOwner && (
            <div><span className="text-accent font-mono">F9</span> aimbot</div>
          )}
        </div>
        {theme.specialFeature && (
          <div className="text-xs text-accent italic border-t border-border pt-1">{theme.specialFeature}</div>
        )}
        <div className="flex items-center gap-2 text-xs text-accent">
          <Camera className="w-3 h-3" />
          {cameraMode === "fps" ? "First Person" : "Top Down"}
        </div>
        {aimbotActive && (
          <div className="flex items-center gap-2 text-xs text-destructive font-bold animate-pulse">🎯 AIMBOT ACTIVE</div>
        )}
      </div>

      {/* HUD - Top right */}
      <div className="fixed right-4 top-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 space-y-3 min-w-[180px] z-40">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Health</span>
          <span className="font-bold text-lg">{health}</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
          <div className="h-full transition-all duration-300" style={{ 
            width: `${(health / maxHealth) * 100}%`,
            background: `linear-gradient(to right, ${theme.wallGlow1}, ${theme.wallGlow2})`
          }} />
        </div>

        {spawnImmunity && (
          <div className="flex items-center gap-2 text-sm" style={{ color: theme.wallGlow1 }}>
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
