-- Fix RLS policy for game_updates to allow owners to manage updates
DROP POLICY IF EXISTS "Admins can manage updates" ON public.game_updates;

CREATE POLICY "Admins and Owners can manage updates" 
ON public.game_updates 
FOR ALL 
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

-- Also fix player_skins policy to allow owners
DROP POLICY IF EXISTS "Admins can manage skins" ON public.player_skins;

CREATE POLICY "Admins and Owners can manage skins" 
ON public.player_skins 
FOR ALL 
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

-- Reset all player weapon progress to pistol only
UPDATE public.player_progress SET unlocked_weapons = ARRAY['pistol'::text];