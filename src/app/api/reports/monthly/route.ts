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
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
            }
            stats = await getActivityStatsInPeriod(startDate, endDate);
        }
        // Mode 2: Legacy Monthly Reports
        else if (month && year) {
            const m = Number.parseInt(month);
            const y = Number.parseInt(year);
            if (isNaN(m) || isNaN(y)) {
                return NextResponse.json({ error: 'Month and Year required' }, { status: 400 });
            }
            stats = await getMonthlyActivitySummary(m, y);
        }
        else {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // 2. Generate narrative draft
        const narrative = generateNarrative(stats);

        return NextResponse.json({ stats, narrative });
    } catch (error: any) {
        console.error('Error generating monthly report:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});
