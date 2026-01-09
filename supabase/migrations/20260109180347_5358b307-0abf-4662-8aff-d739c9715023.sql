-- Add special_power column to custom_skins for skin abilities
ALTER TABLE public.custom_skins 
ADD COLUMN IF NOT EXISTS special_power TEXT DEFAULT NULL;

-- Add tutorial_completed to profiles to track first-time users
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN NOT NULL DEFAULT false;

-- Update RLS for custom_skins to allow admins as well as owners
DROP POLICY IF EXISTS "Owners can manage custom skins" ON public.custom_skins;
CREATE POLICY "Admins and Owners can manage custom skins" 
ON public.custom_skins 
FOR ALL 
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));