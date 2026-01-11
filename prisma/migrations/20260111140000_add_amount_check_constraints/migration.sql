-- Manual Migration: Add CHECK constraints for amount validation
-- Priority: P1 (Audit Recommendation)
-- Purpose: Ensure data integrity at database level for financial amounts

-- ============================================
-- 1. Financial Transactions: amount > 0
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_transaction_amount_positive'
    ) THEN
        ALTER TABLE transactions 
        ADD CONSTRAINT chk_transaction_amount_positive 
        CHECK (amount > 0);
        
        RAISE NOTICE 'Added CHECK constraint: transactions.amount > 0';
    ELSE
        RAISE NOTICE 'Constraint chk_transaction_amount_positive already exists';
    END IF;
END$$;

-- ============================================
-- 2. Fund Allocations: amount > 0
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_allocation_amount_positive'
    ) THEN
        ALTER TABLE fund_allocations 
        ADD CONSTRAINT chk_allocation_amount_positive 
        CHECK (amount > 0);
        
        RAISE NOTICE 'Added CHECK constraint: fund_allocations.amount > 0';
    ELSE
        RAISE NOTICE 'Constraint chk_allocation_amount_positive already exists';
    END IF;
END$$;

-- ============================================
-- 3. Accounting Periods: startDate < endDate
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_period_date_order'
    ) THEN
        ALTER TABLE accounting_periods 
        ADD CONSTRAINT chk_period_date_order 
        CHECK (start_date < end_date);
        
        RAISE NOTICE 'Added CHECK constraint: accounting_periods date order';
    ELSE
        RAISE NOTICE 'Constraint chk_period_date_order already exists';
    END IF;
END$$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify constraints are active:

-- SELECT conname, contype, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conname LIKE 'chk_%';
