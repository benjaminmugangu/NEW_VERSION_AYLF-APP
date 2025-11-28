import { NextResponse } from 'next/server';
import { updateActivityStatuses } from '@/services/activityService';

export async function GET(request: Request) {
    try {
        // Security: Verify the cron secret to prevent unauthorized access
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Execute the status update logic
        const result = await updateActivityStatuses();

        return NextResponse.json({
            success: true,
            message: 'Activity statuses updated successfully',
            stats: result,
        });
    } catch (error) {
        console.error('Error updating activity statuses:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
