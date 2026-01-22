-- Fix broadcasts RLS to include owners
DROP POLICY IF EXISTS "Admins can manage broadcasts" ON public.broadcasts;
CREATE POLICY "Admins and Owners can manage broadcasts" 
ON public.broadcasts 
FOR ALL 
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

-- Fix admin_abuse_events RLS to include owners
DROP POLICY IF EXISTS "Admins can manage abuse events" ON public.admin_abuse_events;
CREATE POLICY "Admins and Owners can manage abuse events" 
ON public.admin_abuse_events 
FOR ALL 
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));