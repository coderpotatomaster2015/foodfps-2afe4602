-- Create game rooms table for multiplayer
CREATE TABLE IF NOT EXISTS public.game_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  host_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  max_players integer DEFAULT 4 NOT NULL
);

ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rooms" ON public.game_rooms
  FOR SELECT USING (true);

CREATE POLICY "Users can create rooms" ON public.game_rooms
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update room" ON public.game_rooms
  FOR UPDATE USING (auth.uid() = host_id);

-- Create players in room table
CREATE TABLE IF NOT EXISTS public.room_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  position_x real DEFAULT 480,
  position_y real DEFAULT 320,
  health integer DEFAULT 100,
  score integer DEFAULT 0,
  weapon text DEFAULT 'pistol',
  joined_at timestamp with time zone DEFAULT now() NOT NULL,
  last_update timestamp with time zone DEFAULT now() NOT NULL,
  is_alive boolean DEFAULT true
);

ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view room players" ON public.room_players
  FOR SELECT USING (true);

CREATE POLICY "Users can join rooms" ON public.room_players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own player" ON public.room_players
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;