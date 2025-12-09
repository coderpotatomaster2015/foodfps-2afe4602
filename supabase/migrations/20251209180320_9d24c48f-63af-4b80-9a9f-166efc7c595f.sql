-- Create messages table for user-to-user messaging
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  from_username TEXT NOT NULL,
  to_username TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_appeal BOOLEAN NOT NULL DEFAULT false,
  is_feedback BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages (sent or received)
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Users can send messages
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Users can update (mark as read) their received messages
CREATE POLICY "Users can update received messages" ON public.messages
  FOR UPDATE USING (auth.uid() = to_user_id);

-- Admins can view all messages
CREATE POLICY "Admins can view all messages" ON public.messages
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Create game_updates table for update system
CREATE TABLE public.game_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  summary TEXT,
  is_released BOOLEAN NOT NULL DEFAULT false,
  is_beta BOOLEAN NOT NULL DEFAULT false,
  released_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_updates ENABLE ROW LEVEL SECURITY;

-- Everyone can view released updates
CREATE POLICY "Anyone can view released updates" ON public.game_updates
  FOR SELECT USING (is_released = true OR has_role(auth.uid(), 'admin'));

-- Admins can manage updates
CREATE POLICY "Admins can manage updates" ON public.game_updates
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Create beta_testers table
CREATE TABLE public.beta_testers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  granted_by UUID NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beta_testers ENABLE ROW LEVEL SECURITY;

-- Users can check if they are beta testers
CREATE POLICY "Users can view own beta status" ON public.beta_testers
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Admins can manage beta testers
CREATE POLICY "Admins can manage beta testers" ON public.beta_testers
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Create social_posts table for social media feature
CREATE TABLE public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_pending BOOLEAN NOT NULL DEFAULT true,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Users can view approved posts
CREATE POLICY "Anyone can view approved posts" ON public.social_posts
  FOR SELECT USING (is_approved = true AND is_pending = false);

-- Users can create posts
CREATE POLICY "Users can create posts" ON public.social_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view own posts
CREATE POLICY "Users can view own posts" ON public.social_posts
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can manage posts
CREATE POLICY "Admins can manage posts" ON public.social_posts
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Create active_players table for tracking who's online/in-game
CREATE TABLE public.active_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  username TEXT NOT NULL,
  mode TEXT NOT NULL,
  room_code TEXT,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.active_players ENABLE ROW LEVEL SECURITY;

-- Anyone can view active players
CREATE POLICY "Anyone can view active players" ON public.active_players
  FOR SELECT USING (true);

-- Users can insert/update their own entry
CREATE POLICY "Users can manage own entry" ON public.active_players
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Enable realtime for active_players and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;