CREATE TABLE IF NOT EXISTS public.custom_gamemode_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL,
  gamemode_slug text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  status text NOT NULL DEFAULT 'pending',
  approval_notes text,
  share_url text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_gamemode_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own custom gamemode requests" ON public.custom_gamemode_requests;
CREATE POLICY "Users can create their own custom gamemode requests"
ON public.custom_gamemode_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own custom gamemode requests" ON public.custom_gamemode_requests;
CREATE POLICY "Users can view their own custom gamemode requests"
ON public.custom_gamemode_requests
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can manage custom gamemode requests" ON public.custom_gamemode_requests;
CREATE POLICY "Owners can manage custom gamemode requests"
ON public.custom_gamemode_requests
FOR ALL
USING (public.has_role(auth.uid(), 'owner'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role));
