-- Extended CHECK constraints for Reports and Inventory
DO $$ 
BEGIN
    -- 1. Reports: Validate counts and expenses
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_reports_girls_count_positive') THEN
        ALTER TABLE "reports" ADD CONSTRAINT "check_reports_girls_count_positive" CHECK (girls_count >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_reports_boys_count_positive') THEN
        ALTER TABLE "reports" ADD CONSTRAINT "check_reports_boys_count_positive" CHECK (boys_count >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_reports_participants_count_positive') THEN
        ALTER TABLE "reports" ADD CONSTRAINT "check_reports_participants_count_positive" CHECK (participants_count_reported >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_reports_total_expenses_positive') THEN
        ALTER TABLE "reports" ADD CONSTRAINT "check_reports_total_expenses_positive" CHECK (total_expenses >= 0);
    END IF;

    -- 2. Inventory Items: Validate min_stock
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_inventory_min_stock_positive') THEN
        ALTER TABLE "inventory_items" ADD CONSTRAINT "check_inventory_min_stock_positive" CHECK (min_stock >= 0);
    END IF;

    -- 3. Inventory Movements: Validate quantity
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_inventory_quantity_positive') THEN
        ALTER TABLE "inventory_movements" ADD CONSTRAINT "check_inventory_quantity_positive" CHECK (quantity > 0);
    END IF;
END $$;
