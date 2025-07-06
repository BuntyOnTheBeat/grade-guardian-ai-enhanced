-- Assignment revisions table to track multiple submissions of the same assignment
CREATE TABLE public.assignment_revisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL DEFAULT 1,
    file_name TEXT,
    grade NUMERIC,
    feedback JSONB,
    detailed_feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for better performance
CREATE INDEX idx_assignment_revisions_assignment_id ON public.assignment_revisions(assignment_id);
CREATE INDEX idx_assignment_revisions_user_id ON public.assignment_revisions(user_id);
CREATE INDEX idx_assignment_revisions_submitted_at ON public.assignment_revisions(submitted_at);

-- RLS policies
ALTER TABLE public.assignment_revisions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own assignment revisions
CREATE POLICY "Users can view own assignment revisions" ON public.assignment_revisions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assignment revisions" ON public.assignment_revisions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assignment revisions" ON public.assignment_revisions
    FOR UPDATE USING (auth.uid() = user_id);

-- Add revision tracking fields to assignments table
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 1;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS latest_revision_id UUID REFERENCES public.assignment_revisions(id);
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS original_rubric TEXT;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS original_instructions TEXT;

-- Function to get or create the next revision number for an assignment
CREATE OR REPLACE FUNCTION public.get_next_revision_number(p_assignment_id UUID)
RETURNS INTEGER AS $$
DECLARE
    max_revision INTEGER;
BEGIN
    SELECT COALESCE(MAX(revision_number), 0) + 1
    INTO max_revision
    FROM public.assignment_revisions
    WHERE assignment_id = p_assignment_id;
    
    RETURN max_revision;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new assignment revision
CREATE OR REPLACE FUNCTION public.create_assignment_revision(
    p_assignment_id UUID,
    p_user_id UUID,
    p_file_name TEXT,
    p_grade NUMERIC,
    p_feedback JSONB,
    p_detailed_feedback TEXT
) RETURNS UUID AS $$
DECLARE
    new_revision_id UUID;
    revision_num INTEGER;
BEGIN
    -- Get the next revision number
    SELECT public.get_next_revision_number(p_assignment_id) INTO revision_num;
    
    -- Insert new revision
    INSERT INTO public.assignment_revisions (
        assignment_id,
        user_id,
        revision_number,
        file_name,
        grade,
        feedback,
        detailed_feedback
    ) VALUES (
        p_assignment_id,
        p_user_id,
        revision_num,
        p_file_name,
        p_grade,
        p_feedback,
        p_detailed_feedback
    ) RETURNING id INTO new_revision_id;
    
    -- Update the main assignment with latest revision info
    UPDATE public.assignments 
    SET 
        revision_count = revision_num,
        latest_revision_id = new_revision_id,
        grade = p_grade,
        feedback = p_feedback,
        detailed_feedback = p_detailed_feedback,
        file_name = p_file_name,
        updated_at = now()
    WHERE id = p_assignment_id AND user_id = p_user_id;
    
    RETURN new_revision_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrate existing assignments to have initial revisions
INSERT INTO public.assignment_revisions (
    assignment_id,
    user_id,
    revision_number,
    file_name,
    grade,
    feedback,
    detailed_feedback,
    submitted_at
)
SELECT 
    id,
    user_id,
    1,
    file_name,
    grade,
    feedback,
    detailed_feedback,
    submitted_at
FROM public.assignments;

-- Update assignments table with revision info
UPDATE public.assignments 
SET 
    revision_count = 1,
    latest_revision_id = r.id
FROM public.assignment_revisions r
WHERE public.assignments.id = r.assignment_id 
AND r.revision_number = 1; 