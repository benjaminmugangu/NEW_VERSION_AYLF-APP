import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface BasePeriod {
  start: Date;
  end: Date;
  label: string;
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
}

export async function getActivityStatsInPeriod(start: Date, end: Date, label?: string): Promise<PeriodStats> {
  const queryStart = new Date(start);
  const queryEnd = new Date(end);

  if (queryEnd.getHours() === 0 && queryEnd.getMinutes() === 0) {
    queryEnd.setHours(23, 59, 59, 999);
  }

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
        activitiesByType: {}, // Snapshots are aggregate, detailed type breakdown not stored yet
        specialActivities: [],
        participation: {
          total: data.totalParticipants || 0,
          boys: data.totalBoysCount || 0,
          girls: data.totalGirlsCount || 0,
          men: data.totalBoysCount || 0,
          women: data.totalGirlsCount || 0
        },
        activeSites: (data.sitePerformance || []).map((s: any) => s.siteName)
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

  // Aggregate Data
  const periodLabel = label || `Période du ${format(queryStart, 'dd/MM/yyyy')} au ${format(queryEnd, 'dd/MM/yyyy')}`;

  const stats: PeriodStats = {
    period: { start: queryStart, end: queryEnd, label: periodLabel },
    totalActivities: activities.length,
    activitiesByType: {},
    specialActivities: [],
    participation: { total: 0, boys: 0, girls: 0, men: 0, women: 0 },
    activeSites: [],
  };

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

  stats.activeSites = Array.from(siteSet).sort();
  return stats;
}

// Backward compatibility wrapper
export async function getMonthlyActivitySummary(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  const label = `${format(startDate, 'MMMM yyyy', { locale: fr })}`;
  // capitalize month
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

export function generateNarrative(stats: PeriodStats): ReportNarrative {
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
