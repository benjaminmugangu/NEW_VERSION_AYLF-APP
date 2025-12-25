-- Safe migration to add hybrid allocation support
-- This preserves all existing data by adding columns with defaults

BEGIN;

-- Add allocation_type column with default 'hierarchical'
ALTER TABLE public.fund_allocations
ADD COLUMN IF NOT EXISTS allocation_type TEXT NOT NULL DEFAULT 'hierarchical';

-- Add bypass_reason column (nullable)
ALTER TABLE public.fund_allocations
ADD COLUMN IF NOT EXISTS bypass_reason TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.fund_allocations.allocation_type IS 
'Type of allocation: hierarchical (NC→Site or SC→Group) or direct (NC→Group bypass)';

COMMENT ON COLUMN public.fund_allocations.bypass_reason IS 
'Required justification when allocation_type=direct. Min 20 characters.';

-- Update existing records to ensure they have the hierarchical type
UPDATE public.fund_allocations
SET allocation_type = 'hierarchical'
WHERE allocation_type IS NULL OR allocation_type = '';

-- Verify the migration
DO $$
DECLARE
  total_count INTEGER;
  hierarchical_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM public.fund_allocations;
  SELECT COUNT(*) INTO hierarchical_count FROM public.fund_allocations WHERE allocation_type = 'hierarchical';
  
  RAISE NOTICE 'Migration completed successfully:';
  RAISE NOTICE '  Total allocations: %', total_count;
  RAISE NOTICE '  Hierarchical allocations: %', hierarchical_count;
  RAISE NOTICE '  Direct allocations: %', total_count - hierarchical_count;
END $$;

COMMIT;
