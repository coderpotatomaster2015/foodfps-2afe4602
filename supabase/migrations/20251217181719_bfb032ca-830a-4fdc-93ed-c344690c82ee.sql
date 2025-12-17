-- Add leaderboard_public and game_mode_disabled to game_settings
ALTER TABLE public.game_settings 
ADD COLUMN IF NOT EXISTS leaderboard_public boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS solo_disabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS multiplayer_disabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS boss_disabled boolean NOT NULL DEFAULT false;

-- Create function to check if user has any of the given roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- Allow teachers to update game_settings for mode disabling
DROP POLICY IF EXISTS "Teachers can update game mode settings" ON public.game_settings;
CREATE POLICY "Teachers can update game mode settings" 
ON public.game_settings 
FOR UPDATE 
USING (has_any_role(auth.uid(), ARRAY['admin', 'owner', 'teacher']::app_role[]));

-- Allow admins and owners to manage user roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" 
ON public.user_roles 
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin', 'owner']::app_role[]));

-- Update insert policy for user_roles
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" 
ON public.user_roles 
FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'owner']::app_role[]));