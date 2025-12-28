-- ensure_profile_cascade.sql
-- This script ensures that all foreign keys referencing the 'profiles' table's 'id' column
-- are configured with ON UPDATE CASCADE. This is critical for the Identity Sync tool.

BEGIN;

-- 1. Sites Coordinator
ALTER TABLE public.sites DROP CONSTRAINT IF EXISTS sites_coordinator_id_fkey;
ALTER TABLE public.sites ADD CONSTRAINT sites_coordinator_id_fkey FOREIGN KEY (coordinator_id) REFERENCES public.profiles(id) ON UPDATE CASCADE;

-- 2. Small Groups (Leader, Logistics, Finance)
ALTER TABLE public.small_groups DROP CONSTRAINT IF EXISTS small_groups_leader_id_fkey;
ALTER TABLE public.small_groups ADD CONSTRAINT small_groups_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.profiles(id) ON UPDATE CASCADE;

ALTER TABLE public.small_groups DROP CONSTRAINT IF EXISTS small_groups_logistics_assistant_id_fkey;
ALTER TABLE public.small_groups ADD CONSTRAINT small_groups_logistics_assistant_id_fkey FOREIGN KEY (logistics_assistant_id) REFERENCES public.profiles(id) ON UPDATE CASCADE;

ALTER TABLE public.small_groups DROP CONSTRAINT IF EXISTS small_groups_finance_assistant_id_fkey;
ALTER TABLE public.small_groups ADD CONSTRAINT small_groups_finance_assistant_id_fkey FOREIGN KEY (finance_assistant_id) REFERENCES public.profiles(id) ON UPDATE CASCADE;

-- 3. Activities
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_created_by_fkey;
ALTER TABLE public.activities ADD CONSTRAINT activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON UPDATE CASCADE;

-- 4. Reports (Submitter, Reviewer)
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_submitted_by_fkey;
ALTER TABLE public.reports ADD CONSTRAINT reports_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON UPDATE CASCADE;

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reviewed_by_fkey;
ALTER TABLE public.reports ADD CONSTRAINT reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON UPDATE CASCADE;

-- 5. Financial Transactions (RecordedBy, ApprovedBy)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_recorded_by_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON UPDATE CASCADE;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_approved_by_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_approved_by_id_fkey FOREIGN KEY (approved_by_id) REFERENCES public.profiles(id) ON UPDATE CASCADE;

-- 6. Fund Allocations
ALTER TABLE public.fund_allocations DROP CONSTRAINT IF EXISTS fund_allocations_allocated_by_id_fkey;
ALTER TABLE public.fund_allocations ADD CONSTRAINT fund_allocations_allocated_by_id_fkey FOREIGN KEY (allocated_by_id) REFERENCES public.profiles(id) ON UPDATE CASCADE;

-- 7. Certificates
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS certificates_profile_id_fkey;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON UPDATE CASCADE;

-- 8. Audit Logs
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON UPDATE CASCADE;

-- 9. Accounting Periods
ALTER TABLE public.accounting_periods DROP CONSTRAINT IF EXISTS accounting_periods_closed_by_id_fkey;
ALTER TABLE public.accounting_periods ADD CONSTRAINT accounting_periods_closed_by_id_fkey FOREIGN KEY (closed_by_id) REFERENCES public.profiles(id) ON UPDATE CASCADE;

-- 10. Notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON UPDATE CASCADE;

-- 11. Members
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_user_id_fkey;
ALTER TABLE public.members ADD CONSTRAINT members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON UPDATE CASCADE;

COMMIT;
