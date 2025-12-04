"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { ROLES } from '@/lib/constants';
import { type DashboardStats } from '@/services/dashboardService';
import { Activity, BarChart3, Building, FileText, Users, DollarSign, UsersRound, Lightbulb, Zap, Printer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts';
import { DateRangeFilter, type DateFilterValue } from '@/components/shared/DateRangeFilter';
import { useRouter, useSearchParams } from 'next/navigation';

const chartConfigActivities = {
  planned: { label: "Planned", color: "hsl(var(--chart-2))" },
  executed: { label: "Executed", color: "hsl(var(--chart-1))" },
};

const chartConfigMembers = {
  student: { label: "Students", color: "hsl(var(--chart-1))" },
  nonStudent: { label: "Non-Students", color: "hsl(var(--chart-4))" },
};

interface DashboardClientProps {
  initialStats: DashboardStats;
  userName: string;
  userRole: string;
  initialDateFilter: DateFilterValue;
}

export function DashboardClient({ initialStats, userName, userRole, initialDateFilter }: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleDateFilterChange = (filter: DateFilterValue) => {
    const params = new URLSearchParams();
    params.set('rangeKey', filter.rangeKey);

    // For custom ranges, the 'from' and 'to' are now top-level properties
    if (filter.rangeKey === 'custom' && filter.from) {
      params.set('from', filter.from);
      if (filter.to) {
        params.set('to', filter.to);
      }
    } else if (filter.rangeKey === 'specific_period' && filter.specificYear) {
      // The server will calculate the range, but we pass the selectors' state
      params.set('year', filter.specificYear);
      if (filter.specificMonth) {
        params.set('month', filter.specificMonth);
      }
    }

    router.push(`/dashboard?${params.toString()}`);
  };

  const handlePrintPage = () => {
    window.print();
  };

  return (
    <>
      <PageHeader
        title={`Welcome, ${userName}!`}
        description={`Here is your dashboard overview for ${initialDateFilter.display}.`}
        actions={
          <div className="flex items-center gap-2">
            <DateRangeFilter onFilterChange={handleDateFilterChange} initialRangeKey={initialDateFilter.rangeKey} />
            <Button onClick={handlePrintPage} variant="outline" size="icon"><Printer className="h-4 w-4" /></Button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Activities" value={initialStats.totalActivities} icon={Activity} description={`${initialStats.executedActivities} executed, ${initialStats.plannedActivities} planned`} href="/dashboard/activities" />
        <StatCard title="Total Members" value={initialStats.totalMembers} icon={Users} description={`${initialStats.studentMembers} students, ${initialStats.nonStudentMembers} non-students`} href="/dashboard/members" />
        <StatCard title="Reports Submitted" value={initialStats.totalReports} icon={FileText} description="All levels combined" href="/dashboard/reports" />
        <StatCard title="Total Sites" value={initialStats.totalSites} icon={Building} description="Registered AYLF sites" href="/dashboard/sites" />
        <StatCard title="Total Small Groups" value={initialStats.totalSmallGroups} icon={UsersRound} description="Active small groups" href="/dashboard/small-groups" />
        <StatCard title="Net Balance" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(initialStats.netBalance)} icon={DollarSign} description={`Income: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(initialStats.totalIncome)} | Expenses: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(initialStats.totalExpenses)}`} href="/dashboard/finances" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="shadow-lg lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="text-primary" /> Activity Status Overview</CardTitle>
            <CardDescription>Breakdown of planned and executed activities for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigActivities} className="min-h-[250px] w-full">
              <BarChart data={initialStats.activityStatusData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="status" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="count" radius={4}>
                  {initialStats.activityStatusData.map((entry, index) => (
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
                <Pie data={initialStats.memberTypeData} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label>
                  {initialStats.memberTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      {userRole === ROLES.NATIONAL_COORDINATOR && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="text-primary" /> Quick Actions</CardTitle>
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
              <Link href="/dashboard/users/new">
                <>
                  <UsersRound className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">Invite User</p>
                    <p className="text-xs text-muted-foreground break-words">Onboard a new coordinator or leader.</p>
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
              <Link href="/dashboard/financials/allocations/new">
                <>
                  <DollarSign className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">Send Funds to Site</p>
                    <p className="text-xs text-muted-foreground break-words">Allocate budget to a site.</p>
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

      {userRole === ROLES.SITE_COORDINATOR && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="text-primary" /> Quick Actions</CardTitle>
            <CardDescription>Manage your site's operations.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/small-groups/new">
                <>
                  <UsersRound className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">Add Small Group</p>
                    <p className="text-xs text-muted-foreground break-words">Create a new group in your site.</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/reports/submit">
                <>
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">Submit Report</p>
                    <p className="text-xs text-muted-foreground break-words">Log site activity.</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/activities/new">
                <>
                  <Activity className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">Plan Activity</p>
                    <p className="text-xs text-muted-foreground break-words">Schedule a site event.</p>
                  </div>
                </>
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {userRole === ROLES.SMALL_GROUP_LEADER && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="text-primary" /> Quick Actions</CardTitle>
            <CardDescription>Manage your small group.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/members/new">
                <>
                  <Users className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">Add Member</p>
                    <p className="text-xs text-muted-foreground break-words">Register a new member.</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/reports/submit">
                <>
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">Submit Report</p>
                    <p className="text-xs text-muted-foreground break-words">Log group activity.</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/activities/new">
                <>
                  <Activity className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">Plan Activity</p>
                    <p className="text-xs text-muted-foreground break-words">Schedule a new meeting.</p>
                  </div>
                </>
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
      <Card className="shadow-lg mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="text-primary" /> Recent Activities</CardTitle>
          <CardDescription>A quick look at recently executed or planned activities for the selected period.</CardDescription>
        </CardHeader>
        <CardContent>
          {initialStats.recentActivities.length > 0 ? initialStats.recentActivities.map(activity => (
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
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${activity.status === 'executed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}`}>
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
    </>
  );
}
