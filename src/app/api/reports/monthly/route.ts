import { NextRequest, NextResponse } from 'next/server';
import { getMonthlyActivitySummary, getActivityStatsInPeriod, generateNarrative } from '@/services/monthlyStatsService';
import { withApiRLS } from '@/lib/apiWrapper';

export const GET = withApiRLS(async (req: NextRequest) => {
    try {
        const { searchParams } = new URL(req.url);
        const month = searchParams.get('month');
        const year = searchParams.get('year');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        let stats;

        // Mode 1: Dynamic Date Range
        if (from && to) {
            const startDate = new Date(from);
            const endDate = new Date(to);
            if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
                return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
            }
            stats = await getActivityStatsInPeriod(startDate, endDate);
        }
        // Mode 2: Legacy Monthly Reports
        else if (month && year) {
            const m = Number.parseInt(month);
            const y = Number.parseInt(year);
            if (Number.isNaN(m) || Number.isNaN(y)) {
                return NextResponse.json({ error: 'Month and Year required' }, { status: 400 });
            }
            stats = await getMonthlyActivitySummary(m, y);
        }
        else {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        if (!stats.success || !stats.data) {
            return NextResponse.json({ error: stats.error?.message || 'Failed to fetch stats' }, { status: 400 });
        }

        // 2. Generate narrative draft
        const narrative = await generateNarrative(stats.data);

        return NextResponse.json({ stats: stats.data, narrative });
    } catch (error: any) {
        console.error('Error generating monthly report:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});
