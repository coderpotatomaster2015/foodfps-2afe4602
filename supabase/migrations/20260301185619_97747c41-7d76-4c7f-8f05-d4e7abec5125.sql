
-- Custom gamemodes table
CREATE TABLE public.custom_gamemodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  creator_username TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  enemy_health INTEGER NOT NULL DEFAULT 100,
  player_health INTEGER NOT NULL DEFAULT 100,
  allowed_weapons TEXT[] NOT NULL DEFAULT ARRAY['pistol'],
  map_background TEXT,
  show_score BOOLEAN NOT NULL DEFAULT true,
  show_health_gui BOOLEAN NOT NULL DEFAULT true,
  enemy_speed_mult REAL NOT NULL DEFAULT 1.0,
  player_speed_mult REAL NOT NULL DEFAULT 1.0,
  spawn_interval REAL NOT NULL DEFAULT 2.0,
  score_multiplier REAL NOT NULL DEFAULT 1.0,
  enemy_color TEXT NOT NULL DEFAULT '#FF0000',
  bg_color_top TEXT NOT NULL DEFAULT '#0a0a1a',
  bg_color_bottom TEXT NOT NULL DEFAULT '#1a1a2e',
  max_enemies INTEGER NOT NULL DEFAULT 10,
  pickup_chance REAL NOT NULL DEFAULT 0.3,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_gamemodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public gamemodes"
ON public.custom_gamemodes FOR SELECT
USING (is_public = true AND status = 'approved');

CREATE POLICY "Users can view own gamemodes"
ON public.custom_gamemodes FOR SELECT
USING (auth.uid() = creator_id);

CREATE POLICY "Owners can view all gamemodes"
ON public.custom_gamemodes FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

CREATE POLICY "Users can create gamemodes"
ON public.custom_gamemodes FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own pending gamemodes"
ON public.custom_gamemodes FOR UPDATE
USING (auth.uid() = creator_id AND status = 'pending');

CREATE POLICY "Owners can update any gamemode"
ON public.custom_gamemodes FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

CREATE POLICY "Owners can delete gamemodes"
ON public.custom_gamemodes FOR DELETE
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

CREATE POLICY "Users can delete own pending gamemodes"
ON public.custom_gamemodes FOR DELETE
USING (auth.uid() = creator_id AND status = 'pending');

CREATE TRIGGER update_custom_gamemodes_updated_at
BEFORE UPDATE ON public.custom_gamemodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
