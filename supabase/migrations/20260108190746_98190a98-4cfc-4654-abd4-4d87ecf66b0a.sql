-- Create a secure function to grant owner role with password verification
-- This function uses SECURITY DEFINER to bypass RLS and validate the password server-side
CREATE OR REPLACE FUNCTION public.grant_owner_with_password(_user_id uuid, _password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  correct_password text := 'DonutSmp12!67kid';
BEGIN
  -- Verify password
  IF _password != correct_password THEN
    RETURN false;
  END IF;

  -- Remove any existing roles for this user
  DELETE FROM public.user_roles WHERE user_id = _user_id;

  -- Insert owner role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'owner');

  -- Upsert infinite currency for owner
  INSERT INTO public.player_currencies (user_id, coins, gems, gold)
  VALUES (_user_id, 999999999, 999999999, 999999999)
  ON CONFLICT (user_id) DO UPDATE SET
    coins = 999999999,
    gems = 999999999,
    gold = 999999999,
    updated_at = now();

  RETURN true;
END;
$$;