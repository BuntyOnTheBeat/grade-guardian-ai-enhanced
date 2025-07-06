-- Add original_text field to assignments table
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS original_text TEXT;

-- Add original_text field to assignment_revisions table  
ALTER TABLE public.assignment_revisions ADD COLUMN IF NOT EXISTS original_text TEXT;

-- Update the create_assignment_revision function to handle original_text
CREATE OR REPLACE FUNCTION public.create_assignment_revision(
    p_assignment_id UUID,
    p_user_id UUID,
    p_file_name TEXT,
    p_grade NUMERIC,
    p_feedback JSONB,
    p_detailed_feedback TEXT,
    p_original_text TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_revision_number INTEGER;
    v_revision_id UUID;
BEGIN
    -- Get the next revision number
    SELECT COALESCE(MAX(revision_number), 0) + 1 
    INTO v_revision_number
    FROM public.assignment_revisions 
    WHERE assignment_id = p_assignment_id;
    
    -- Insert the new revision
    INSERT INTO public.assignment_revisions (
        assignment_id, 
        user_id, 
        revision_number, 
        file_name, 
        grade, 
        feedback, 
        detailed_feedback,
        original_text
    ) VALUES (
        p_assignment_id, 
        p_user_id, 
        v_revision_number, 
        p_file_name, 
        p_grade, 
        p_feedback, 
        p_detailed_feedback,
        p_original_text
    ) RETURNING id INTO v_revision_id;
    
    -- Update the main assignment record
    UPDATE public.assignments 
    SET 
        revision_count = v_revision_number,
        latest_revision_id = v_revision_id
    WHERE id = p_assignment_id;
    
    RETURN v_revision_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 