'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
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
    students: number;
    nonStudents: number;
  };
  activeSites: string[];
  financials: FinancialStats & {
    allocationsReceived: number;
    reportedExpenses: number;
    accountedExpenses: number;
  };
  sitePerformance: SiteStats[];
  smallGroupPerformance: SmallGroupStats[];
  metrics: {
    growthRate: number;
    retentionRate: number;
    conversionRate: number;
    reportingRate: number;
    avgSubmissionDelay: number; // in days
    avgReviewDelay: number;      // in days
    qualityScore: number;       // % of reports with evidence
  };
  trends?: {
    incomeDelta: number;
    expenseDelta: number;
    activityDelta: number;
    participationDelta: number;
  };
  inventory?: {
    movementsIn: number;
    movementsOut: number;
    totalQuantityIn: number;
    totalQuantityOut: number;
    topMovedItems: Array<{ name: string; quantity: number; direction: 'in' | 'out' }>;
  };
  organizational?: {
    totalMembers: number;
    newMembers: number;
    sitesCount: number;
    smallGroupsCount: number;
    coordinatorsCount: number;
  };
  reporting?: {
    pending: number;
    approved: number;
    rejected: number;
    missing: number;
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
            financials: {
              totalIncome: 0, totalExpenses: 0, balance: 0, byCategory: {},
              allocationsReceived: 0, reportedExpenses: 0, accountedExpenses: 0
            },
            sitePerformance: [],
            smallGroupPerformance: [],
            metrics: {
              growthRate: 0, retentionRate: 0, conversionRate: 0,
              reportingRate: 0, avgSubmissionDelay: 0, avgReviewDelay: 0
            }
          };
        }
      }

      // Fetch Activities...
      const activities = await prisma.activity.findMany({
        where: {
          date: { gte: queryStart, lte: queryEnd },
          status: { not: 'canceled' }
        },
        include: {
          activityType: true,
          site: true,
          reports: {
            include: { submittedBy: true }
          }
        }
      });

      // Fetch Financial Transactions
      const transactions = await prisma.financialTransaction.findMany({
        where: {
          OR: [
            { date: { gte: queryStart, lte: queryEnd } },
            { createdAt: { gte: queryStart, lte: queryEnd } }
          ],
          status: 'approved'
        }
      });

      // Fetch Fund Allocations (Incomes for sites)
      const allocations = await prisma.fundAllocation.findMany({
        where: {
          allocationDate: { gte: queryStart, lte: queryEnd },
          status: 'completed'
        }
      });

      // Fetch all reports in period
      const reportsInPeriod = await prisma.report.findMany({
        where: {
          activityDate: { gte: queryStart, lte: queryEnd },
          status: 'approved'
        }
      });

      // Fetch Sites, Groups and Coordinators
      const sitesCount = await prisma.site.count();
      const groupsCount = await prisma.smallGroup.count();
      const coordinatorsCount = await prisma.profile.count({ where: { role: 'SITE_COORDINATOR' } });

      const sites = await prisma.site.findMany({ include: { coordinator: true } });
      const smallGroups = await prisma.smallGroup.findMany({ include: { leader: true } });

      // Member Statistics
      const totalMembersAtEnd = await prisma.member.count({ where: { createdAt: { lte: queryEnd } } });
      const newMembers = await prisma.member.findMany({
        where: { createdAt: { gte: queryStart, lte: queryEnd } }
      });

      const memberTypeCounts = await prisma.member.groupBy({
        by: ['type'],
        _count: true,
        where: { createdAt: { lte: queryEnd } }
      });

      // Fetch Inventory Movements
      const inventoryMovements = await prisma.inventoryMovement.findMany({
        where: {
          date: { gte: queryStart, lte: queryEnd }
        },
        include: {
          item: true
        }
      });

      // Aggregate Data
      const periodLabel = label || `Période du ${format(queryStart, 'dd/MM/yyyy')} au ${format(queryEnd, 'dd/MM/yyyy')}`;

      const stats: PeriodStats = {
        period: { start: queryStart, end: queryEnd, label: periodLabel },
        totalActivities: activities.length,
        activitiesByType: {},
        specialActivities: [],
        participation: {
          total: 0, boys: 0, girls: 0, men: 0, women: 0,
          students: 0, nonStudents: 0
        },
        activeSites: [],
        financials: {
          totalIncome: 0, totalExpenses: 0, balance: 0, byCategory: {},
          allocationsReceived: 0, reportedExpenses: 0, accountedExpenses: 0
        },
        sitePerformance: [],
        smallGroupPerformance: [],
        metrics: {
          growthRate: 0, retentionRate: 0, conversionRate: 0,
          reportingRate: 0, avgSubmissionDelay: 0, avgReviewDelay: 0,
          qualityScore: 0
        },
        inventory: {
          movementsIn: 0, movementsOut: 0,
          totalQuantityIn: 0, totalQuantityOut: 0,
          topMovedItems: []
        },
        organizational: {
          totalMembers: totalMembersAtEnd,
          newMembers: newMembers.length,
          sitesCount,
          smallGroupsCount: groupsCount,
          coordinatorsCount
        },
        reporting: { pending: 0, approved: 0, rejected: 0, missing: 0 }
      };

      // 0. Inventory Aggregation (Audit Royal)
      const itemMovements = new Map<string, { name: string, quantity: number, direction: 'in' | 'out' }>();

      for (const m of inventoryMovements) {
        const qty = Number(m.quantity);
        if (m.direction === 'in') {
          stats.inventory!.movementsIn++;
          stats.inventory!.totalQuantityIn += qty;
        } else {
          stats.inventory!.movementsOut++;
          stats.inventory!.totalQuantityOut += qty;
        }

        const key = `${m.itemId}-${m.direction}`;
        if (!itemMovements.has(key)) {
          itemMovements.set(key, { name: m.item?.name || 'Inconnu', quantity: 0, direction: m.direction });
        }
        itemMovements.get(key)!.quantity += qty;
      }

      stats.inventory!.topMovedItems = Array.from(itemMovements.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);


      // 1. Financial Aggregation (Traceability 360)
      for (const tx of transactions) {
        const amount = Number(tx.amount);
        if (tx.type === 'income') {
          stats.financials.totalIncome += amount;
        } else {
          stats.financials.totalExpenses += amount;
          stats.financials.accountedExpenses += amount;
          stats.financials.byCategory[tx.category] = (stats.financials.byCategory[tx.category] || 0) + amount;
        }
      }

      for (const allocation of allocations) {
        const amount = Number(allocation.amount);
        stats.financials.totalIncome += amount;
        stats.financials.allocationsReceived += amount;
      }

      for (const report of reportsInPeriod) {
        stats.financials.reportedExpenses += Number(report.totalExpenses || 0);
      }

      stats.financials.balance = stats.financials.totalIncome - stats.financials.totalExpenses;

      // 2. Activity & Performance Aggregation
      const sitePerformanceMap = new Map<string, SiteStats>();
      sites.forEach((s: any) => sitePerformanceMap.set(s.id, {
        id: s.id, name: s.name, activitiesCount: 0, participantsCount: 0, expenses: 0, coordinatorName: s.coordinator?.name
      }));

      const sgPerformanceMap = new Map<string, SmallGroupStats>();
      smallGroups.forEach((sg: any) => sgPerformanceMap.set(sg.id, {
        id: sg.id, name: sg.name, leaderName: sg.leader?.name || 'Inconnu', activitiesCount: 0, averageAttendance: 0
      }));

      const siteSet = new Set<string>();
      let totalSubmissionDelay = 0;
      let totalReviewDelay = 0;
      let reportsCount = 0;
      let reviewsCount = 0;

      for (const activity of activities) {
        const typeName = activity.activityType?.name || 'Autre';
        stats.activitiesByType[typeName] = (stats.activitiesByType[typeName] || 0) + 1;

        if (activity.site?.name) {
          siteSet.add(activity.site.name);
        }

        let actParticipants = 0;
        let actGirls = 0;
        let actBoys = 0;

        if (activity.reports) {
          const report = activity.reports;
          actParticipants = report.participantsCountReported || 0;
          actGirls = report.girlsCount || 0;
          actBoys = report.boysCount || 0;

          // Quality Audit (Audit Royal)
          const hasImages = report.images && Array.isArray(report.images) && report.images.length > 0;
          const hasAttachments = report.attachments && Array.isArray(report.attachments) && report.attachments.length > 0;
          if (hasImages || hasAttachments) stats.metrics.qualityScore++;

          if (report.status === 'approved') stats.reporting!.approved++;
          else if (report.status === 'rejected') stats.reporting!.rejected++;
          else stats.reporting!.pending++;

          reportsCount++;

          // Delays
          const submissionDelay = Math.max(0, (report.submissionDate.getTime() - activity.date.getTime()) / (1000 * 60 * 60 * 24));
          totalSubmissionDelay += submissionDelay;

          if (report.reviewedAt) {
            const reviewDelay = Math.max(0, (report.reviewedAt.getTime() - report.submissionDate.getTime()) / (1000 * 60 * 60 * 24));
            totalReviewDelay += reviewDelay;
            reviewsCount++;
          }
        } else {
          actParticipants = activity.participantsCountPlanned || 0;
          if (activity.status === 'executed' || activity.date < new Date()) {
            stats.reporting!.missing++;
          } else {
            stats.reporting!.pending++;
          }
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
          sg.averageAttendance += actParticipants;
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

      // 3. Finalize Stats
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

      // Member Breakdown
      memberTypeCounts.forEach((m: any) => {
        if (m.type === 'student') stats.participation.students = m._count;
        if (m.type === 'non_student') stats.participation.nonStudents = m._count;
      });

      // 4. Calculate Metrics
      stats.metrics.growthRate = totalMembersAtEnd > 0 ? Math.round((newMembers.length / totalMembersAtEnd) * 100) : 0;
      stats.metrics.conversionRate = stats.participation.total > 0 ? Math.round((newMembers.length / stats.participation.total) * 100) : 0;
      stats.metrics.reportingRate = activities.length > 0 ? Math.round((reportsCount / activities.length) * 100) : 0;
      stats.metrics.avgSubmissionDelay = reportsCount > 0 ? Math.round(totalSubmissionDelay / reportsCount) : 0;
      stats.metrics.avgReviewDelay = reviewsCount > 0 ? Math.round(totalReviewDelay / reviewsCount) : 0;

      stats.metrics.qualityScore = reportsCount > 0 ? Math.round((stats.metrics.qualityScore / reportsCount) * 100) : 0;

      const siteAvgCompletion = stats.sitePerformance.length > 0
        ? stats.sitePerformance.reduce((acc, s) => acc + s.activitiesCount, 0) / sites.length
        : 0;
      stats.metrics.retentionRate = Math.min(100, Math.round(siteAvgCompletion * 25));

      // 5. Trend Analysis (Audit Royal) - Recursive check to avoid loop
      const isTrendCalculation = (label === 'PREVIOUS_PERIOD_INTERNAL');
      if (!isTrendCalculation) {
        const prevStart = subMonths(queryStart, 1);
        const prevEnd = endOfMonth(prevStart);
        
        // We bypass RLS wrapper here to avoid nesting, but the second call will respect it
        const prevStatsResult = await getActivityStatsInPeriod(prevStart, prevEnd, 'PREVIOUS_PERIOD_INTERNAL');
        
        if (prevStatsResult.success && prevStatsResult.data) {
          const prev = prevStatsResult.data;
          stats.trends = {
            incomeDelta: prev.financials.totalIncome > 0 ? Math.round(((stats.financials.totalIncome - prev.financials.totalIncome) / prev.financials.totalIncome) * 100) : 0,
            expenseDelta: prev.financials.totalExpenses > 0 ? Math.round(((stats.financials.totalExpenses - prev.financials.totalExpenses) / prev.financials.totalExpenses) * 100) : 0,
            activityDelta: prev.totalActivities > 0 ? Math.round(((stats.totalActivities - prev.totalActivities) / prev.totalActivities) * 100) : 0,
            participationDelta: prev.participation.total > 0 ? Math.round(((stats.participation.total - prev.participation.total) / prev.participation.total) * 100) : 0
          };
        }
      }

      return stats;
    });

    return { success: true, data: result as PeriodStats };
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
  const { trends, financials, metrics, inventory } = stats;

  // 1. Introduction
  const intro = `Chers Coordonnateurs,
  
Nous souhaitons vous adresser nos salutations les plus cordiales. La période "${label}" vient de s'achever, et l'Audit Royal de performance a été effectué sur l'ensemble de vos activités. Ce rapport offre une vision à 360° pour guider nos décisions stratégiques.`;

  // 2. Strategic Summary Bullets
  const bullets: string[] = [];

  if (stats.totalActivities === 0) {
    bullets.push(`🚨 ALERTE CRITIQUE : Aucune activité enregistrée sur la période. Un audit de terrain est requis pour comprendre cet arrêt de production.`);
  } else {
    // Activities & Trends
    const actTrend = trends?.activityDelta ?? 0;
    const actTrendText = actTrend >= 0 ? `une progression de +${actTrend}%` : `une baisse de ${actTrend}%`;
    bullets.push(`Activité : ${stats.totalActivities} initiatives menées (${actTrendText} par rapport au mois précédent).`);

    // Financial Strategy
    const expTrend = trends?.expenseDelta ?? 0;
    const incTrend = trends?.incomeDelta ?? 0;
    bullets.push(`Finance : Le volume de revenus a évolué de ${incTrend >= 0 ? '+' : ''}${incTrend}%, tandis que les dépenses ont varié de ${expTrend >= 0 ? '+' : ''}${expTrend}%.`);
    
    if (financials.reportedExpenses > financials.accountedExpenses * 1.2) {
      bullets.push(`⚠️ ATTENTION : Les dépenses déclarées (${financials.reportedExpenses} USD) dépassent largement les transactions validées (${financials.accountedExpenses} USD). Une réconciliation comptable urgente est nécessaire.`);
    }

    // Reporting Quality & Proof
    bullets.push(`Reporting : Taux de complétion à ${metrics.reportingRate}%. Le score de qualité (preuves/photos) s'élève à ${metrics.qualityScore}%, ce qui est ${metrics.qualityScore < 70 ? 'insuffisant pour garantir la traçabilité totale' : 'satisfaisant'}.`);

    if (metrics.avgSubmissionDelay > 5) {
      bullets.push(`⏱️ RETARD : Le délai moyen de soumission est de ${metrics.avgSubmissionDelay} jours. Pour une gestion agile, ce délai doit être réduit à moins de 48h.`);
    }

    // Inventory & Assets
    if (inventory && (inventory.movementsIn > 0 || inventory.movementsOut > 0)) {
      bullets.push(`Patrimoine : ${inventory.movementsIn + inventory.movementsOut} mouvements d'inventaire enregistrés. Total entrées : ${inventory.totalQuantityIn} unités.`);
    }

    // Site Alerts
    const criticalSites = stats.sitePerformance.filter(s => s.activitiesCount < 2);
    if (criticalSites.length > 0) {
      bullets.push(`🏁 SITES CRITIQUES : ${criticalSites.map(s => s.name).join(', ')} affichent un volume d'activité trop faible pour la période.`);
    }
  }

  // 3. Participation & Growth
  const partTrend = trends?.participationDelta ?? 0;
  const participation = `Performance Sociale :
- Total participants : ${stats.participation.total} personnes (${partTrend >= 0 ? '+' : ''}${partTrend}% de tendance).
- Structure : ${stats.participation.men} hommes / ${stats.participation.women} femmes.
- Conversion : ${metrics.conversionRate}% des participants se sont enregistrés comme membres officiels.`;

  // 4. Site Performance Rankings
  const topSite = stats.sitePerformance.sort((a,b) => b.activitiesCount - a.activitiesCount)[0];
  const activeSites = stats.activeSites.length === 0 
    ? "Aucun site opérationnel." 
    : `Déploiement National :
- ${stats.activeSites.length} sites opérationnels.
- Champion de la période : Site de ${topSite?.name || 'Inconnu'} avec ${topSite?.activitiesCount || 0} activités.`;

  // 5. Strategic Conclusion
  const conclusion = `L'analyse Royal indique que l'organisation est dans une phase de ${trends?.activityDelta ?? 0 >= 0 ? 'croissance' : 'consolidation'}. Nous recommandons de focus sur ${metrics.qualityScore < 80 ? 'la collecte de preuves visuelles' : 'le respect des délais administratifs'} pour le mois prochain.

Leadership de Coeur et de Service.`;

  return {
    intro,
    generalSummary: bullets,
    participation,
    activeSites,
    conclusion
  };
}
