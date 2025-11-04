import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlayerData {
  id: string;
  username: string;
  position_x: number;
  position_y: number;
  health: number;
  score: number;
  weapon: string;
  is_alive: boolean;
}

interface MultiplayerState {
  roomId: string | null;
  players: PlayerData[];
  isHost: boolean;
}

export const useMultiplayer = (mode: string, roomCode: string, username: string) => {
  const [state, setState] = useState<MultiplayerState>({
    roomId: null,
    players: [],
    isHost: false,
  });

  const createRoom = useCallback(async () => {
    if (mode !== "host") return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Must be logged in to host");
        return;
      }

      const code = Math.floor(10000 + Math.random() * 90000).toString();
      
      const { data: room, error } = await supabase
        .from("game_rooms")
        .insert({ code, host_id: user.id })
        .select()
        .single();

      if (error) throw error;

      // Add host as player
      await supabase.from("room_players").insert({
        room_id: room.id,
        user_id: user.id,
        username,
      });

      setState(prev => ({ ...prev, roomId: room.id, isHost: true }));
      return code;
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room");
    }
  }, [mode, username]);

  const joinRoom = useCallback(async (code: string) => {
    try {
      const { data: room, error: roomError } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("code", code)
        .single();

      if (roomError || !room) {
        toast.error("Room not found");
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from("room_players").insert({
        room_id: room.id,
        user_id: user?.id,
        username,
      });

      setState(prev => ({ ...prev, roomId: room.id, isHost: false }));
      return true;
    } catch (error) {
      console.error("Error joining room:", error);
      toast.error("Failed to join room");
      return false;
    }
  }, [username]);

  const updatePlayerPosition = useCallback(async (x: number, y: number, health: number, weapon: string) => {
    if (!state.roomId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from("room_players")
        .update({
          position_x: x,
          position_y: y,
          health,
          weapon,
          last_update: new Date().toISOString(),
        })
        .eq("room_id", state.roomId)
        .eq(user ? "user_id" : "username", user ? user.id : username);
    } catch (error) {
      console.error("Error updating position:", error);
    }
  }, [state.roomId, username]);

  // Subscribe to room updates
  useEffect(() => {
    if (!state.roomId) return;

    const channel = supabase
      .channel(`room:${state.roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_id=eq.${state.roomId}`,
        },
        async () => {
          // Fetch updated players
          const { data } = await supabase
            .from("room_players")
            .select("*")
            .eq("room_id", state.roomId);

          if (data) {
            setState(prev => ({ ...prev, players: data as PlayerData[] }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.roomId]);

  return {
    ...state,
    createRoom,
    joinRoom,
    updatePlayerPosition,
  };
};
