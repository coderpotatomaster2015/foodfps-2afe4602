-- Create player inventory table for storing equipped items (guns, powers, health packs)
CREATE TABLE public.player_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL, -- 'weapon', 'power', 'health_pack'
  item_id TEXT NOT NULL, -- weapon name or power type
  quantity INTEGER NOT NULL DEFAULT 1,
  is_equipped BOOLEAN NOT NULL DEFAULT false,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

-- Enable RLS
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;

-- Users can view their own inventory
CREATE POLICY "Users can view own inventory"
ON public.player_inventory
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert into own inventory
CREATE POLICY "Users can insert own inventory"
ON public.player_inventory
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own inventory
CREATE POLICY "Users can update own inventory"
ON public.player_inventory
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete from own inventory
CREATE POLICY "Users can delete own inventory"
ON public.player_inventory
FOR DELETE
USING (auth.uid() = user_id);

-- Create shop items table for buyable items
CREATE TABLE public.shop_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_type TEXT NOT NULL, -- 'power', 'health_pack'
  item_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_coins INTEGER NOT NULL DEFAULT 0,
  price_gems INTEGER NOT NULL DEFAULT 0,
  price_gold INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for shop items
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view active shop items
CREATE POLICY "Anyone can view active shop items"
ON public.shop_items
FOR SELECT
USING (is_active = true);

-- Admins can manage shop items
CREATE POLICY "Admins can manage shop items"
ON public.shop_items
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

-- Insert default shop items (powers and health packs)
INSERT INTO public.shop_items (item_type, item_id, name, description, price_coins, price_gems) VALUES
('power', 'teleport', 'Teleport', 'Press SHIFT to teleport forward (3s cooldown)', 500, 50),
('power', 'double_damage', 'Double Damage', 'Deal 2x damage with all weapons', 750, 75),
('power', 'speed', 'Speed Boost', '30% movement speed increase', 400, 40),
('power', 'shield', 'Shield', 'Start with 125 HP instead of 100', 600, 60),
('power', 'slow_motion', 'Slow Motion Aura', 'Enemies move 50% slower near you', 800, 80),
('power', 'invisibility', 'Invisibility', 'Enemies have reduced accuracy targeting you', 700, 70),
('health_pack', 'small_health', 'Small Health Pack', 'Restore 25 HP during game', 100, 10),
('health_pack', 'medium_health', 'Medium Health Pack', 'Restore 50 HP during game', 200, 20),
('health_pack', 'large_health', 'Large Health Pack', 'Restore 100 HP during game', 350, 35);