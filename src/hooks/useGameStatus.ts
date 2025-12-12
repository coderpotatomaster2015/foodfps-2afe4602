import { useEffect, useState, useCallback } from "react";
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
  const [lastBroadcastId, setLastBroadcastId] = useState<string | null>(null);

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

      // Check active broadcasts
      const { data: broadcasts } = await supabase
        .from("broadcasts")
        .select("*")
        .eq("is_active", true)
        .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      const activeBroadcast = broadcasts && broadcasts.length > 0 ? broadcasts[0] : null;
      
      // Show toast for new broadcasts
      if (activeBroadcast && activeBroadcast.id !== lastBroadcastId) {
        setLastBroadcastId(activeBroadcast.id);
        toast.info(`📢 ${activeBroadcast.message}`, { duration: 10000 });
      }

      // Check admin abuse events
      const { data: abuseEvents } = await supabase
        .from("admin_abuse_events")
        .select("*")
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString());

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
  }, [userId, lastBroadcastId]);

  useEffect(() => {
    checkStatus();
    
    // Check every 500ms as requested
    const interval = setInterval(checkStatus, 500);

    // Also subscribe to realtime updates for instant notifications
    const broadcastChannel = supabase
      .channel("broadcasts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcasts" },
        () => checkStatus()
      )
      .subscribe();

    const abuseChannel = supabase
      .channel("abuse-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_abuse_events" },
        () => checkStatus()
      )
      .subscribe();

    const banChannel = supabase
      .channel("ban-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bans" },
        () => checkStatus()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(abuseChannel);
      supabase.removeChannel(banChannel);
    };
  }, [checkStatus]);

  return status;
};