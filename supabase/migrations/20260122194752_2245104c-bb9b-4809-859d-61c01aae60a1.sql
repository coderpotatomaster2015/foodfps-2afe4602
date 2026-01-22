-- Create admin abuse schedule table
CREATE TABLE public.admin_abuse_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_activated BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.admin_abuse_schedule ENABLE ROW LEVEL SECURITY;

-- Public can view schedule
CREATE POLICY "Anyone can view schedule"
ON public.admin_abuse_schedule
FOR SELECT
USING (true);

-- Admins and owners can manage schedule
CREATE POLICY "Admins and owners can insert schedule"
ON public.admin_abuse_schedule
FOR INSERT
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

CREATE POLICY "Admins and owners can update schedule"
ON public.admin_abuse_schedule
FOR UPDATE
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

CREATE POLICY "Admins and owners can delete schedule"
ON public.admin_abuse_schedule
FOR DELETE
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_abuse_schedule;