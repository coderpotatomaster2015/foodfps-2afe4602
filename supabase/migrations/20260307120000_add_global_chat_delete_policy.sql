-- Allow admins and owners to clear global chat via /clear command
CREATE POLICY "Admins and owners can clear global chat"
ON public.global_chat
FOR DELETE
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));
