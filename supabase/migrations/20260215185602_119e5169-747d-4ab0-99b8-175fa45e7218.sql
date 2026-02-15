-- Create game_recordings table for recording metadata
CREATE TABLE public.game_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  mode TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  file_url TEXT,
  file_size INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  kills INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.game_recordings ENABLE ROW LEVEL SECURITY;

-- Users can insert their own recordings
CREATE POLICY "Users can insert own recordings"
ON public.game_recordings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own recordings
CREATE POLICY "Users can view own recordings"
ON public.game_recordings
FOR SELECT
USING (auth.uid() = user_id);

-- Admins and owners can view all recordings
CREATE POLICY "Admins can view all recordings"
ON public.game_recordings
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

-- Admins can delete recordings
CREATE POLICY "Admins can delete recordings"
ON public.game_recordings
FOR DELETE
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

-- Create storage bucket for recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('game-recordings', 'game-recordings', true);

-- Storage policies for recordings
CREATE POLICY "Users can upload own recordings"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'game-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view recordings"
ON storage.objects
FOR SELECT
USING (bucket_id = 'game-recordings');

CREATE POLICY "Admins can delete recordings"
ON storage.objects
FOR DELETE
USING (bucket_id = 'game-recordings' AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));