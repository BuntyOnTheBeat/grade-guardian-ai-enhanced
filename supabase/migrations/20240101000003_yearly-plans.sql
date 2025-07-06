-- Update subscription_type to include yearly plans
ALTER TABLE public.credit_batches DROP CONSTRAINT IF EXISTS credit_batches_subscription_type_check;
ALTER TABLE public.credit_batches ADD CONSTRAINT credit_batches_subscription_type_check 
  CHECK (subscription_type IN ('free', 'student', 'pro', 'student_yearly', 'pro_yearly'));

-- Updated function to add credits with support for yearly plans
CREATE OR REPLACE FUNCTION public.add_credits(
    p_user_id UUID,
    p_credits INTEGER,
    p_subscription_type TEXT DEFAULT 'free',
    p_expiry_days INTEGER DEFAULT 30
) RETURNS UUID AS $$
DECLARE
    new_batch_id UUID;
    expiry_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate expiry date and credits based on subscription type
    CASE p_subscription_type
        WHEN 'student' THEN 
            expiry_date := now() + interval '30 days';
        WHEN 'student_yearly' THEN 
            expiry_date := now() + interval '365 days';
        WHEN 'pro' THEN 
            expiry_date := now() + interval '90 days';
        WHEN 'pro_yearly' THEN 
            expiry_date := now() + interval '365 days';
        ELSE 
            expiry_date := now() + (p_expiry_days || ' days')::interval; -- free credits expire in specified days
    END CASE;
    
    -- Insert new credit batch
    INSERT INTO public.credit_batches (user_id, credits, subscription_type, expires_at)
    VALUES (p_user_id, p_credits, p_subscription_type, expiry_date)
    RETURNING id INTO new_batch_id;
    
    RETURN new_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits based on plan type (helper function)
CREATE OR REPLACE FUNCTION public.add_plan_credits(
    p_user_id UUID,
    p_plan_type TEXT -- 'student_monthly', 'student_yearly', 'pro_monthly', 'pro_yearly'
) RETURNS UUID AS $$
DECLARE
    credits_to_add INTEGER;
    subscription_type TEXT;
    batch_id UUID;
BEGIN
    CASE p_plan_type
        WHEN 'student_monthly' THEN 
            credits_to_add := 50;
            subscription_type := 'student';
        WHEN 'student_yearly' THEN 
            credits_to_add := 605;
            subscription_type := 'student_yearly';
        WHEN 'pro_monthly' THEN 
            credits_to_add := 150;
            subscription_type := 'pro';
        WHEN 'pro_yearly' THEN 
            credits_to_add := 605;
            subscription_type := 'pro_yearly';
        ELSE 
            RAISE EXCEPTION 'Invalid plan type: %', p_plan_type;
    END CASE;
    
    SELECT public.add_credits(p_user_id, credits_to_add, subscription_type) INTO batch_id;
    RETURN batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 