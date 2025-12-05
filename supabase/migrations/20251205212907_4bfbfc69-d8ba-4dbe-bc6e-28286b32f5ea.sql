-- Delete all existing user data
DELETE FROM public.room_players;
DELETE FROM public.game_rooms;
DELETE FROM public.bans;
DELETE FROM public.player_progress;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;

-- Create game_settings table for admin controls
CREATE TABLE public.game_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_enabled boolean NOT NULL DEFAULT true,
  disabled_message text DEFAULT 'Sorry, the website is disabled. Ask an admin to enable it.',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.game_settings (id, website_enabled, disabled_message) 
VALUES ('00000000-0000-0000-0000-000000000001', true, 'Sorry, the website is disabled. Ask an admin to enable it.');

-- Enable RLS on game_settings
ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view settings
CREATE POLICY "Anyone can view game settings"
ON public.game_settings
FOR SELECT
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update game settings"
ON public.game_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create kill_stats table for tracking kills/deaths
CREATE TABLE public.kill_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  room_id uuid REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  kills integer NOT NULL DEFAULT 0,
  deaths integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kill_stats ENABLE ROW LEVEL SECURITY;

-- Users can view all stats
CREATE POLICY "Anyone can view kill stats"
ON public.kill_stats
FOR SELECT
USING (true);

-- Users can insert/update their own stats
CREATE POLICY "Users can insert own stats"
ON public.kill_stats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
ON public.kill_stats
FOR UPDATE
USING (auth.uid() = user_id);

-- Create chat_permissions table
CREATE TABLE public.chat_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  can_use_commands boolean NOT NULL DEFAULT false,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view own permissions
CREATE POLICY "Users can view own chat permissions"
ON public.chat_permissions
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Admins can manage permissions
CREATE POLICY "Admins can manage chat permissions"
ON public.chat_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create function to make first user an admin
CREATE OR REPLACE FUNCTION public.check_first_user_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count integer;
BEGIN
  -- Count existing profiles (excluding the one being inserted)
  SELECT COUNT(*) INTO user_count FROM public.profiles WHERE id != NEW.id;
  
  -- If this is the first user, make them admin
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to check for first user
CREATE TRIGGER check_first_user_admin_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_first_user_admin();

-- Add DELETE policy for room_players
CREATE POLICY "Users can delete own player entry"
ON public.room_players
FOR DELETE
USING (auth.uid() = user_id OR user_id IS NULL);