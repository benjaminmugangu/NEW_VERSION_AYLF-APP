-- This script is idempotent and handles cases where the 'activity_status' ENUM type might not exist.
DO $$
BEGIN
    -- Drop the default constraint first if it exists, to prevent casting errors.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'activities' AND column_name = 'status' AND column_default IS NOT NULL
    ) THEN
        ALTER TABLE public.activities ALTER COLUMN status DROP DEFAULT;
    END IF;

    -- If the type exists, we proceed with the safe rename/recreate method.
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_status') THEN
        ALTER TYPE public.activity_status RENAME TO activity_status_old;
    END IF;

    -- Create the new type with the correct values.
    CREATE TYPE public.activity_status AS ENUM (
        'planned',
        'in_progress',
        'delayed',
        'executed'
    );

    -- Alter the column from TEXT or old ENUM to the new ENUM type.
    -- This will fail if the column contains values not in the new ENUM.
    ALTER TABLE public.activities
    ALTER COLUMN status SET DATA TYPE public.activity_status USING status::text::public.activity_status;

    -- Drop the old type if it existed.
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_status_old') THEN
        DROP TYPE public.activity_status_old;
    END IF;

    -- Finally, set the default value for the column.
    ALTER TABLE public.activities
    ALTER COLUMN status SET DEFAULT 'planned';

END;
$$;
