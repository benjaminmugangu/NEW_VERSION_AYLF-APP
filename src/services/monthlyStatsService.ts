import { prisma } from '@/lib/prisma';
import { ActivityLevel } from '@prisma/client';

export interface MonthlyStats {
  period: { month: number; year: number; monthName: string };
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

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export async function getMonthlyActivitySummary(month: number, year: number): Promise<MonthlyStats> {
  // 1. Calculate Date Range
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

  // 2. Fetch Activities in Range
  const activities = await prisma.activity.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: { not: 'canceled' } // Exclude canceled
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

  // 3. Aggregate Data
  const stats: MonthlyStats = {
    period: { month, year, monthName: MONTH_NAMES[month - 1] },
    totalActivities: activities.length,
    activitiesByType: {},
    specialActivities: [],
    participation: { total: 0, boys: 0, girls: 0, men: 0, women: 0 },
    activeSites: [],
  };

  const siteSet = new Set<string>();

  for (const activity of activities) {
    // Counts by Type
    const typeName = activity.activityType?.name || 'Autre';
    stats.activitiesByType[typeName] = (stats.activitiesByType[typeName] || 0) + 1;

    // Active Sites
    if (activity.site?.name) {
      siteSet.add(activity.site.name);
    }

    // Participation Stats (from linked reports if available, or estimated from activity)
    // Note: Reports give verified numbers. If multiple reports for one activity, sum them? 
    // Usually 1 report per activity.
    let actParticipants = 0;
    let actGirls = 0;
    let actBoys = 0;

    if (activity.reports && activity.reports.length > 0) {
      // Take the most recent approved or submitted report numbers
      const report = activity.reports[0]; // Simplified: take first
      actParticipants = report.participantsCountReported || 0;
      actGirls = report.girlsCount || 0;
      actBoys = report.boysCount || 0;
    } else {
      // Fallback to planned count if no report? NO, reports confirm attendance. 
      // For "Realized Activities" report, maybe only count those with reports?
      // The user prompt says "Bilan des activités... réalisées", implies they happened.
      // We keep activity count based on Activity table, but stats from Reports.
      actParticipants = activity.participantsCountPlanned || 0; // Fallback or 0
    }

    stats.participation.total += actParticipants;
    stats.participation.girls += actGirls;
    stats.participation.boys += actBoys;
    // Assuming boys/girls maps to Men/Women contextually or just tracked as such
    stats.participation.women += actGirls;
    stats.participation.men += actBoys;

    // Special Activities Detection for Narrative
    // Heuristic: specific keywords or types that are "special"
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

export interface ReportNarrative {
  intro: string;
  generalSummary: string[];
  participation: string;
  activeSites: string;
  conclusion: string;
}

export function generateNarrative(stats: MonthlyStats): ReportNarrative {
  const { monthName, year } = stats.period;

  // 1. Introduction
  const intro = `Chers Coordonnateurs,

Nous tenons à vous adresser nos salutations les plus cordiales en ce mois de ${monthName} ${year} et espérons que vous vous portez bien.

Nous souhaitons exprimer notre sincère gratitude pour votre engagement constant et votre présence active sur le terrain. Grâce à vos efforts dévoués, le mois de ${monthName} s'est achevé sur une dynamique particulièrement encourageante à travers l'ensemble de nos sites.`;

  // 2. General Summary Bullets
  const bullets: string[] = [];

  if (stats.totalActivities === 0) {
    bullets.push(`Aucune activité n’a été enregistrée pour ce mois.`);
  } else {
    bullets.push(`Durant le mois de ${monthName} ${year}, un total de ${stats.totalActivities} activités a été mené sur l’ensemble du territoire, témoignant de la diversité et de l’impact croissant de notre travail.`);

    // Type breakdown
    Object.entries(stats.activitiesByType).forEach(([type, count]) => {
      bullets.push(`${count} ${type} ont été organisées.`);
    });

    // Special activities narrative
    if (stats.specialActivities.length > 0) {
      // Group special activities by type to avoid listing every single one individually if too many
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
    participation = `Les activités du mois de ${monthName} ont mobilisé un total de ${stats.participation.total} participants, répartis comme suit :
* ${stats.participation.men} hommes
* ${stats.participation.women} femmes`;
  }

  // 4. Active Sites Narrative
  let activeSites = "";
  if (stats.activeSites.length === 0) {
    activeSites = "Aucun site actif ce mois-ci.";
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
