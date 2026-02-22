// Client-side rate limiter to prevent spam
// Also calls server-side check_rate_limit_and_ban for auto-perm-ban on 100+ requests in 10s

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  actionType: string;
}

const requestTimestamps: Map<string, number[]> = new Map();

export const checkClientRateLimit = (config: RateLimitConfig): boolean => {
  const now = Date.now();
  const key = config.actionType;
  const timestamps = requestTimestamps.get(key) || [];
  
  // Remove expired timestamps
  const validTimestamps = timestamps.filter(t => now - t < config.windowMs);
  
  if (validTimestamps.length >= config.maxRequests) {
    toast.error(`Too many requests! Please wait before trying again.`);
    return false;
  }
  
  validTimestamps.push(now);
  requestTimestamps.set(key, validTimestamps);
  return true;
};

// Server-side rate limit check that also auto-bans on 100+ requests in 10 seconds
export const checkServerRateLimit = async (userId: string, actionType: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit_and_ban", {
      _user_id: userId,
      _action_type: actionType,
    });
    
    if (error) {
      console.error("Rate limit check error:", error);
      return true; // Allow on error to avoid blocking legitimate users
    }
    
    if (data === false) {
      toast.error("You have been banned for excessive requests.");
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Rate limit check failed:", err);
    return true;
  }
};

// Combined client + server rate limit check
export const rateLimitedAction = async (
  userId: string,
  actionType: string,
  clientConfig: { maxRequests: number; windowMs: number }
): Promise<boolean> => {
  // Client-side check first (fast, no network)
  if (!checkClientRateLimit({ ...clientConfig, actionType })) {
    return false;
  }
  
  // Server-side check (tracks across sessions, auto-bans spammers)
  return checkServerRateLimit(userId, actionType);
};

// Pre-configured rate limits for common actions
export const RATE_LIMITS = {
  CHAT_MESSAGE: { maxRequests: 5, windowMs: 10000 },      // 5 messages per 10s
  SEND_MESSAGE: { maxRequests: 3, windowMs: 30000 },       // 3 DMs per 30s
  BAN_ACTION: { maxRequests: 5, windowMs: 60000 },         // 5 ban actions per minute
  GENERAL_WRITE: { maxRequests: 10, windowMs: 10000 },     // 10 writes per 10s
} as const;
