-- Manual Migration: Standardize to Native Enums (Data-Safe)

-- 1. Create Native Enums
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AllocationType') THEN
        CREATE TYPE "AllocationType" AS ENUM ('hierarchical', 'direct');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvitationStatus') THEN
        CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'expired');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN
        CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'approve', 'reject', 'complete', 'reverse', 'delete');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditEntityType') THEN
        CREATE TYPE "AuditEntityType" AS ENUM ('Profile', 'Member', 'Site', 'SmallGroup', 'Activity', 'ActivityType', 'Report', 'FinancialTransaction', 'FundAllocation', 'AccountingPeriod');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountingPeriodType') THEN
        CREATE TYPE "AccountingPeriodType" AS ENUM ('month', 'quarter', 'year');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountingPeriodStatus') THEN
        CREATE TYPE "AccountingPeriodStatus" AS ENUM ('open', 'closed');
    END IF;
END $$;

-- 2. Convert Columns with Data Preservation (USING clause)

-- FundAllocation: allocation_type
ALTER TABLE "fund_allocations" 
  ALTER COLUMN "allocation_type" TYPE "AllocationType" 
  USING "allocation_type"::"AllocationType";

-- UserInvitation: status
ALTER TABLE "user_invitations" 
  ALTER COLUMN "status" TYPE "InvitationStatus" 
  USING "status"::"InvitationStatus";

-- AuditLog: action
ALTER TABLE "audit_logs" 
  ALTER COLUMN "action" TYPE "AuditAction" 
  USING "action"::"AuditAction";

-- AuditLog: entityType -> entity_type (rename + cast)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'entityType') THEN
        ALTER TABLE "audit_logs" RENAME COLUMN "entityType" TO "entity_type";
    END IF;
END $$;

ALTER TABLE "audit_logs" 
  ALTER COLUMN "entity_type" TYPE "AuditEntityType" 
  USING "entity_type"::"AuditEntityType";

-- AccountingPeriod: type
ALTER TABLE "accounting_periods" 
  ALTER COLUMN "type" TYPE "AccountingPeriodType" 
  USING "type"::"AccountingPeriodType";

-- AccountingPeriod: status
ALTER TABLE "accounting_periods" 
  ALTER COLUMN "status" TYPE "AccountingPeriodStatus" 
  USING "status"::"AccountingPeriodStatus";

-- 3. Add Integrity Constraints (CHECK)
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_amount_positive";
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_amount_positive" CHECK (amount > 0);

ALTER TABLE "fund_allocations" DROP CONSTRAINT IF EXISTS "fund_allocations_amount_positive";
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_amount_positive" CHECK (amount > 0);

ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_girlsCount_non_negative";
ALTER TABLE "reports" ADD CONSTRAINT "reports_girlsCount_non_negative" CHECK ("girls_count" >= 0);

ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_boysCount_non_negative";
ALTER TABLE "reports" ADD CONSTRAINT "reports_boysCount_non_negative" CHECK ("boys_count" >= 0);

ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_participantsCount_non_negative";
ALTER TABLE "reports" ADD CONSTRAINT "reports_participantsCount_non_negative" CHECK ("participants_count_reported" >= 0);
