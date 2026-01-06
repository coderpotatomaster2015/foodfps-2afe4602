-- Create ads table for ad campaigns
CREATE TABLE public.ads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  target_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone
);

-- Create table for ad signup confirmations
CREATE TABLE public.ad_signups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  username text NOT NULL,
  ad_id uuid REFERENCES public.ads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'declined'
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table to track which users have ads disabled
CREATE TABLE public.ad_exemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  granted_by uuid NOT NULL,
  granted_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_exemptions ENABLE ROW LEVEL SECURITY;

-- Ads policies - only owners can manage ads
CREATE POLICY "Owners can manage ads"
ON public.ads
FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Anyone can view active ads"
ON public.ads
FOR SELECT
USING (is_active = true);

-- Ad signups policies
CREATE POLICY "Users can create signup requests"
ON public.ad_signups
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own signups"
ON public.ad_signups
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage ad signups"
ON public.ad_signups
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

-- Ad exemptions policies
CREATE POLICY "Owners can manage exemptions"
ON public.ad_exemptions
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'owner'::app_role]));

CREATE POLICY "Users can view own exemption"
ON public.ad_exemptions
FOR SELECT
USING (auth.uid() = user_id);

-- Function to check if user has ad exemption
CREATE OR REPLACE FUNCTION public.has_ad_exemption(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ad_exemptions
    WHERE user_id = _user_id
  )
$$;

-- Update user_roles policies to prevent owner demotion
-- First drop existing policies that allow role management
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

-- Create new policies that protect owners
CREATE POLICY "Owners can manage non-owner roles"
ON public.user_roles
FOR ALL
USING (
  has_role(auth.uid(), 'owner'::app_role) OR
  (has_role(auth.uid(), 'admin'::app_role) AND role != 'owner')
);

CREATE POLICY "Admins cannot delete owner roles"
ON public.user_roles
FOR DELETE
USING (
  has_role(auth.uid(), 'owner'::app_role) OR
  (has_role(auth.uid(), 'admin'::app_role) AND role != 'owner')
);