-- Create redeem_codes table for storing codes that give skins/currency
CREATE TABLE public.redeem_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  reward_type TEXT NOT NULL, -- 'coins', 'gems', 'gold', 'skin', 'all_currency'
  reward_value INTEGER NOT NULL DEFAULT 0, -- amount for currency, skin_id for skins
  skin_id UUID REFERENCES public.custom_skins(id),
  max_uses INTEGER DEFAULT NULL, -- null means unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create table to track who has redeemed which codes
CREATE TABLE public.redeemed_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code_id UUID NOT NULL REFERENCES public.redeem_codes(id),
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint so users can only redeem a code once
ALTER TABLE public.redeemed_codes ADD CONSTRAINT unique_user_code UNIQUE (user_id, code_id);

-- Enable RLS
ALTER TABLE public.redeem_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redeemed_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for redeem_codes
CREATE POLICY "Admins and Owners can manage codes"
  ON public.redeem_codes
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

CREATE POLICY "Anyone can view active codes for redemption"
  ON public.redeem_codes
  FOR SELECT
  USING (is_active = true);

-- RLS policies for redeemed_codes
CREATE POLICY "Users can redeem codes"
  ON public.redeemed_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own redemptions"
  ON public.redeemed_codes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all redemptions"
  ON public.redeemed_codes
  FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));