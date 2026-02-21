export type SupportedPower =
  | "teleport"
  | "double_damage"
  | "speed"
  | "shield"
  | "slow_motion"
  | "invisibility"
  | "rainbow"
  | "all_powers"
  | "ultimate"
  | "legendary";

const POWER_EFFECTS: Record<SupportedPower, string[]> = {
  teleport: ["teleport"],
  double_damage: ["double_damage"],
  speed: ["speed"],
  shield: ["shield"],
  slow_motion: ["slow_motion"],
  invisibility: ["invisibility"],
  rainbow: ["speed", "invisibility"],
  all_powers: ["teleport", "double_damage", "speed", "shield", "slow_motion", "invisibility"],
  ultimate: ["teleport", "double_damage", "speed", "shield", "slow_motion", "invisibility"],
  legendary: ["teleport", "double_damage", "speed", "shield", "slow_motion", "invisibility"],
};

export const getPowerEffects = (power: string | null | undefined): string[] => {
  if (!power) return [];
  const normalized = power as SupportedPower;
  return POWER_EFFECTS[normalized] || [];
};

export const hasPowerEffect = (power: string | null | undefined, effect: string): boolean => {
  return getPowerEffects(power).includes(effect);
};

export const getPowerDescription = (powerId: string): string => {
  const descriptions: Record<string, string> = {
    teleport: "Press SHIFT to teleport forward (3s cooldown)",
    double_damage: "Deal 2x damage with all weapons",
    speed: "30% movement speed increase",
    shield: "Start with 125 HP instead of 100",
    slow_motion: "Enemies move 50% slower near you",
    invisibility: "Enemies have reduced accuracy targeting you",
    rainbow: "Rainbow Aura: gain Speed + Invisibility buffs",
    all_powers: "Master Core: enables Teleport, Shield, Damage, Speed, Slow-Motion, and Invisibility",
    ultimate: "Ultimate Core: grants every combat power effect",
    legendary: "Legendary Core: grants every combat power effect",
  };

  return descriptions[powerId] || "Special power effect";
};
