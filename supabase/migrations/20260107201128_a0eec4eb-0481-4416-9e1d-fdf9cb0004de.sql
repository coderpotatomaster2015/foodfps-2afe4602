-- IP bans table
CREATE TABLE public.ip_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  banned_by uuid NOT NULL,
  reason text,
  banned_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone
);

ALTER TABLE public.ip_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage IP bans" ON public.ip_bans
FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

CREATE POLICY "Anyone can check IP bans" ON public.ip_bans
FOR SELECT USING (true);

-- Global chat messages table
CREATE TABLE public.global_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.global_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view global chat" ON public.global_chat
FOR SELECT USING (true);

CREATE POLICY "Authenticated can send messages" ON public.global_chat
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for global chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat;

-- Chat warnings table
CREATE TABLE public.chat_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  warning_count integer NOT NULL DEFAULT 0,
  is_chat_banned boolean NOT NULL DEFAULT false,
  last_warning_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage warnings" ON public.chat_warnings
FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

CREATE POLICY "Users can view own warnings" ON public.chat_warnings
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert warnings" ON public.chat_warnings
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update warnings" ON public.chat_warnings
FOR UPDATE USING (true);

-- Custom skins created by owners
CREATE TABLE public.custom_skins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_data text NOT NULL,
  price_coins integer NOT NULL DEFAULT 0,
  price_gems integer NOT NULL DEFAULT 0,
  price_gold integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.custom_skins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view custom skins" ON public.custom_skins
FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage custom skins" ON public.custom_skins
FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

-- Owned custom skins
CREATE TABLE public.player_custom_skins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  skin_id uuid NOT NULL REFERENCES public.custom_skins(id) ON DELETE CASCADE,
  purchased_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, skin_id)
);

ALTER TABLE public.player_custom_skins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom skins" ON public.player_custom_skins
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can purchase custom skins" ON public.player_custom_skins
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add ultimate abuse type to admin_abuse_events (just allows the value, no schema change needed)

-- Function to check if user is owner (for IP ban exemption)
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'owner'
  )
$$;