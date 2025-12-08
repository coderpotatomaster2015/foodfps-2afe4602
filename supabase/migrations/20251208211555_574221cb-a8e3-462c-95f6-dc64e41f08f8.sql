-- Delete all existing users from auth.users (this will cascade to profiles via trigger)
-- First clean up all related tables
DELETE FROM public.room_players;
DELETE FROM public.game_rooms;
DELETE FROM public.bans;
DELETE FROM public.kill_stats;
DELETE FROM public.chat_permissions;
DELETE FROM public.player_progress;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;

-- Delete from auth.users
DELETE FROM auth.users;

-- Ensure game_settings has default row
INSERT INTO public.game_settings (id, website_enabled, disabled_message)
VALUES ('00000000-0000-0000-0000-000000000001', true, 'Sorry, the website is disabled. Ask an admin to enable it.')
ON CONFLICT (id) DO NOTHING;