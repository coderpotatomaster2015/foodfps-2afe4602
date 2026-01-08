-- Create a security definer function for admins/owners to gift currency
CREATE OR REPLACE FUNCTION public.gift_currency(
  _target_username TEXT,
  _coins INTEGER DEFAULT 0,
  _gems INTEGER DEFAULT 0,
  _gold INTEGER DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_user_id UUID;
  _current_coins INTEGER;
  _current_gems INTEGER;
  _current_gold INTEGER;
BEGIN
  -- Check if caller is admin or owner
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]) THEN
    RETURN FALSE;
  END IF;

  -- Find the target user
  SELECT user_id INTO _target_user_id
  FROM profiles
  WHERE LOWER(username) = LOWER(_target_username)
  LIMIT 1;

  IF _target_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get existing currency or create new record
  SELECT coins, gems, gold INTO _current_coins, _current_gems, _current_gold
  FROM player_currencies
  WHERE user_id = _target_user_id;

  IF _current_coins IS NULL THEN
    -- Create new record
    INSERT INTO player_currencies (user_id, coins, gems, gold)
    VALUES (_target_user_id, _coins, _gems, _gold);
  ELSE
    -- Update existing
    UPDATE player_currencies
    SET coins = _current_coins + _coins,
        gems = _current_gems + _gems,
        gold = _current_gold + _gold,
        updated_at = now()
    WHERE user_id = _target_user_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- Create function to add score (used for winner rewards)
CREATE OR REPLACE FUNCTION public.add_player_currency(
  _user_id UUID,
  _coins INTEGER DEFAULT 0,
  _gems INTEGER DEFAULT 0,
  _gold INTEGER DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_coins INTEGER;
  _current_gems INTEGER;
  _current_gold INTEGER;
BEGIN
  -- Get existing currency
  SELECT coins, gems, gold INTO _current_coins, _current_gems, _current_gold
  FROM player_currencies
  WHERE user_id = _user_id;

  IF _current_coins IS NULL THEN
    INSERT INTO player_currencies (user_id, coins, gems, gold)
    VALUES (_user_id, _coins, _gems, _gold);
  ELSE
    UPDATE player_currencies
    SET coins = _current_coins + _coins,
        gems = _current_gems + _gems,
        gold = _current_gold + _gold,
        updated_at = now()
    WHERE user_id = _user_id;
  END IF;

  RETURN TRUE;
END;
$$;