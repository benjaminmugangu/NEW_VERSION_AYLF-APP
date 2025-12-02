-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('national_coordinator', 'site_coordinator', 'small_group_leader', 'member');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "MemberGender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('student', 'non_student');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('planned', 'in_progress', 'delayed', 'executed', 'canceled');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('national', 'site', 'small_group');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'submitted', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('planned', 'completed');

-- CreateEnum
CREATE TYPE "ActivityCategory" AS ENUM ('spiritual', 'outreach', 'community', 'training');

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "site_id" TEXT,
    "small_group_id" TEXT,
    "mandate_start_date" TIMESTAMP(3),
    "mandate_end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "coordinator_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "small_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "leader_id" TEXT,
    "logistics_assistant_id" TEXT,
    "finance_assistant_id" TEXT,
    "meeting_day" TEXT,
    "meeting_time" TEXT,
    "meeting_location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "small_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "MemberGender" NOT NULL,
    "type" "MemberType" NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "join_date" TIMESTAMP(3) NOT NULL,
    "level" "ActivityLevel" NOT NULL,
    "site_id" TEXT NOT NULL,
    "small_group_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ActivityCategory" NOT NULL,
    "description" TEXT,

    CONSTRAINT "activity_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thematic" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "ActivityStatus" NOT NULL DEFAULT 'planned',
    "level" "ActivityLevel" NOT NULL,
    "site_id" TEXT,
    "small_group_id" TEXT,
    "activity_type_id" TEXT NOT NULL,
    "participants_count_planned" INTEGER,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "activity_date" TIMESTAMP(3) NOT NULL,
    "submission_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" "ActivityLevel" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'pending',
    "content" TEXT NOT NULL,
    "thematic" TEXT NOT NULL,
    "speaker" TEXT,
    "moderator" TEXT,
    "girls_count" INTEGER,
    "boys_count" INTEGER,
    "participants_count_reported" INTEGER,
    "total_expenses" DOUBLE PRECISION,
    "currency" TEXT,
    "financial_summary" TEXT,
    "review_notes" TEXT,
    "images" JSONB,
    "attachments" JSONB,
    "submitted_by" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "site_id" TEXT,
    "small_group_id" TEXT,
    "activity_type_id" TEXT NOT NULL,
    "activity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL,
    "category" TEXT NOT NULL,
    "site_id" TEXT,
    "small_group_id" TEXT,
    "recorded_by" TEXT NOT NULL,
    "attachments" JSONB,
    "related_report_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_allocations" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "allocation_date" TIMESTAMP(3) NOT NULL,
    "goal" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "AllocationStatus" NOT NULL,
    "notes" TEXT,
    "allocated_by_id" TEXT NOT NULL,
    "site_id" TEXT,
    "small_group_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fund_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "site_id" TEXT,
    "small_group_id" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "mandate_start_date" TIMESTAMP(3) NOT NULL,
    "mandate_end_date" TIMESTAMP(3) NOT NULL,
    "pdf_url" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "download_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sites_coordinator_id_key" ON "sites"("coordinator_id");

-- CreateIndex
CREATE UNIQUE INDEX "small_groups_leader_id_key" ON "small_groups"("leader_id");

-- CreateIndex
CREATE UNIQUE INDEX "small_groups_logistics_assistant_id_key" ON "small_groups"("logistics_assistant_id");

-- CreateIndex
CREATE UNIQUE INDEX "small_groups_finance_assistant_id_key" ON "small_groups"("finance_assistant_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_email_key" ON "user_invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_token_key" ON "user_invitations"("token");

-- CreateIndex
CREATE INDEX "certificates_profile_id_idx" ON "certificates"("profile_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_small_group_id_fkey" FOREIGN KEY ("small_group_id") REFERENCES "small_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_coordinator_id_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "small_groups" ADD CONSTRAINT "small_groups_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "small_groups" ADD CONSTRAINT "small_groups_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "small_groups" ADD CONSTRAINT "small_groups_logistics_assistant_id_fkey" FOREIGN KEY ("logistics_assistant_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "small_groups" ADD CONSTRAINT "small_groups_finance_assistant_id_fkey" FOREIGN KEY ("finance_assistant_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_small_group_id_fkey" FOREIGN KEY ("small_group_id") REFERENCES "small_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_small_group_id_fkey" FOREIGN KEY ("small_group_id") REFERENCES "small_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_small_group_id_fkey" FOREIGN KEY ("small_group_id") REFERENCES "small_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_small_group_id_fkey" FOREIGN KEY ("small_group_id") REFERENCES "small_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_related_report_id_fkey" FOREIGN KEY ("related_report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_allocated_by_id_fkey" FOREIGN KEY ("allocated_by_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_small_group_id_fkey" FOREIGN KEY ("small_group_id") REFERENCES "small_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_small_group_id_fkey" FOREIGN KEY ("small_group_id") REFERENCES "small_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
