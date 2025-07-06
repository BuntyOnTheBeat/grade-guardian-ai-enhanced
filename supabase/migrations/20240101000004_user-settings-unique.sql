-- Add unique constraint on user_id for user_settings table
-- This allows upsert operations to work properly
ALTER TABLE public.user_settings 
ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id); 