-- Credit batches table to track different credit packages with expiration dates
CREATE TABLE public.credit_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credits INTEGER NOT NULL DEFAULT 0,
    used_credits INTEGER NOT NULL DEFAULT 0,
    subscription_type TEXT NOT NULL DEFAULT 'free' CHECK (subscription_type IN ('free', 'student', 'pro')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Credit usage table to track individual credit usage
CREATE TABLE public.credit_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.credit_batches(id) ON DELETE CASCADE,
    credits_used INTEGER NOT NULL DEFAULT 1,
    assignment_name TEXT NOT NULL,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for better performance
CREATE INDEX idx_credit_batches_user_id ON public.credit_batches(user_id);
CREATE INDEX idx_credit_batches_expires_at ON public.credit_batches(expires_at);
CREATE INDEX idx_credit_usage_user_id ON public.credit_usage(user_id);
CREATE INDEX idx_credit_usage_batch_id ON public.credit_usage(batch_id);
CREATE INDEX idx_credit_usage_created_at ON public.credit_usage(created_at);

-- RLS policies
ALTER TABLE public.credit_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own credit batches
CREATE POLICY "Users can view own credit batches" ON public.credit_batches
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credit batches" ON public.credit_batches
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only see their own credit usage
CREATE POLICY "Users can view own credit usage" ON public.credit_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit usage" ON public.credit_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to automatically deduct credits from the oldest non-expired batch
CREATE OR REPLACE FUNCTION public.deduct_credits(
    p_user_id UUID,
    p_credits_to_deduct INTEGER,
    p_assignment_name TEXT,
    p_assignment_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    batch RECORD;
    remaining_to_deduct INTEGER := p_credits_to_deduct;
    credits_available INTEGER;
BEGIN
    -- Loop through batches in order of expiration (oldest first)
    FOR batch IN 
        SELECT * FROM public.credit_batches 
        WHERE user_id = p_user_id 
        AND expires_at > now() 
        AND (credits - used_credits) > 0
        ORDER BY expires_at ASC
    LOOP
        credits_available := batch.credits - batch.used_credits;
        
        IF credits_available >= remaining_to_deduct THEN
            -- This batch has enough credits
            UPDATE public.credit_batches 
            SET used_credits = used_credits + remaining_to_deduct,
                updated_at = now()
            WHERE id = batch.id;
            
            -- Record the usage
            INSERT INTO public.credit_usage (user_id, batch_id, credits_used, assignment_name, assignment_id)
            VALUES (p_user_id, batch.id, remaining_to_deduct, p_assignment_name, p_assignment_id);
            
            RETURN TRUE;
        ELSE
            -- Use all remaining credits from this batch
            UPDATE public.credit_batches 
            SET used_credits = credits,
                updated_at = now()
            WHERE id = batch.id;
            
            -- Record the usage
            INSERT INTO public.credit_usage (user_id, batch_id, credits_used, assignment_name, assignment_id)
            VALUES (p_user_id, batch.id, credits_available, p_assignment_name, p_assignment_id);
            
            remaining_to_deduct := remaining_to_deduct - credits_available;
        END IF;
    END LOOP;
    
    -- If we get here, there weren't enough credits
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits (for purchases/subscriptions)
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
    -- Calculate expiry date based on subscription type
    CASE p_subscription_type
        WHEN 'student' THEN expiry_date := now() + interval '90 days';
        WHEN 'pro' THEN expiry_date := now() + interval '365 days';
        ELSE expiry_date := now() + (p_expiry_days || ' days')::interval; -- free credits expire in specified days
    END CASE;
    
    -- Insert new credit batch
    INSERT INTO public.credit_batches (user_id, credits, subscription_type, expires_at)
    VALUES (p_user_id, p_credits, p_subscription_type, expiry_date)
    RETURNING id INTO new_batch_id;
    
    RETURN new_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_credit_batches_updated_at
    BEFORE UPDATE ON public.credit_batches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column(); 