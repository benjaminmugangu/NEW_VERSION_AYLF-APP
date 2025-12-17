-- AlterTable
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "mandate_end_date" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "mandate_start_date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user_invitations" ADD COLUMN IF NOT EXISTS "mandate_end_date" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "mandate_start_date" TIMESTAMP(3);
