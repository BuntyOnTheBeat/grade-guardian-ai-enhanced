-- Add missing DELETE policy for assignment_revisions table
-- This ensures users can only delete their own assignment revisions

CREATE POLICY "Users can delete own assignment revisions" ON public.assignment_revisions
    FOR DELETE USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON POLICY "Users can delete own assignment revisions" ON public.assignment_revisions 
IS 'Allows users to delete only their own assignment revisions, ensuring data isolation'; 