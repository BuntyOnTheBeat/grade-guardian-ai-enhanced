-- Create user profiles table for additional user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create user settings table
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  grades_private BOOLEAN DEFAULT false,
  has_premium_subscription BOOLEAN DEFAULT false,
  use_gpt4_vision BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  teacher TEXT NOT NULL,
  current_grade DECIMAL(5,2) DEFAULT 0,
  background TEXT DEFAULT 'bg-blue-500',
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.classes NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  grade DECIMAL(5,2),
  weight DECIMAL(5,2),
  feedback JSONB,
  detailed_feedback TEXT,
  file_name TEXT,
  revision_count INTEGER DEFAULT 0,
  latest_revision_id UUID,
  original_rubric TEXT,
  original_instructions TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for user_settings
CREATE POLICY "Users can view their own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for classes
CREATE POLICY "Users can view their own classes" ON public.classes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own classes" ON public.classes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own classes" ON public.classes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own classes" ON public.classes
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for assignments
CREATE POLICY "Users can view their own assignments" ON public.assignments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assignments" ON public.assignments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assignments" ON public.assignments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assignments" ON public.assignments
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to automatically create user profile and settings on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a profile for the new user
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  
    -- Create default settings for the new user
  INSERT INTO public.user_settings (user_id)
  VALUES (new.id);
  
    -- Grant 3 free credits that expire in 14 days
    INSERT INTO public.credit_batches (user_id, credits, expires_at, subscription_type)
    VALUES (new.id, 3, NOW() + INTERVAL '14 days', 'free');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This trigger is now managed in the Supabase dashboard to prevent conflicts
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
