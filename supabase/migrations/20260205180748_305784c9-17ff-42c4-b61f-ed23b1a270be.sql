-- Add weapons to shop_items
INSERT INTO shop_items (item_type, item_id, name, description, price_coins, price_gems, price_gold, is_active)
VALUES 
  ('weapon', 'shotgun', 'Shotgun', 'Powerful close-range weapon with spread shots', 500, 0, 0, true),
  ('weapon', 'sword', 'Sword', 'Melee weapon with high damage', 800, 0, 0, true),
  ('weapon', 'rifle', 'Rifle', 'Accurate long-range automatic weapon', 1000, 0, 0, true),
  ('weapon', 'sniper', 'Sniper', 'High damage precision weapon', 1500, 0, 0, true),
  ('weapon', 'smg', 'SMG', 'Fast firing submachine gun', 1200, 0, 0, true),
  ('weapon', 'knife', 'Knife', 'Fast melee weapon', 600, 0, 0, true),
  ('weapon', 'rpg', 'RPG', 'Explosive rocket launcher', 2500, 0, 0, true),
  ('weapon', 'axe', 'Axe', 'Heavy melee weapon', 1800, 0, 0, true),
  ('weapon', 'flamethrower', 'Flamethrower', 'Fires continuous stream of flames', 3000, 0, 0, true),
  ('weapon', 'minigun', 'Minigun', 'Very fast firing heavy weapon', 4000, 0, 0, true),
  ('weapon', 'railgun', 'Railgun', 'Ultimate precision weapon with massive damage', 5000, 0, 0, true),
  ('health_pack', 'small_health', 'Small Health Pack', 'Restores 25 HP', 100, 0, 0, true),
  ('health_pack', 'medium_health', 'Medium Health Pack', 'Restores 50 HP', 200, 0, 0, true),
  ('health_pack', 'large_health', 'Large Health Pack', 'Restores 100 HP', 350, 0, 0, true)
ON CONFLICT (item_id) DO NOTHING;

-- Create math_problems table for class mode reload
CREATE TABLE IF NOT EXISTS public.class_math_problems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_code_id UUID REFERENCES public.class_codes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

ALTER TABLE public.class_math_problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers and owners can manage math problems"
  ON public.class_math_problems
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'owner'::app_role) OR
    public.has_role(auth.uid(), 'teacher'::app_role)
  );

CREATE POLICY "Anyone can read math problems"
  ON public.class_math_problems
  FOR SELECT
  USING (true);