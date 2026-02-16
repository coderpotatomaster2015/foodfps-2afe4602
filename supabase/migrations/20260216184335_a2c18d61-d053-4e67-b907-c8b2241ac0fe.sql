
-- Abuse event requests from normal users
CREATE TABLE public.abuse_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL,
  event_type text NOT NULL,
  requested_date date NOT NULL,
  requested_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.abuse_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create requests" ON public.abuse_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own requests" ON public.abuse_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests" ON public.abuse_requests
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

CREATE POLICY "Admins can update requests" ON public.abuse_requests
  FOR UPDATE USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

CREATE POLICY "Admins can delete requests" ON public.abuse_requests
  FOR DELETE USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));
