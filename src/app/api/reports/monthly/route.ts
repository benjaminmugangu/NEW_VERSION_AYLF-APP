import { NextRequest, NextResponse } from 'next/server';
import { getMonthlyActivitySummary, generateNarrative } from '@/services/monthlyStatsService';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const month = parseInt(searchParams.get('month') || '');
        const year = parseInt(searchParams.get('year') || '');

        if (isNaN(month) || isNaN(year)) {
            return NextResponse.json({ error: 'Month and Year required' }, { status: 400 });
        }

        // 1. Get raw stats
        const stats = await getMonthlyActivitySummary(month, year);

        // 2. Generate narrative draft
        const narrative = generateNarrative(stats);

        return NextResponse.json({ stats, narrative });
    } catch (error: any) {
        console.error('Error generating monthly report:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
