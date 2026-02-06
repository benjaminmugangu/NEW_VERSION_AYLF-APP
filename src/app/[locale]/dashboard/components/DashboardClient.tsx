"use client";

import React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { ROLES } from '@/lib/constants';
import { type DashboardStats } from '@/services/dashboardService';
import { Activity, BarChart3, Building, FileText, Users, DollarSign, UsersRound, Lightbulb, Zap, Printer, Briefcase } from 'lucide-react';
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
import { OnboardingChecklist } from '@/components/shared/OnboardingChecklist';
import { useTranslations, useFormatter } from 'next-intl';
import { Badge } from '@/components/ui/badge';

interface DashboardClientProps {
  readonly initialStats: DashboardStats;
  readonly userName: string;
  readonly userRole: string;
  readonly initialDateFilter: DateFilterValue;
  readonly siteName?: string;
  readonly smallGroupName?: string;
}

export function DashboardClient({ initialStats, userName, userRole, initialDateFilter, siteName, smallGroupName }: DashboardClientProps) {
  const router = useRouter();
  const t = useTranslations('Dashboard');
  const tDateRanges = useTranslations('DateRanges');
  const tStatus = useTranslations('ActivityStatus');
  const tLevel = useTranslations('ActivityLevel');
  const format = useFormatter();

  const chartConfigActivities = {
    planned: { label: tStatus("planned"), color: "hsl(var(--chart-2))" },
    executed: { label: tStatus("executed"), color: "hsl(var(--chart-1))" },
  };

  const chartConfigMembers = {
    student: { label: t("chart_labels.students"), color: "hsl(var(--chart-1))" },
    nonStudent: { label: t("chart_labels.non_students"), color: "hsl(var(--chart-4))" },
  };

  const getPeriodLabel = (filter: DateFilterValue) => {
    if (filter.rangeKey === 'custom' && filter.from) {
      const fromDate = new Date(filter.from);
      const toDate = filter.to ? new Date(filter.to) : fromDate;
      return tDateRanges('custom_display', {
        from: format.dateTime(fromDate, { month: 'short', day: 'numeric', year: 'numeric' }),
        to: format.dateTime(toDate, { month: 'short', day: 'numeric', year: 'numeric' })
      });
    }
    if (filter.rangeKey === 'specific_period' && filter.specificYear) {
      if (filter.specificMonth && filter.specificMonth !== 'all') {
        const date = new Date(Number.parseInt(filter.specificYear, 10), Number.parseInt(filter.specificMonth, 10));
        const monthName = format.dateTime(date, { month: 'long' });
        return tDateRanges('specific_period_display_month', { month: monthName, year: filter.specificYear });
      }
      return tDateRanges('specific_period_display_year', { year: filter.specificYear });
    }
    return tDateRanges(filter.rangeKey);
  };

  const periodLabel = getPeriodLabel(initialDateFilter);

  const handleDateFilterChange = (filter: DateFilterValue) => {
    const params = new URLSearchParams();
    params.set('rangeKey', filter.rangeKey);

    if (filter.rangeKey === 'custom' && filter.from) {
      params.set('from', filter.from);
      if (filter.to) {
        params.set('to', filter.to);
      }
    } else if (filter.rangeKey === 'specific_period' && filter.specificYear) {
      params.set('year', filter.specificYear);
      if (filter.specificMonth) {
        params.set('month', filter.specificMonth);
      }
    }

    router.push(`/dashboard?${params.toString()}`);
  };

  const handlePrintPage = () => {
    globalThis.print();
  };

  return (
    <>
      <PageHeader
        title={t('welcome', { name: userName })}
        description={
          <div className="flex flex-col gap-1">
            <span>{t('overview', { period: periodLabel })}</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {userRole === ROLES.NATIONAL_COORDINATOR && <Badge variant="secondary">Niveau National</Badge>}
              {(userRole !== ROLES.NATIONAL_COORDINATOR || siteName) && (
                <Badge variant="outline" className="bg-background">
                  <Building className="w-3 h-3 mr-1" />
                  {siteName || 'Site non assigné'}
                </Badge>
              )}
              {(userRole === ROLES.SMALL_GROUP_LEADER || smallGroupName) && (
                <Badge variant="outline" className="bg-background">
                  <UsersRound className="w-3 h-3 mr-1" />
                  {smallGroupName || 'Groupe non assigné'}
                </Badge>
              )}
            </div>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <DateRangeFilter onFilterChange={handleDateFilterChange} initialRangeKey={initialDateFilter.rangeKey} />
            <Button onClick={handlePrintPage} variant="outline" size="icon"><Printer className="h-4 w-4" /></Button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title={t('stats.total_activities')}
          value={initialStats.totalActivities}
          icon={Activity}
          description={t('stats.activities_desc', {
            executed: initialStats.executedActivities || 0,
            planned: initialStats.plannedActivities || 0
          })}
          href="/dashboard/activities"
        />
        <StatCard
          title={t('stats.total_members')}
          value={initialStats.totalMembers}
          icon={Users}
          description={t('stats.members_desc', {
            student: initialStats.studentMembers || 0,
            nonStudent: (initialStats.totalMembers || 0) - (initialStats.studentMembers || 0)
          })}
          href="/dashboard/members"
        />
        <StatCard
          title={t('stats.total_reports')}
          value={initialStats.totalReports}
          icon={FileText}
          description={t('stats.reports_desc')}
          href="/dashboard/reports/view"
        />
        {userRole !== ROLES.SMALL_GROUP_LEADER && (
          <StatCard
            title={t('stats.total_sites')}
            value={initialStats.totalSites}
            icon={Building}
            description={t('stats.sites_desc')}
            href="/dashboard/sites"
          />
        )}
        <StatCard
          title={t('stats.total_small_groups')}
          value={initialStats.totalSmallGroups}
          icon={UsersRound}
          description={t('stats.groups_desc')}
          href="/dashboard/small-groups"
        />
        {userRole === ROLES.NATIONAL_COORDINATOR && (
          <>
            <StatCard
              title={t('stats.central_reserve')}
              value={initialStats.centralReserve || 0}
              icon={Briefcase}
              className="border-primary/50 shadow-md"
              description={t('stats.reserve_desc', { amount: format.number(initialStats.centralReserve || 0, { style: 'currency', currency: 'USD' }) })}
              href="/dashboard/finances"
            />
            <StatCard
              title={t('stats.field_float')}
              value={initialStats.fieldFloat || 0}
              icon={Zap}
              description={t('stats.field_desc')}
              href="/dashboard/finances"
            />
          </>
        )}
        <StatCard
          title={userRole === ROLES.NATIONAL_COORDINATOR ? t('stats.net_balance') : t('stats.net_balance')}
          value={initialStats.netBalance}
          icon={DollarSign}
          description={t('stats.finance_desc', {
            income: initialStats.totalIncome || 0,
            expenses: initialStats.totalExpenses || 0
          })}
          href="/dashboard/finances"
        />
      </div>

      <OnboardingChecklist />

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="shadow-lg lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="text-primary" /> {t('charts.activity_status')}</CardTitle>
            <CardDescription>{t('charts.activity_status_desc')}</CardDescription>
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
                  {initialStats.activityStatusData.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="shadow-lg lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="text-primary" /> {t('charts.member_composition')}</CardTitle>
            <CardDescription>{t('charts.member_composition_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigMembers} className="min-h-[250px] w-full">
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Pie data={initialStats.memberTypeData} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label>
                  {initialStats.memberTypeData.map((entry) => (
                    <Cell key={entry.type} fill={entry.fill} />
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
            <CardTitle className="flex items-center gap-2"><Zap className="text-primary" /> {t('quick_actions.title')}</CardTitle>
            <CardDescription>{t('quick_actions.national_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/sites/new">
                <>
                  <Building className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">{t('quick_actions.add_site')}</p>
                    <p className="text-xs text-muted-foreground break-words">{t('quick_actions.add_site_desc')}</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/users/new">
                <>
                  <UsersRound className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">{t('quick_actions.invite_user')}</p>
                    <p className="text-xs text-muted-foreground break-words">{t('quick_actions.invite_user_desc')}</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/reports/submit">
                <>
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">{t('quick_actions.submit_report')}</p>
                    <p className="text-xs text-muted-foreground break-words">{t('quick_actions.submit_report_desc')}</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/suggestions">
                <>
                  <Lightbulb className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">{t('quick_actions.ai_suggestions')}</p>
                    <p className="text-xs text-muted-foreground break-words">{t('quick_actions.ai_suggestions_desc')}</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/finances/allocations/new">
                <>
                  <DollarSign className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">{t('quick_actions.send_funds')}</p>
                    <p className="text-xs text-muted-foreground break-words">{t('quick_actions.send_funds_desc')}</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/users">
                <>
                  <UsersRound className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">{t('quick_actions.manage_users')}</p>
                    <p className="text-xs text-muted-foreground break-words">{t('quick_actions.manage_users_desc')}</p>
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
            <CardTitle className="flex items-center gap-2"><Zap className="text-primary" /> {t('quick_actions.title')}</CardTitle>
            <CardDescription>{t('quick_actions.site_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/small-groups/new">
                <>
                  <UsersRound className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">{t('quick_actions.add_group')}</p>
                    <p className="text-xs text-muted-foreground break-words">{t('quick_actions.add_group_desc')}</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/reports/submit">
                <>
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">{t('quick_actions.submit_report')}</p>
                    <p className="text-xs text-muted-foreground break-words">{t('quick_actions.submit_report_desc')}</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/activities/new">
                <>
                  <Activity className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">{t('quick_actions.plan_activity')}</p>
                    <p className="text-xs text-muted-foreground break-words">{t('quick_actions.plan_activity_desc')}</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/finances/allocations/new">
                <>
                  <DollarSign className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">{t('quick_actions.send_funds')}</p>
                    <p className="text-xs text-muted-foreground break-words">{t('quick_actions.send_funds_desc')}</p>
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
            <CardTitle className="flex items-center gap-2"><Zap className="text-primary" /> {t('quick_actions.title')}</CardTitle>
            <CardDescription>{t('quick_actions.group_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/members/new">
                <>
                  <Users className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">{t('quick_actions.add_member')}</p>
                    <p className="text-xs text-muted-foreground break-words">{t('quick_actions.add_member_desc')}</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/reports/submit">
                <>
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">{t('quick_actions.submit_report')}</p>
                    <p className="text-xs text-muted-foreground break-words">{t('quick_actions.submit_report_desc')}</p>
                  </div>
                </>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full flex items-start justify-start p-3 h-auto text-left">
              <Link href="/dashboard/activities/new">
                <>
                  <Activity className="h-5 w-5 text-primary shrink-0" />
                  <div className="whitespace-normal ml-2">
                    <p className="font-semibold">{t('quick_actions.plan_activity')}</p>
                    <p className="text-xs text-muted-foreground break-words">{t('quick_actions.plan_activity_desc')}</p>
                  </div>
                </>
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
      <Card className="shadow-lg mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="text-primary" /> {t('recent_activities.title')}</CardTitle>
          <CardDescription>{t('recent_activities.description')}</CardDescription>
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
                  <p className="text-sm text-muted-foreground">{tLevel(activity.level as any)} - {new Date(activity.date).toLocaleDateString()}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${activity.status === 'executed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}`}>
                  {tStatus(activity.status as any)}
                </span>
              </div>
              <p className="text-sm mt-1">{activity.thematic}</p>
            </div>
          )) : (
            <p className="text-muted-foreground text-center py-4">{t('recent_activities.no_activities')}</p>
          )}
          <Button asChild variant="link" className="mt-2 px-0">
            <Link href="/dashboard/activities">{t('recent_activities.view_all')} →</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
