
-- Add target_user_id to broadcasts for targeted broadcasts
ALTER TABLE public.broadcasts ADD COLUMN target_user_id uuid DEFAULT NULL;
ALTER TABLE public.broadcasts ADD COLUMN target_username text DEFAULT NULL;

-- Create login_streaks table for daily engagement tracking
CREATE TABLE public.login_streaks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 1,
  longest_streak integer NOT NULL DEFAULT 1,
  last_login_date date NOT NULL DEFAULT CURRENT_DATE,
  total_logins integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.login_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak" ON public.login_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streak" ON public.login_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streak" ON public.login_streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- Add RLS policy for users to see broadcasts targeted at them
CREATE POLICY "Users can view broadcasts targeted at them"
  ON public.broadcasts FOR SELECT
  USING (auth.uid() = target_user_id);
