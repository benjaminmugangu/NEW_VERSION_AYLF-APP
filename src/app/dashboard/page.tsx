// src/app/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { ROLES } from "@/lib/constants";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import dashboardService, { type DashboardStats } from "@/services/dashboardService";
import { DashboardSkeleton } from "@/components/shared/skeletons/DashboardSkeleton";
import { Activity, BarChart3, Building, FileText, Users, DollarSign, ListChecks, UsersRound, Briefcase, Lightbulb, Zap, Printer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from "recharts";
import { DateRangeFilter, type DateFilterValue } from "@/components/shared/DateRangeFilter";

const chartConfigActivities = {
  planned: { label: "Planned", color: "hsl(var(--chart-2))" },
  executed: { label: "Executed", color: "hsl(var(--chart-1))" },
};

const chartConfigMembers = {
  student: { label: "Students", color: "hsl(var(--chart-1))" },
  nonStudent: { label: "Non-Students", color: "hsl(var(--chart-4))" },
};

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
        const response = await dashboardService.getDashboardStats(currentUser, dateFilter);
    if (response.success && response.data) {
      setStats(response.data);
    } else {
            setError(response.error?.message || 'An unknown error occurred.');
      setStats(null);
    }
    setIsLoading(false);
  }, [dateFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handlePrintPage = () => {
    window.print();
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" description="An error occurred" />
        <Card className="mt-6">
          <CardContent className="pt-6 text-center">
            <p className="text-red-500">{error}</p>
            <Button onClick={fetchStats} className="mt-4">Try Again</Button>
          </CardContent>
        </Card>
      </>
    );
  }

  if (!stats) {
    // This case handles when loading is finished but stats are still null without an error.
    // It's a fallback, ideally should not be reached if service layer is consistent.
    return (
      <>
        <PageHeader title="Dashboard" description="No data available." />
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No dashboard statistics could be loaded.</p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR]}>
      <PageHeader 
        title={`Welcome, ${currentUser?.name ?? 'User'}!`}
        description={`Here is your dashboard overview for ${dateFilter.display}.`}
        actions={
          <div className="flex items-center gap-2">
            <DateRangeFilter onFilterChange={setDateFilter} initialRangeKey={dateFilter.rangeKey} />
            <Button onClick={handlePrintPage} variant="outline" size="icon"><Printer className="h-4 w-4"/></Button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Total Activities" 
          value={stats.totalActivities} 
          icon={Activity} 
          description={`${stats.executedActivities} executed, ${stats.plannedActivities} planned`} 
          href="/dashboard/activities" 
        />
        <StatCard 
          title="Total Members" 
          value={stats.totalMembers} 
          icon={Users} 
          description={`${stats.studentMembers} students, ${stats.nonStudentMembers} non-students`} 
          href="/dashboard/members" 
        />
        <StatCard 
          title="Reports Submitted" 
          value={stats.totalReports} 
          icon={FileText} 
          description="All levels combined" 
          href="/dashboard/reports" 
        />
        <StatCard 
          title="Total Sites" 
          value={stats.totalSites} 
          icon={Building} 
          description="Registered AYLF sites" 
          href="/dashboard/sites" 
        />
        <StatCard 
          title="Total Small Groups" 
          value={stats.totalSmallGroups} 
          icon={UsersRound} 
          description="Active small groups" 
          href="/dashboard/small-groups" 
        />
        <StatCard 
          title="Net Balance" 
          value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.netBalance)} 
          icon={DollarSign} 
          description={`Income: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalIncome)} | Expenses: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalExpenses)}`} 
          href="/dashboard/finances" 
        />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="shadow-lg lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="text-primary" /> Activity Status Overview</CardTitle>
            <CardDescription>Breakdown of planned and executed activities for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigActivities} className="min-h-[250px] w-full">
              <BarChart data={stats.activityStatusData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="status" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="count" radius={4}>
                  {stats.activityStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="shadow-lg lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="text-primary" /> Member Composition</CardTitle>
            <CardDescription>Distribution of student vs. non-student members.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigMembers} className="min-h-[250px] w-full">
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Pie data={stats.memberTypeData} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label>
                  {stats.memberTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      {currentUser?.role === ROLES.NATIONAL_COORDINATOR && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="text-primary"/> Quick Actions</CardTitle>
            <CardDescription>Key actions for national-level coordination.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/sites/new">
                <>
                  <Building className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">Add New Site</p>
                    <p className="text-xs text-muted-foreground break-words">Establish a new operational site.</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/finances/allocations/new">
                <>
                  <DollarSign className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">Allocate Funds</p>
                    <p className="text-xs text-muted-foreground break-words">Distribute funds to sites or groups.</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
               <Link href="/dashboard/reports/submit">
                <>
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">Submit New Report</p>
                    <p className="text-xs text-muted-foreground break-words">Log national, site, or group activity.</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
             <Link href="/dashboard/suggestions">
                <>
                  <Lightbulb className="h-5 w-5 text-primary shrink-0" />
                   <div className="whitespace-normal ml-2">
                    <p className="font-semibold">Get AI Suggestions</p>
                    <p className="text-xs text-muted-foreground break-words">Discover new activity ideas.</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
             <Link href="/dashboard/users">
                <>
                  <UsersRound className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">Manage Users</p>
                    <p className="text-xs text-muted-foreground break-words">Administer user accounts and roles.</p>
                  </div>
                </>
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
      <Card className="shadow-lg mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="text-primary"/> Recent Activities</CardTitle>
          <CardDescription>A quick look at recently executed or planned activities for the selected period.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentActivities.length > 0 ? stats.recentActivities.map(activity => (
            <div key={activity.id} className="mb-4 pb-4 border-b last:border-b-0 last:pb-0 last:mb-0">
              <div className="flex justify-between items-start">
                <div>
                  <Button asChild variant="link" className="p-0 h-auto text-left">
                    <Link href={`/dashboard/activities/${activity.id}`}>
                       <h4 className="font-semibold text-md hover:underline">{activity.title}</h4>
                    </Link>
                  </Button>
                  <p className="text-sm text-muted-foreground">{activity.level.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} level - {new Date(activity.date).toLocaleDateString()}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  activity.status === 'EXECUTED' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                  activity.status === 'PLANNED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                  'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                </span>
              </div>
              <p className="text-sm mt-1">{activity.thematic}</p>
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
