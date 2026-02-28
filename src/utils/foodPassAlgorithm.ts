// Dynamic Food Pass tier generation algorithm
// Based on exponential XP scaling, logarithmic reward curves,
// dynamic economy balancing, and weighted reward type distribution.

export interface GeneratedTier {
  tier: number;
  score_required: number;
  reward_type: string;
  reward_value: number;
  power_unlock: string | null;
}

// --- 1. Progression Curve ---
// XP_required(L) = BaseXP * (L ^ 1.5) + (L * 50)
const BASE_XP = 500;

function xpRequired(level: number): number {
  return Math.floor(BASE_XP * Math.pow(level, 1.5) + level * 50);
}

// --- 2. Reward Value Curve ---
// RewardValue(L) = A * log(L + 1) + B * DifficultyModifier
function rewardValue(level: number, avgSessionXp: number): number {
  const A = 100;
  const B = 10;
  const difficultyMod = xpRequired(level) / Math.max(1, avgSessionXp);
  return A * Math.log(level + 1) + B * difficultyMod;
}

// --- 3. Dynamic Economy Balancer ---
// f(PlayerData) = 1 - 0.5 * (AvgDailyCompletion - TargetCompletion)
function balanceFactor(avgDailyCompletion: number, targetCompletion = 1.0): number {
  return Math.max(0.5, 1 - 0.5 * (avgDailyCompletion - targetCompletion));
}

// --- 4. Reward Tier Generator (Weighted Distribution) ---
const AVAILABLE_POWERS = [
  "super_speed", "time_warp", "chain_lightning", "shield",
  "double_damage", "teleport", "slow_motion", "invisibility",
  "magnet", "freeze_aura", "explosion", "regeneration",
  "vampire", "gravity_well", "mirror_shield", "berserk",
  "phase_shift", "overcharge", "venom", "earthquake",
];

function pickRewardType(
  level: number,
  cosmeticsOwned: number,
  activeDays: number,
  inflationRisk: number
): string {
  const weights: Record<string, number> = {
    coins: 0.35 - (inflationRisk > 0.3 ? 0.1 : 0),
    gems: 0.25 + (cosmeticsOwned < 5 ? 0.05 : 0),
    gold: 0.2,
    power: 0.05 + 0.02 * Math.floor(level / 10),
  };

  // Every 10th tier is guaranteed a power unlock
  if (level % 10 === 0 && level <= AVAILABLE_POWERS.length * 10) {
    return "power";
  }

  // Every 25th tier has boosted gold
  if (level % 25 === 0) {
    return "gold";
  }

  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (const [type, weight] of Object.entries(weights)) {
    r -= weight;
    if (r <= 0) return type;
  }
  return "coins";
}

function getRewardValueForType(
  type: string,
  level: number,
  baseValue: number,
  factor: number
): number {
  const adjusted = baseValue * factor;
  switch (type) {
    case "coins":
      return Math.max(10, Math.round(adjusted * 1.2));
    case "gems":
      return Math.max(5, Math.round(adjusted * 0.6));
    case "gold":
      return Math.max(3, Math.round(adjusted * 0.3));
    case "power":
      return 1;
    default:
      return Math.round(adjusted);
  }
}

// Deterministic seeded random so tiers are consistent for same tier number
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function deterministicPickRewardType(level: number): string {
  // Every 10th tier → power
  if (level % 10 === 0 && level <= AVAILABLE_POWERS.length * 10) {
    return "power";
  }
  // Every 25th tier → gold
  if (level % 25 === 0) {
    return "gold";
  }

  const weights = { coins: 0.35, gems: 0.25, gold: 0.2, power: 0.05 + 0.02 * Math.floor(level / 10) };
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  let r = seededRandom(level + 7777) * total;
  for (const [type, weight] of Object.entries(weights)) {
    r -= weight;
    if (r <= 0) return type;
  }
  return "coins";
}

/**
 * Generate all 600 Food Pass tiers using the algorithm.
 * Uses deterministic seeding so tiers are the same for all players.
 */
export function generateFoodPassTiers(totalTiers = 600): GeneratedTier[] {
  const tiers: GeneratedTier[] = [];
  const avgSessionXp = 800; // baseline assumption
  const avgDailyCompletion = 1.0;
  const factor = balanceFactor(avgDailyCompletion);
  let powerIndex = 0;

  for (let i = 1; i <= totalTiers; i++) {
    const scoreReq = xpRequired(i);
    const type = deterministicPickRewardType(i);
    const baseVal = rewardValue(i, avgSessionXp);
    const value = getRewardValueForType(type, i, baseVal, factor);

    let powerUnlock: string | null = null;
    if (type === "power" && powerIndex < AVAILABLE_POWERS.length) {
      powerUnlock = AVAILABLE_POWERS[powerIndex];
      powerIndex++;
    }

    tiers.push({
      tier: i,
      score_required: scoreReq,
      reward_type: type,
      reward_value: value,
      power_unlock: powerUnlock,
    });
  }

  return tiers;
}
