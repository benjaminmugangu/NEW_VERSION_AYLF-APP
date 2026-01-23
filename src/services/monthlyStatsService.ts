'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ServiceResponse, ErrorCode } from '@/lib/types';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

export interface BasePeriod {
  start: Date;
  end: Date;
  label: string;
}

export interface FinancialStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  byCategory: Record<string, number>;
}

export interface SiteStats {
  id: string;
  name: string;
  activitiesCount: number;
  participantsCount: number;
  expenses: number;
  coordinatorName?: string;
}

export interface SmallGroupStats {
  id: string;
  name: string;
  leaderName: string;
  activitiesCount: number;
  averageAttendance: number;
}

export interface PeriodStats {
  period: BasePeriod;
  totalActivities: number;
  activitiesByType: Record<string, number>;
  specialActivities: Array<{ title: string; type: string; siteName: string; date: Date }>;
  participation: {
    total: number;
    boys: number;
    girls: number;
    men: number;
    women: number;
  };
  activeSites: string[];
  // New Fields
  financials: FinancialStats;
  sitePerformance: SiteStats[];
  smallGroupPerformance: SmallGroupStats[];
  metrics: {
    growthRate: number; // Member growth %
    retentionRate: number; // Attendance retention % (simulated or based on reports)
    conversionRate: number; // New members / Total participants %
  };
}

export async function getActivityStatsInPeriod(start: Date, end: Date, label?: string): Promise<ServiceResponse<PeriodStats>> {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

    const queryStart = new Date(start);
    const queryEnd = new Date(end);

    if (queryEnd.getHours() === 0 && queryEnd.getMinutes() === 0) {
      queryEnd.setHours(23, 59, 59, 999);
    }

    const result = await withRLS(user.id, async () => {
      // ANTI-MIRAGE: Check if this period is closed
      const closedPeriod = await prisma.accountingPeriod.findFirst({
        where: {
          status: 'closed',
          startDate: { equals: queryStart },
          endDate: { equals: queryEnd }
        }
      });

      if (closedPeriod && closedPeriod.snapshotData) {
        const data = closedPeriod.snapshotData as any;
        if (data.totalActivities !== undefined) {
          return {
            period: { start: queryStart, end: queryEnd, label: label || closedPeriod.id },
            totalActivities: data.totalActivities,
            activitiesByType: {},
            specialActivities: [],
            participation: {
              total: data.totalParticipants || 0,
              boys: data.totalBoysCount || 0,
              girls: data.totalGirlsCount || 0,
              men: data.totalBoysCount || 0,
              women: data.totalGirlsCount || 0
            },
            activeSites: (data.sitePerformance || []).map((s: any) => s.siteName),
            // Add missing fields for PeriodStats type compatibility
            financials: { totalIncome: 0, totalExpenses: 0, balance: 0, byCategory: {} },
            sitePerformance: [],
            smallGroupPerformance: [],
            metrics: { growthRate: 0, retentionRate: 0, conversionRate: 0 }
          };
        }
      }

      // Fetch Activities...
      const activities = await prisma.activity.findMany({
        where: {
          date: {
            gte: queryStart,
            lte: queryEnd,
          },
          status: { not: 'canceled' }
        },
        include: {
          activityType: true,
          site: true,
          reports: {
            select: {
              girlsCount: true,
              boysCount: true,
              participantsCountReported: true,
            }
          }
        }
      });

      // Fetch Financial Transactions
      const transactions = await prisma.financialTransaction.findMany({
        where: {
          date: { gte: queryStart, lte: queryEnd },
          status: 'approved'
        }
      });

      // Fetch Sites and Small Groups for specific metrics
      const sites = await prisma.site.findMany({
        include: { coordinator: true }
      });

      const smallGroups = await prisma.smallGroup.findMany({
        include: { leader: true }
      });

      // Fetch Member Growth in period
      const newMembersCount = await prisma.member.count({
        where: { createdAt: { gte: queryStart, lte: queryEnd } }
      });

      const totalMembersAtEnd = await prisma.member.count({
        where: { createdAt: { lte: queryEnd } }
      });

      // Aggregate Data
      const periodLabel = label || `Période du ${format(queryStart, 'dd/MM/yyyy')} au ${format(queryEnd, 'dd/MM/yyyy')}`;

      const stats: PeriodStats = {
        period: { start: queryStart, end: queryEnd, label: periodLabel },
        totalActivities: activities.length,
        activitiesByType: {},
        specialActivities: [],
        participation: { total: 0, boys: 0, girls: 0, men: 0, women: 0 },
        activeSites: [],
        financials: { totalIncome: 0, totalExpenses: 0, balance: 0, byCategory: {} },
        sitePerformance: [],
        smallGroupPerformance: [],
        metrics: { growthRate: 0, retentionRate: 0, conversionRate: 0 }
      };

      // Financial Aggregation
      for (const tx of transactions) {
        const amount = Number(tx.amount);
        if (tx.type === 'income') {
          stats.financials.totalIncome += amount;
        } else {
          stats.financials.totalExpenses += amount;
          stats.financials.byCategory[tx.category] = (stats.financials.byCategory[tx.category] || 0) + amount;
        }
      }
      stats.financials.balance = stats.financials.totalIncome - stats.financials.totalExpenses;

      // Activity & Site Performance Aggregation
      const sitePerformanceMap = new Map<string, SiteStats>();
      sites.forEach((s: any) => sitePerformanceMap.set(s.id, {
        id: s.id, name: s.name, activitiesCount: 0, participantsCount: 0, expenses: 0, coordinatorName: s.coordinator?.name
      }));

      const sgPerformanceMap = new Map<string, SmallGroupStats>();
      smallGroups.forEach((sg: any) => sgPerformanceMap.set(sg.id, {
        id: sg.id, name: sg.name, leaderName: sg.leader?.name || 'Inconnu', activitiesCount: 0, averageAttendance: 0
      }));

      const siteSet = new Set<string>();

      for (const activity of activities) {
        const typeName = activity.activityType?.name || 'Autre';
        stats.activitiesByType[typeName] = (stats.activitiesByType[typeName] || 0) + 1;

        if (activity.site?.name) {
          siteSet.add(activity.site.name);
        }

        let actParticipants = 0;
        let actGirls = 0;
        let actBoys = 0;

        if (activity.reports && activity.reports.length > 0) {
          const report = activity.reports[0];
          actParticipants = report.participantsCountReported || 0;
          actGirls = report.girlsCount || 0;
          actBoys = report.boysCount || 0;
        } else {
          actParticipants = activity.participantsCountPlanned || 0;
        }

        stats.participation.total += actParticipants;
        stats.participation.girls += actGirls;
        stats.participation.boys += actBoys;
        stats.participation.women += actGirls;
        stats.participation.men += actBoys;

        // Populate Site Metrics
        if (activity.siteId && sitePerformanceMap.has(activity.siteId)) {
          const s = sitePerformanceMap.get(activity.siteId)!;
          s.activitiesCount++;
          s.participantsCount += actParticipants;
        }

        // Populate SG Metrics
        if (activity.smallGroupId && sgPerformanceMap.has(activity.smallGroupId)) {
          const sg = sgPerformanceMap.get(activity.smallGroupId)!;
          sg.activitiesCount++;
          sg.averageAttendance += actParticipants; // Sum for now, divide later
        }

        const lowerTitle = activity.title.toLowerCase();
        const lowerType = typeName.toLowerCase();

        if (
          lowerType.includes('visite') ||
          lowerType.includes('social') ||
          lowerType.includes('apostolat') ||
          lowerTitle.includes('célébration') ||
          lowerTitle.includes('rencontre')
        ) {
          stats.specialActivities.push({
            title: activity.title,
            type: typeName,
            siteName: activity.site?.name || 'National',
            date: activity.date
          });
        }
      }

      // Finalize Stats
      stats.activeSites = Array.from(siteSet).sort();
      stats.sitePerformance = Array.from(sitePerformanceMap.values()).filter(s => s.activitiesCount > 0);
      stats.smallGroupPerformance = Array.from(sgPerformanceMap.values())
        .filter(sg => sg.activitiesCount > 0)
        .map(sg => ({ ...sg, averageAttendance: Math.round(sg.averageAttendance / sg.activitiesCount) }));

      // Map expenses to site performance
      for (const tx of transactions) {
        if (tx.type === 'expense' && tx.siteId && sitePerformanceMap.has(tx.siteId)) {
          sitePerformanceMap.get(tx.siteId)!.expenses += Number(tx.amount);
        }
      }

      // Calculate Metrics
      stats.metrics.growthRate = totalMembersAtEnd > 0 ? Math.round((newMembersCount / totalMembersAtEnd) * 100) : 0;
      stats.metrics.conversionRate = stats.participation.total > 0 ? Math.round((newMembersCount / stats.participation.total) * 100) : 0;
      // Retention: Simple heuristic based on activity regularity across sites
      const siteAvgCompletion = stats.sitePerformance.length > 0
        ? stats.sitePerformance.reduce((acc, s) => acc + s.activitiesCount, 0) / sites.length
        : 0;
      stats.metrics.retentionRate = Math.min(100, Math.round(siteAvgCompletion * 25)); // Arbitrary logic for this MVP version

      return stats;
    });

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
  }
}

// Backward compatibility wrapper
export async function getMonthlyActivitySummary(month: number, year: number): Promise<ServiceResponse<PeriodStats>> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  const label = `${format(startDate, 'MMMM yyyy', { locale: fr })}`;
  const capLabel = label.charAt(0).toUpperCase() + label.slice(1);

  return await getActivityStatsInPeriod(startDate, endDate, capLabel);
}

export interface ReportNarrative {
  intro: string;
  generalSummary: string[];
  participation: string;
  activeSites: string;
  conclusion: string;
}

export async function generateNarrative(stats: PeriodStats): Promise<ReportNarrative> {
  const { label } = stats.period;

  // 1. Introduction
  const intro = `Chers Coordonnateurs,

Nous tenons à vous adresser nos salutations les plus cordiales et espérons que vous vous portez bien.

Nous souhaitons exprimer notre sincère gratitude pour votre engagement constant et votre présence active sur le terrain. Grâce à vos efforts dévoués, la période "${label}" s'est achevée sur une dynamique particulièrement encourageante à travers l'ensemble de nos sites.`;

  // 2. General Summary Bullets
  const bullets: string[] = [];

  if (stats.totalActivities === 0) {
    bullets.push(`Aucune activité n’a été enregistrée pour cette période.`);
  } else {
    bullets.push(`Durant cette période (${label}), un total de ${stats.totalActivities} activités a été mené sur l’ensemble du territoire, témoignant de la diversité et de l’impact croissant de notre travail.`);

    Object.entries(stats.activitiesByType).forEach(([type, count]) => {
      bullets.push(`${count} ${type} ont été organisées.`);
    });

    if (stats.specialActivities.length > 0) {
      const specialByType: Record<string, string[]> = {};
      stats.specialActivities.forEach(act => {
        if (!specialByType[act.type]) specialByType[act.type] = [];
        specialByType[act.type].push(`${act.siteName}`);
      });

      Object.entries(specialByType).forEach(([type, sites]) => {
        const distinctSites = Array.from(new Set(sites)).join(', ');
        bullets.push(`${sites.length} ${type} ont eu lieu, menées notamment par les équipes de ${distinctSites}.`);
      });
    }
  }

  // 3. Participation Narrative
  let participation = "";
  if (stats.participation.total === 0) {
    participation = "Aucune participation enregistrée pour cette période.";
  } else {
    participation = `Les activités de la période ont mobilisé un total de ${stats.participation.total} participants, répartis comme suit :
* ${stats.participation.men} hommes
* ${stats.participation.women} femmes`;
  }

  // 4. Active Sites Narrative
  let activeSites = "";
  if (stats.activeSites.length === 0) {
    activeSites = "Aucun site actif sur cette période.";
  } else {
    activeSites = `Ces initiatives ont été organisées avec succès dans les sites suivants :
${stats.activeSites.map(s => `* ${s}`).join('\n')}`;
  }

  // 5. Conclusion
  const conclusion = `Ensemble, nous poursuivons notre mission fondamentale de construire des leaders dotés d'un cœur de service.

Bonne continuité à toutes et à tous !`;

  return {
    intro,
    generalSummary: bullets,
    participation,
    activeSites,
    conclusion
  };
}
