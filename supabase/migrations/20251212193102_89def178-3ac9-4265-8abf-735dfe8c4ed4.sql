-- Player currencies table
CREATE TABLE public.player_currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  gems integer NOT NULL DEFAULT 0,
  coins integer NOT NULL DEFAULT 0,
  gold integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.player_currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own currencies" ON public.player_currencies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own currencies" ON public.player_currencies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own currencies" ON public.player_currencies FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Broadcasts table for admin announcements
CREATE TABLE public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  created_by uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active broadcasts" ON public.broadcasts FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage broadcasts" ON public.broadcasts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin abuse events table
CREATE TABLE public.admin_abuse_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  created_by uuid NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_abuse_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active abuse events" ON public.admin_abuse_events FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage abuse events" ON public.admin_abuse_events FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Player skins table
CREATE TABLE public.player_skins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL,
  price_gems integer NOT NULL DEFAULT 0,
  price_coins integer NOT NULL DEFAULT 0,
  price_gold integer NOT NULL DEFAULT 0,
  is_seasonal boolean NOT NULL DEFAULT false,
  season text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.player_skins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view skins" ON public.player_skins FOR SELECT USING (true);
CREATE POLICY "Admins can manage skins" ON public.player_skins FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Player owned skins
CREATE TABLE public.player_owned_skins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  skin_id uuid NOT NULL REFERENCES public.player_skins(id) ON DELETE CASCADE,
  purchased_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, skin_id)
);

ALTER TABLE public.player_owned_skins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skins" ON public.player_owned_skins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can purchase skins" ON public.player_owned_skins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add seasonal update fields to game_updates
ALTER TABLE public.game_updates ADD COLUMN IF NOT EXISTS season text;
ALTER TABLE public.game_updates ADD COLUMN IF NOT EXISTS is_seasonal boolean NOT NULL DEFAULT false;

-- Daily rewards table
CREATE TABLE public.daily_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_type text NOT NULL,
  reward_value text NOT NULL,
  claimed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rewards" ON public.daily_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can claim rewards" ON public.daily_rewards FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Feedback messages table (AI processed)
CREATE TABLE public.feedback_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  from_username text NOT NULL,
  content text NOT NULL,
  feedback_type text NOT NULL DEFAULT 'bug',
  is_processed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit feedback" ON public.feedback_messages FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Admins can view all feedback" ON public.feedback_messages FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage feedback" ON public.feedback_messages FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for broadcasts and admin abuse
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_abuse_events;

-- Insert default skins
INSERT INTO public.player_skins (name, color, price_gems, price_coins, price_gold, is_seasonal, season) VALUES
('Default', '#FFF3D6', 0, 0, 0, false, null),
('Fire Red', '#FF4444', 50, 0, 0, false, null),
('Ocean Blue', '#4444FF', 50, 0, 0, false, null),
('Forest Green', '#44FF44', 50, 0, 0, false, null),
('Royal Purple', '#AA44FF', 100, 0, 0, false, null),
('Golden', '#FFD700', 0, 0, 100, false, null),
('Christmas Red', '#DC143C', 0, 200, 0, true, 'christmas'),
('Christmas Green', '#228B22', 0, 200, 0, true, 'christmas'),
('Halloween Orange', '#FF6600', 0, 150, 0, true, 'halloween'),
('Halloween Black', '#1a1a1a', 0, 150, 0, true, 'halloween'),
('Thanksgiving Brown', '#8B4513', 0, 100, 0, true, 'thanksgiving'),
('Thanksgiving Gold', '#DAA520', 0, 100, 0, true, 'thanksgiving');

-- Insert seasonal updates (draft state)
INSERT INTO public.game_updates (name, description, created_by, is_released, is_beta, is_seasonal, season, summary) 
SELECT 
  'Christmas Update 2024',
  'Festive holiday update with:\n- Red and green decorations throughout the map\n- Christmas-themed character skins\n- Daily holiday rewards including godmode and exclusive weapons\n- Snowfall effects\n- Holiday music\n- Special Christmas boss battles\n- Candy cane ammo pickups',
  user_id,
  false,
  false,
  true,
  'christmas',
  null
FROM public.user_roles WHERE role = 'admin' LIMIT 1;

INSERT INTO public.game_updates (name, description, created_by, is_released, is_beta, is_seasonal, season, summary) 
SELECT 
  'Halloween Update 2024',
  'Spooky Halloween update with:\n- Dark themed decorations\n- Pumpkin enemies\n- Ghost power-ups\n- Haunted map variations\n- Zombie boss battles\n- Halloween-themed skins\n- Daily spooky rewards',
  user_id,
  false,
  false,
  true,
  'halloween',
  null
FROM public.user_roles WHERE role = 'admin' LIMIT 1;

INSERT INTO public.game_updates (name, description, created_by, is_released, is_beta, is_seasonal, season, summary) 
SELECT 
  'Thanksgiving Update 2024',
  'Festive Thanksgiving update with:\n- Autumn decorations\n- Turkey enemies\n- Cornucopia power-ups\n- Harvest-themed maps\n- Pilgrim character skins\n- Daily feast rewards',
  user_id,
  false,
  false,
  true,
  'thanksgiving',
  null
FROM public.user_roles WHERE role = 'admin' LIMIT 1;

-- Add trigger for updating timestamps on player_currencies
CREATE TRIGGER update_player_currencies_updated_at
  BEFORE UPDATE ON public.player_currencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();