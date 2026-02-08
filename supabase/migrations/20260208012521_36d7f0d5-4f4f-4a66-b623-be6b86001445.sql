-- Add mode disable columns to game_settings
ALTER TABLE public.game_settings 
ADD COLUMN IF NOT EXISTS school_disabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS normal_disabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ranked_disabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS school_disabled_message text,
ADD COLUMN IF NOT EXISTS normal_disabled_message text;

-- Add first_login_only column to broadcasts for temp broadcasts on first login
ALTER TABLE public.broadcasts 
ADD COLUMN IF NOT EXISTS show_on_first_login boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS title text DEFAULT 'Announcement';

-- Add birthday abuse event type support
ALTER TABLE public.admin_abuse_events
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;