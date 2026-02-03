-- Create class_codes table for teacher/owner-generated join codes
CREATE TABLE public.class_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_students INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create class_members table for students who joined via code
CREATE TABLE public.class_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_code_id UUID NOT NULL REFERENCES public.class_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_ends_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  is_ip_blocked BOOLEAN DEFAULT true,
  UNIQUE(class_code_id, user_id)
);

-- Create equipped_loadout table for weapon slots
CREATE TABLE public.equipped_loadout (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  slot_1 TEXT DEFAULT 'pistol',
  slot_2 TEXT,
  slot_3 TEXT,
  slot_4 TEXT,
  slot_5 TEXT,
  equipped_power TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.class_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipped_loadout ENABLE ROW LEVEL SECURITY;

-- RLS policies for class_codes
CREATE POLICY "Owners and teachers can manage class codes"
ON public.class_codes FOR ALL
USING (
  has_any_role(auth.uid(), ARRAY['owner'::app_role, 'teacher'::app_role, 'admin'::app_role])
);

CREATE POLICY "Anyone can view active class codes"
ON public.class_codes FOR SELECT
USING (is_active = true);

-- RLS policies for class_members
CREATE POLICY "Owners and teachers can manage class members"
ON public.class_members FOR ALL
USING (
  has_any_role(auth.uid(), ARRAY['owner'::app_role, 'teacher'::app_role, 'admin'::app_role])
);

CREATE POLICY "Users can view own membership"
ON public.class_members FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can join a class"
ON public.class_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS policies for equipped_loadout
CREATE POLICY "Users can manage their own loadout"
ON public.equipped_loadout FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to check if user is a class member
CREATE OR REPLACE FUNCTION public.is_class_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_members cm
    JOIN public.class_codes cc ON cm.class_code_id = cc.id
    WHERE cm.user_id = _user_id 
      AND cc.is_active = true
      AND (cm.session_ends_at IS NULL OR cm.session_ends_at > now())
  )
$$;

-- Function to get class member's class code details
CREATE OR REPLACE FUNCTION public.get_class_info(_user_id uuid)
RETURNS TABLE(class_name text, school_mode_only boolean, session_ends_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cc.name, true::boolean, cm.session_ends_at
  FROM public.class_members cm
  JOIN public.class_codes cc ON cm.class_code_id = cc.id
  WHERE cm.user_id = _user_id 
    AND cc.is_active = true
    AND (cm.session_ends_at IS NULL OR cm.session_ends_at > now())
  LIMIT 1
$$;