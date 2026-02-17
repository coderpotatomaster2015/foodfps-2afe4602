import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Broadcast {
  id: string;
  message: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface AdminAbuseEvent {
  id: string;
  event_type: string;
  expires_at: string;
  is_active: boolean;
}

interface GameStatus {
  websiteEnabled: boolean;
  isBanned: boolean;
  banInfo: { expires_at: string; reason: string; hours_remaining: number } | null;
  activeBroadcast: Broadcast | null;
  adminAbuseEvents: AdminAbuseEvent[];
}

export const useGameStatus = (userId: string | null) => {
  const [status, setStatus] = useState<GameStatus>({
    websiteEnabled: true,
    isBanned: false,
    banInfo: null,
    activeBroadcast: null,
    adminAbuseEvents: [],
  });
  const lastBroadcastIdRef = useRef<string | null>(null);
  const shownBroadcastsRef = useRef<Set<string>>(new Set());

  const checkStatus = useCallback(async () => {
    try {
      // Check website status
      const { data: settings } = await supabase
        .from("game_settings")
        .select("website_enabled")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .maybeSingle();

      // Check ban status
      let banInfo = null;
      let isBanned = false;
      if (userId) {
        const { data: banData } = await supabase.rpc("get_ban_info", { _user_id: userId });
        if (banData && banData.length > 0) {
          banInfo = banData[0];
          isBanned = true;
        }
      }

      // Check active broadcasts - get global ones + targeted to this user
      const now = new Date().toISOString();
      const { data: broadcasts } = await supabase
        .from("broadcasts")
        .select("*")
        .eq("is_active", true)
        .gt("expires_at", now)
        .order("created_at", { ascending: false })
        .limit(5);

      // Filter: show global (no target) or targeted at current user
      const relevantBroadcasts = broadcasts?.filter(
        b => !(b as any).target_user_id || (b as any).target_user_id === userId
      ) || [];

      const activeBroadcast = relevantBroadcasts.length > 0 ? relevantBroadcasts[0] : null;
      
      // Show toast for new broadcasts (only once per broadcast)
      if (activeBroadcast && !shownBroadcastsRef.current.has(activeBroadcast.id)) {
        shownBroadcastsRef.current.add(activeBroadcast.id);
        lastBroadcastIdRef.current = activeBroadcast.id;
        toast.info(`📢 ${activeBroadcast.message}`, { duration: 10000 });
      }

      // Check admin abuse events - filter expired ones
      const { data: abuseEvents } = await supabase
        .from("admin_abuse_events")
        .select("*")
        .eq("is_active", true)
        .gt("expires_at", now);

      setStatus({
        websiteEnabled: settings?.website_enabled ?? true,
        isBanned,
        banInfo,
        activeBroadcast,
        adminAbuseEvents: abuseEvents || [],
      });
    } catch (error) {
      console.error("Error checking game status:", error);
    }
  }, [userId]);

  useEffect(() => {
    checkStatus();
    
    // Check every 2 seconds (less aggressive, still responsive)
    const interval = setInterval(checkStatus, 2000);

    // Also subscribe to realtime updates for instant notifications
    const broadcastChannel = supabase
      .channel("broadcasts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcasts" },
        () => {
          checkStatus();
        }
      )
      .subscribe();

    const abuseChannel = supabase
      .channel("abuse-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_abuse_events" },
        () => {
          checkStatus();
        }
      )
      .subscribe();

    const banChannel = supabase
      .channel("ban-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bans" },
        () => {
          checkStatus();
        }
      )
      .subscribe();

    const settingsChannel = supabase
      .channel("settings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_settings" },
        () => {
          checkStatus();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(abuseChannel);
      supabase.removeChannel(banChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [checkStatus]);

  return status;
};