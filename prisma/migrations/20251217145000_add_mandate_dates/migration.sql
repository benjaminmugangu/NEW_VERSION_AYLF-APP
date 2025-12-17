-- AlterTable
ALTER TABLE "profile" ADD COLUMN     "mandate_end_date" TIMESTAMP(3),
ADD COLUMN     "mandate_start_date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user_invitations" ADD COLUMN     "mandate_end_date" TIMESTAMP(3),
ADD COLUMN     "mandate_start_date" TIMESTAMP(3);
