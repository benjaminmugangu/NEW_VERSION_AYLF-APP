// src/app/dashboard/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { ROLES } from "@/lib/constants";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { mockActivities, mockMembers, mockReports, mockSites, mockSmallGroups, mockTransactions } from "@/lib/mockData";
import { Activity, BarChart3, Building, FileText, Users, DollarSign, ListChecks, UsersRound, Briefcase, Lightbulb, Zap, Printer } from "lucide-react"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
// import Image from "next/image"; // Not used directly
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from "recharts";
import { DateRangeFilter, applyDateFilter, type DateFilterValue } from "@/components/shared/DateRangeFilter";

const chartConfigActivities = {
  planned: { label: "Planned", color: "hsl(var(--chart-2))" },
  executed: { label: "Executed", color: "hsl(var(--chart-1))" },
  cancelled: { label: "Cancelled", color: "hsl(var(--chart-5))" },
};

const chartConfigMembers = {
  student: { label: "Students", color: "hsl(var(--chart-1))" },
  nonStudent: { label: "Non-Students", color: "hsl(var(--chart-4))" },
};

export default function DashboardPage() { 
  const { currentUser } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });

  // Apply date filter to relevant data
  const filteredActivities = useMemo(() => applyDateFilter(mockActivities, dateFilter), [dateFilter]);
  const filteredMembers = useMemo(() => applyDateFilter(mockMembers.map(m => ({...m, date: m.joinDate})), dateFilter), [dateFilter]); // Adapt member data for filter
  const filteredReports = useMemo(() => applyDateFilter(mockReports.map(r => ({...r, date: r.submissionDate})), dateFilter), [dateFilter]); // Adapt report data for filter
  const filteredTransactions = useMemo(() => applyDateFilter(mockTransactions, dateFilter), [dateFilter]);


  // Calculate stats from filtered data
  const totalActivities = filteredActivities.length;
  const plannedActivities = filteredActivities.filter(a => a.status === "planned").length;
  const executedActivities = filteredActivities.filter(a => a.status === "executed").length;
  
  const totalMembers = filteredMembers.length;
  const studentMembers = filteredMembers.filter(m => m.type === "student").length;
  const nonStudentMembers = filteredMembers.filter(m => m.type === "non-student").length;
  
  const totalReports = filteredReports.length;
  const totalSites = mockSites.length; // Not typically date filtered
  const totalSmallGroups = mockSmallGroups.length; // Not typically date filtered

  // Financial data from filtered transactions
  const totalIncome = filteredTransactions
    .filter(t => t.transactionType === 'income_source' && t.recipientEntityType === 'national')
    .reduce((sum, t) => sum + t.amount, 0);
  const nationalExpenses = filteredTransactions
    .filter(t => t.senderEntityType === 'national' && t.transactionType === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const fundsDistributedToSites = filteredTransactions
    .filter(t => t.senderEntityType === 'national' && t.recipientEntityType === 'site')
    .reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - (nationalExpenses + fundsDistributedToSites);

  const activityStatusData = [
    { status: "Planned", count: plannedActivities, fill: chartConfigActivities.planned.color },
    { status: "Executed", count: executedActivities, fill: chartConfigActivities.executed.color },
    { status: "Cancelled", count: filteredActivities.filter(a => a.status === "cancelled").length, fill: chartConfigActivities.cancelled.color },
  ];

  const memberTypeData = [
    { type: "Students", count: studentMembers, fill: chartConfigMembers.student.color },
    { type: "Non-Students", count: nonStudentMembers, fill: chartConfigMembers.nonStudent.color },
  ];

  const recentActivitiesToDisplay = filteredActivities
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0,3);

  const pageDescription = useMemo(() => {
    if (!currentUser) return `Filter: ${dateFilter.display}`;

    let assignmentText = "";
    if (currentUser.role === ROLES.NATIONAL_COORDINATOR) {
      assignmentText = "Coordinator of AYLF/RDC.";
    } else if (currentUser.role === ROLES.SITE_COORDINATOR && currentUser.siteId) {
      const site = mockSites.find(s => s.id === currentUser.siteId);
      assignmentText = `Coordinator of ${site?.name || 'your site'}.`;
    } else if (currentUser.role === ROLES.SMALL_GROUP_LEADER && currentUser.smallGroupId) {
      const sg = mockSmallGroups.find(s => s.id === currentUser.smallGroupId);
      if (sg) {
        const site = mockSites.find(s => s.id === sg.siteId);
        let sgUserRole = "Member"; // Default
        if (sg.leaderId === currentUser.id) {
          sgUserRole = "Leader";
        } else if (sg.logisticsAssistantId === currentUser.id) {
          sgUserRole = "Logistics Assistant";
        } else if (sg.financeAssistantId === currentUser.id) {
          sgUserRole = "Finance Assistant";
        }
        assignmentText = `${sgUserRole} of ${sg.name || 'your small group'}${site ? ` (${site.name})` : ''}.`;
      } else {
        assignmentText = "Leader of your small group.";
      }
    } else {
      assignmentText = "Overview.";
    }
    return `${assignmentText} Filter: ${dateFilter.display}`;
  }, [currentUser, dateFilter]);

  const handlePrintPage = () => {
    window.print();
  };


  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader 
        title={`Welcome, ${currentUser?.name || 'User'}!`}
        description={pageDescription}
        icon={currentUser?.role === ROLES.NATIONAL_COORDINATOR ? Building : (currentUser?.role === ROLES.SITE_COORDINATOR ? ListChecks : Users)}
        actions={
          <Button variant="outline" onClick={handlePrintPage} className="no-print">
            <Printer className="mr-2 h-4 w-4" /> Print Page / Export PDF
          </Button>
        }
      />
      <div className="mb-6 no-print">
        <DateRangeFilter onFilterChange={setDateFilter} initialRangeKey={dateFilter.rangeKey}/>
      </div>
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
        <StatCard 
          title="Total Activities" 
          value={totalActivities} 
          icon={Activity} 
          description={`${executedActivities} executed, ${plannedActivities} planned`}
          href="/dashboard/activities" 
        />
        <StatCard 
          title="Total Members" 
          value={totalMembers} 
          icon={Users} 
          description={`${studentMembers} students, ${nonStudentMembers} non-students`}
          href="/dashboard/members"
        />
        {currentUser?.role === ROLES.NATIONAL_COORDINATOR && (
          <>
            <StatCard 
              title="Submitted Reports" 
              value={totalReports} 
              icon={FileText} 
              description="Across all levels"
              href="/dashboard/reports/view" 
            />
            <StatCard 
              title="Total Sites" 
              value={totalSites} 
              icon={Building} 
              description="Managed sites"
              href="/dashboard/sites" 
            />
            <StatCard 
              title="Total Small Groups" 
              value={totalSmallGroups} 
              icon={UsersRound} 
              description="Active small groups"
              href="/dashboard/sites" 
            />
            <StatCard 
              title="Net Balance" 
              value={`${netBalance < 0 ? '-' : ''}$${Math.abs(netBalance).toLocaleString()}`} 
              icon={Briefcase} 
              description={`Income: $${totalIncome.toLocaleString()}, Outflows: $${(nationalExpenses + fundsDistributedToSites).toLocaleString()}`}
              href="/dashboard/finances"
            />
          </>
        )}
         {currentUser?.role === ROLES.SITE_COORDINATOR && (
          <>
             <StatCard 
               title="Site Reports" 
               value={filteredReports.filter(r => r.siteId === currentUser?.siteId).length} 
               icon={FileText}
               href="/dashboard/reports/view" 
              />
             <StatCard 
               title="Site Small Groups" 
               value={mockSmallGroups.filter(sg => sg.siteId === currentUser?.siteId).length} 
               icon={UsersRound}
               href={currentUser?.siteId ? `/dashboard/sites/${currentUser.siteId}` : "/dashboard/sites"} 
              />
          </>
        )}
         {currentUser?.role === ROLES.SMALL_GROUP_LEADER && (
           <StatCard 
             title="Group Reports" 
             value={filteredReports.filter(r => r.smallGroupId === currentUser?.smallGroupId).length} 
             icon={FileText}
             href="/dashboard/reports/view" 
            />
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mb-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="text-primary"/> Activity Status Overview</CardTitle>
            <CardDescription>Distribution of activities by status for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigActivities} className="h-[250px] w-full">
              <BarChart data={activityStatusData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="status" type="category" tickLine={false} axisLine={false} width={80} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="count" radius={5}>
                  {activityStatusData.map((entry) => (
                    <Cell key={`cell-${entry.status}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="text-primary"/> Member Type Distribution</CardTitle>
            <CardDescription>Breakdown of members by type for the selected period (based on join date).</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
             <ChartContainer config={chartConfigMembers} className="h-[250px] w-full max-w-[300px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="count" />} />
                <Pie data={memberTypeData} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={100} labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    if (percent === 0) return null; 
                    return (
                      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                >
                  {memberTypeData.map((entry) => (
                    <Cell key={`cell-${entry.type}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      {currentUser?.role === ROLES.NATIONAL_COORDINATOR && (
        <Card className="shadow-lg mb-8 no-print">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="text-primary"/> Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
               <Link href="/dashboard/reports/submit">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="whitespace-normal ml-2">
                  <p className="font-semibold">Submit New Report</p>
                  <p className="text-xs text-muted-foreground break-words">Log national, site, or group activity.</p>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
             <Link href="/dashboard/suggestions">
                <Lightbulb className="h-5 w-5 text-primary shrink-0" />
                 <div className="whitespace-normal ml-2">
                  <p className="font-semibold">Get AI Suggestions</p>
                  <p className="text-xs text-muted-foreground break-words">Discover new activity ideas.</p>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
             <Link href="/dashboard/users">
                <UsersRound className="h-5 w-5 text-primary shrink-0" />
                <div className="whitespace-normal ml-2">
                  <p className="font-semibold">Manage Users</p>
                  <p className="text-xs text-muted-foreground break-words">Administer user accounts and roles.</p>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="text-primary"/> Recent Activities</CardTitle>
          <CardDescription>A quick look at recently executed or planned activities for the selected period.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivitiesToDisplay.length > 0 ? recentActivitiesToDisplay.map(activity => (
            <div key={activity.id} className="mb-4 pb-4 border-b last:border-b-0 last:pb-0 last:mb-0">
              <div className="flex justify-between items-start">
                <div>
                  <Button asChild variant="link" className="p-0 h-auto text-left">
                    <Link href={`/dashboard/activities/${activity.id}`}>
                       <h4 className="font-semibold text-md hover:underline">{activity.name}</h4>
                    </Link>
                  </Button>
                  <p className="text-sm text-muted-foreground">{activity.level.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} level - {new Date(activity.date).toLocaleDateString()}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  activity.status === 'executed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                  activity.status === 'planned' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                  'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                </span>
              </div>
              <p className="text-sm mt-1">{activity.description}</p>
            </div>
          )) : (
            <p className="text-muted-foreground text-center py-4">No recent activities found for the selected period.</p>
          )}
           <Button asChild variant="link" className="mt-2 px-0">
             <Link href="/dashboard/activities">View All Activities →</Link>
           </Button>
        </CardContent>
      </Card>
    </RoleBasedGuard>
  );
}

