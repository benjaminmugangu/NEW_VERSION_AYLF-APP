// src/app/dashboard/reports/submit/page.tsx
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { ReportForm } from "./components/ReportForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { FilePlus2 } from "lucide-react";

export default function SubmitReportPage() {
  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader 
        title="Submit New Report"
        description="Document activities and outcomes for national, site, or small group levels."
        icon={FilePlus2}
      />
      <ReportForm />
    </RoleBasedGuard>
  );
}
