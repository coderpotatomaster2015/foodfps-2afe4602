
-- Create rate limit tracking table
CREATE TABLE public.rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Users can insert their own rate limit entries
CREATE POLICY "Users can insert own rate logs"
ON public.rate_limit_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all rate logs
CREATE POLICY "Admins can view rate logs"
ON public.rate_limit_log
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

-- Users can view own rate logs
CREATE POLICY "Users can view own rate logs"
ON public.rate_limit_log
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_rate_limit_user_time ON public.rate_limit_log (user_id, created_at DESC);

-- Auto-cleanup old entries (older than 1 minute)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_log WHERE created_at < now() - interval '1 minute';
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_rate_limits
AFTER INSERT ON public.rate_limit_log
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_rate_limits();

-- Function to check and auto-ban spammers (100+ requests in 10 seconds = permanent ban)
CREATE OR REPLACE FUNCTION public.check_rate_limit_and_ban(_user_id uuid, _action_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count integer;
BEGIN
  -- Insert the rate limit log
  INSERT INTO public.rate_limit_log (user_id, action_type) VALUES (_user_id, _action_type);
  
  -- Count requests in last 10 seconds
  SELECT COUNT(*) INTO request_count
  FROM public.rate_limit_log
  WHERE user_id = _user_id
    AND created_at > now() - interval '10 seconds';
  
  -- If 100+ requests in 10 seconds, auto-ban permanently
  IF request_count >= 100 THEN
    -- Ban for 999999 hours (effectively permanent)
    INSERT INTO public.bans (user_id, banned_by, hours, reason, expires_at)
    VALUES (
      _user_id,
      _user_id,
      999999,
      'Auto-banned: Rate limit exceeded (100+ requests in 10 seconds)',
      now() + interval '999999 hours'
    )
    ON CONFLICT DO NOTHING;
    
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;
