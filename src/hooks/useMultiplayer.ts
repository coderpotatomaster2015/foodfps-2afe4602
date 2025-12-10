import { useEffect, useState, useCallback, useRef } from "react";
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
  angle?: number;
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
  gameStarted: boolean;
}

export const useMultiplayer = (mode: string, roomCode: string, username: string) => {
  const [state, setState] = useState<MultiplayerState>({
    roomId: null,
    players: [],
    isHost: false,
    otherPlayersBullets: new Map(),
    gameStarted: false,
  });

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const playerIdRef = useRef<string | null>(null);

  const createRoom = useCallback(async () => {
    if (mode !== "host") return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Must be logged in to host");
        return;
      }

      playerIdRef.current = user.id;
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
        .is("ended_at", null)
        .maybeSingle();

      if (roomError || !room) {
        toast.error("Room not found or has ended");
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      playerIdRef.current = user?.id || username;

      // Check if already in room
      const { data: existingPlayer } = await supabase
        .from("room_players")
        .select("id")
        .eq("room_id", room.id)
        .eq("username", username)
        .maybeSingle();

      if (!existingPlayer) {
        await supabase.from("room_players").insert({
          room_id: room.id,
          user_id: user?.id,
          username,
        });
      }

      setState(prev => ({ ...prev, roomId: room.id, isHost: false }));
      return true;
    } catch (error) {
      console.error("Error joining room:", error);
      toast.error("Failed to join room");
      return false;
    }
  }, [username]);

  const updatePlayerPosition = useCallback((x: number, y: number, health: number, weapon: string, angle: number) => {
    if (!state.roomId || !channelRef.current) return;

    const playerId = playerIdRef.current || username;
    
    // Broadcast position via realtime for instant updates
    channelRef.current.send({
      type: 'broadcast',
      event: 'player_move',
      payload: { playerId, username, x, y, health, weapon, angle }
    });
  }, [state.roomId, username]);

  const broadcastBullet = useCallback((bullet: any) => {
    if (!state.roomId || !channelRef.current) return;

    const playerId = playerIdRef.current || username;
    channelRef.current.send({
      type: 'broadcast',
      event: 'bullet_fired',
      payload: { ...bullet, playerId, timestamp: Date.now() }
    });
  }, [state.roomId, username]);

  const startGame = useCallback(() => {
    if (!state.roomId || !channelRef.current || !state.isHost) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'game_start',
      payload: { started: true }
    });

    setState(prev => ({ ...prev, gameStarted: true }));

    // Update room in database
    supabase
      .from("game_rooms")
      .update({ started_at: new Date().toISOString() })
      .eq("id", state.roomId)
      .then(() => {});
  }, [state.roomId, state.isHost]);

  // Subscribe to room updates
  useEffect(() => {
    if (!state.roomId) return;

    // Fetch initial players
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_id", state.roomId);

      if (data) {
        setState(prev => ({ ...prev, players: data as PlayerData[] }));
      }
    };

    fetchPlayers();

    // Create channel for realtime
    const channel = supabase
      .channel(`game-room-${state.roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_id=eq.${state.roomId}`,
        },
        () => {
          fetchPlayers();
        }
      )
      .on('broadcast', { event: 'player_move' }, ({ payload }) => {
        // Update player position in real-time (skip self)
        if (payload.playerId === playerIdRef.current || payload.username === username) return;
        
        setState(prev => {
          // Check if player exists, if not add them
          const playerExists = prev.players.some(p => p.username === payload.username);
          
          if (!playerExists) {
            return {
              ...prev,
              players: [...prev.players, {
                id: payload.playerId,
                username: payload.username,
                position_x: payload.x,
                position_y: payload.y,
                health: payload.health,
                score: 0,
                weapon: payload.weapon,
                is_alive: true,
                angle: payload.angle,
              }]
            };
          }
          
          return {
            ...prev,
            players: prev.players.map(p => 
              p.username === payload.username
                ? { ...p, position_x: payload.x, position_y: payload.y, health: payload.health, weapon: payload.weapon, angle: payload.angle }
                : p
            )
          };
        });
      })
      .on('broadcast', { event: 'bullet_fired' }, ({ payload }) => {
        // Add bullet to other players' bullets (skip self)
        if (payload.playerId === playerIdRef.current) return;
        
        const bullet = payload as BulletData;
        setState(prev => {
          const newBullets = new Map(prev.otherPlayersBullets);
          const playerBullets = newBullets.get(bullet.playerId) || [];
          playerBullets.push(bullet);
          // Keep only recent bullets
          const recentBullets = playerBullets.filter(b => Date.now() - b.timestamp < 3000);
          newBullets.set(bullet.playerId, recentBullets);
          return { ...prev, otherPlayersBullets: newBullets };
        });
      })
      .on('broadcast', { event: 'game_start' }, () => {
        setState(prev => ({ ...prev, gameStarted: true }));
        toast.success("Game started!");
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [state.roomId, username]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.roomId && playerIdRef.current) {
        // Remove player from room on leave
        supabase
          .from("room_players")
          .delete()
          .eq("room_id", state.roomId)
          .eq("username", username)
          .then(() => {});
      }
    };
  }, [state.roomId, username]);

  return {
    ...state,
    createRoom,
    joinRoom,
    updatePlayerPosition,
    broadcastBullet,
    startGame,
  };
};
