-- Add unique constraint for class_members upsert to work
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_members_user_id_class_code_id_key'
  ) THEN
    ALTER TABLE public.class_members ADD CONSTRAINT class_members_user_id_class_code_id_key UNIQUE (user_id, class_code_id);
  END IF;
END $$;