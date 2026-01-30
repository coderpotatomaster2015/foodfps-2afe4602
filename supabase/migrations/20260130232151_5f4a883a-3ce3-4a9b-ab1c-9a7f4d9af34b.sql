-- =============================================
-- v1.1.3 Database Migration
-- Food Pass, Player Profiles, Ranked Mode, Fixes
-- =============================================

-- 1. Add new columns to profiles for player profile info and ranked data
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ranked_rank TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ranked_tier INTEGER DEFAULT NULL;

-- 2. Create Food Pass tiers table with all 500 tiers worth of rewards
CREATE TABLE IF NOT EXISTS public.food_pass_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier INTEGER NOT NULL UNIQUE,
  score_required INTEGER NOT NULL,
  reward_type TEXT NOT NULL, -- 'coins', 'gems', 'gold', 'skin', 'power'
  reward_value INTEGER NOT NULL DEFAULT 0,
  skin_id UUID REFERENCES public.custom_skins(id) DEFAULT NULL,
  power_unlock TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on food_pass_tiers
ALTER TABLE public.food_pass_tiers ENABLE ROW LEVEL SECURITY;

-- Anyone can view tiers
CREATE POLICY "Anyone can view food pass tiers"
ON public.food_pass_tiers FOR SELECT
USING (true);

-- Only admins/owners can manage tiers
CREATE POLICY "Admins can manage food pass tiers"
ON public.food_pass_tiers FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

-- 3. Create Food Pass progress table to track player progress
CREATE TABLE IF NOT EXISTS public.food_pass_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_tier INTEGER NOT NULL DEFAULT 0,
  claimed_tiers INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on food_pass_progress
ALTER TABLE public.food_pass_progress ENABLE ROW LEVEL SECURITY;

-- Users can view own progress
CREATE POLICY "Users can view own food pass progress"
ON public.food_pass_progress FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert own progress
CREATE POLICY "Users can insert own food pass progress"
ON public.food_pass_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own progress
CREATE POLICY "Users can update own food pass progress"
ON public.food_pass_progress FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Create Ranked match history table
CREATE TABLE IF NOT EXISTS public.ranked_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  waves_completed INTEGER NOT NULL DEFAULT 0,
  enemies_killed INTEGER NOT NULL DEFAULT 0,
  victory BOOLEAN NOT NULL DEFAULT false,
  rank_earned TEXT DEFAULT NULL,
  tier_earned INTEGER DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ranked_matches
ALTER TABLE public.ranked_matches ENABLE ROW LEVEL SECURITY;

-- Anyone can view ranked matches
CREATE POLICY "Anyone can view ranked matches"
ON public.ranked_matches FOR SELECT
USING (true);

-- Users can insert own matches
CREATE POLICY "Users can insert own ranked matches"
ON public.ranked_matches FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. Create storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 6. Fix social_posts RLS for admins to see ALL pending posts (not just approved ones)
DROP POLICY IF EXISTS "Admins can manage posts" ON public.social_posts;

CREATE POLICY "Admins can view all posts"
ON public.social_posts FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

CREATE POLICY "Admins can update posts"
ON public.social_posts FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

CREATE POLICY "Admins can delete posts"
ON public.social_posts FOR DELETE
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

-- 7. Insert initial Food Pass tiers (500 tiers with varying rewards)
-- Coins tiers (every 5 tiers)
INSERT INTO public.food_pass_tiers (tier, score_required, reward_type, reward_value)
SELECT 
  generate_series AS tier,
  generate_series * 100 AS score_required,
  'coins' AS reward_type,
  CASE 
    WHEN generate_series % 50 = 0 THEN 500
    WHEN generate_series % 25 = 0 THEN 250
    WHEN generate_series % 10 = 0 THEN 100
    ELSE 50
  END AS reward_value
FROM generate_series(1, 500, 5)
ON CONFLICT (tier) DO NOTHING;

-- Gems tiers (every 10 tiers starting at 3)
INSERT INTO public.food_pass_tiers (tier, score_required, reward_type, reward_value)
SELECT 
  generate_series AS tier,
  generate_series * 100 AS score_required,
  'gems' AS reward_type,
  CASE 
    WHEN generate_series % 100 = 0 THEN 100
    WHEN generate_series % 50 = 0 THEN 50
    ELSE 20
  END AS reward_value
FROM generate_series(3, 500, 10)
ON CONFLICT (tier) DO NOTHING;

-- Gold tiers (every 25 tiers starting at 7)
INSERT INTO public.food_pass_tiers (tier, score_required, reward_type, reward_value)
SELECT 
  generate_series AS tier,
  generate_series * 100 AS score_required,
  'gold' AS reward_type,
  CASE 
    WHEN generate_series % 100 = 0 THEN 25
    WHEN generate_series % 50 = 0 THEN 15
    ELSE 10
  END AS reward_value
FROM generate_series(7, 500, 25)
ON CONFLICT (tier) DO NOTHING;

-- Power unlock tiers (special milestones)
INSERT INTO public.food_pass_tiers (tier, score_required, reward_type, reward_value, power_unlock)
VALUES 
  (50, 5000, 'power', 0, 'teleport'),
  (100, 10000, 'power', 0, 'double_damage'),
  (150, 15000, 'power', 0, 'slow_motion'),
  (200, 20000, 'power', 0, 'shield'),
  (250, 25000, 'power', 0, 'invisibility'),
  (300, 30000, 'power', 0, 'speed'),
  (350, 35000, 'power', 0, 'rainbow'),
  (400, 40000, 'power', 0, 'all_powers'),
  (450, 45000, 'power', 0, 'ultimate'),
  (500, 50000, 'power', 0, 'legendary')
ON CONFLICT (tier) DO UPDATE SET power_unlock = EXCLUDED.power_unlock;

-- 8. Create game_updates entry for v1.1.3
INSERT INTO public.game_updates (name, description, is_released, is_beta, created_by, summary)
SELECT 
  'v1.1.3',
  'Food Pass with 500 tiers of rewards, Player Profiles with custom avatars and bio, Ranked Mode with 7 waves and ranking system (Bronze I-V, Gold I-V, Diamond I-V, Pro), Fixed social media requests for admins, Added visible admin chat commands, Feedback now goes to owner inbox.',
  false,
  false,
  user_id,
  'Major content update with Food Pass, Player Profiles, and Ranked Mode'
FROM public.profiles WHERE username = (SELECT username FROM public.user_roles ur JOIN public.profiles p ON ur.user_id = p.user_id WHERE ur.role = 'owner' LIMIT 1)
LIMIT 1;