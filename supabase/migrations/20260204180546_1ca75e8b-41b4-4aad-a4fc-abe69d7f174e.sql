-- Update bans policy to include owner role
DROP POLICY IF EXISTS "Admins can manage bans" ON public.bans;
CREATE POLICY "Admins and owners can manage bans" 
ON public.bans 
FOR ALL 
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

-- Make sure class_members allows proper upsert for auth signup flow
DROP POLICY IF EXISTS "Anyone can join a class" ON public.class_members;
CREATE POLICY "Users can insert their own membership" 
ON public.class_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own class membership 
CREATE POLICY "Users can update own membership" 
ON public.class_members 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);