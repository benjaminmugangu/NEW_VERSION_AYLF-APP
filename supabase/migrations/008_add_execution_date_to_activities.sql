-- Add the executionDate column to the activities table
ALTER TABLE public.activities
ADD COLUMN execution_date TIMESTAMP WITH TIME ZONE;

-- Add a comment to the new column for clarity
COMMENT ON COLUMN public.activities.execution_date IS 'The planned date for the activity to be executed.';

-- It's a good practice to backfill existing rows if necessary,
-- but for this case, we'll allow NULLs for older records.
-- For new activities, the application logic should enforce this field.
