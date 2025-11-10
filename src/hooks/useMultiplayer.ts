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

interface BulletData {
  playerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  dmg: number;
  color: string;
  timestamp: number;
}

interface MultiplayerState {
  roomId: string | null;
  players: PlayerData[];
  isHost: boolean;
  otherPlayersBullets: Map<string, BulletData[]>;
}

export const useMultiplayer = (mode: string, roomCode: string, username: string) => {
  const [state, setState] = useState<MultiplayerState>({
    roomId: null,
    players: [],
    isHost: false,
    otherPlayersBullets: new Map(),
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

  const updatePlayerPosition = useCallback(async (x: number, y: number, health: number, weapon: string, angle: number) => {
    if (!state.roomId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const playerId = user?.id || username;
      
      // Update position in database
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

      // Broadcast position via realtime for smoother updates
      const channel = supabase.channel(`room:${state.roomId}`);
      channel.send({
        type: 'broadcast',
        event: 'player_move',
        payload: { playerId, x, y, health, weapon, angle }
      });
    } catch (error) {
      console.error("Error updating position:", error);
    }
  }, [state.roomId, username]);

  const broadcastBullet = useCallback((bullet: any) => {
    if (!state.roomId) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      const playerId = user?.id || username;
      const channel = supabase.channel(`room:${state.roomId}`);
      channel.send({
        type: 'broadcast',
        event: 'bullet_fired',
        payload: { ...bullet, playerId, timestamp: Date.now() }
      });
    });
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
      .on('broadcast', { event: 'player_move' }, ({ payload }) => {
        // Update player position in real-time
        setState(prev => ({
          ...prev,
          players: prev.players.map(p => 
            p.id === payload.playerId || p.username === payload.playerId
              ? { ...p, position_x: payload.x, position_y: payload.y, health: payload.health, weapon: payload.weapon }
              : p
          )
        }));
      })
      .on('broadcast', { event: 'bullet_fired' }, ({ payload }) => {
        // Add bullet to other players' bullets
        const bullet = payload as BulletData;
        setState(prev => {
          const newBullets = new Map(prev.otherPlayersBullets);
          const playerBullets = newBullets.get(bullet.playerId) || [];
          playerBullets.push(bullet);
          newBullets.set(bullet.playerId, playerBullets);
          return { ...prev, otherPlayersBullets: newBullets };
        });
      })
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
    broadcastBullet,
  };
};
