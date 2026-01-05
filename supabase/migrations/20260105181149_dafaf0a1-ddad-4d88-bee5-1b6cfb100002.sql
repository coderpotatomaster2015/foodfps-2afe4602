-- Add boss_level column to profiles table for cloud persistence
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS boss_level integer NOT NULL DEFAULT 1;