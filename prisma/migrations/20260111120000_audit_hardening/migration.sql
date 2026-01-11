-- Create Indexes for Dashboard Performance
CREATE INDEX IF NOT EXISTS "reports_site_id_status_idx" ON "reports"("site_id", "status");
CREATE INDEX IF NOT EXISTS "reports_submission_date_idx" ON "reports"("submission_date");

CREATE INDEX IF NOT EXISTS "transactions_site_id_status_type_idx" ON "transactions"("site_id", "status", "type");
CREATE INDEX IF NOT EXISTS "transactions_small_group_id_status_type_idx" ON "transactions"("small_group_id", "status", "type");
CREATE INDEX IF NOT EXISTS "transactions_date_idx" ON "transactions"("date");

CREATE INDEX IF NOT EXISTS "fund_allocations_site_id_status_idx" ON "fund_allocations"("site_id", "status");
CREATE INDEX IF NOT EXISTS "fund_allocations_from_site_id_status_idx" ON "fund_allocations"("from_site_id", "status");

-- Constraint Hardening: Prevent Deleting Users with Audit Logs
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_actor_id_fkey";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
