import { NextResponse } from 'next/server';
import { updateActivityStatuses } from '@/services/activityService';
import { MESSAGES } from '@/lib/messages';

export async function GET(request: Request) {
    try {
        // Security: Verify the cron secret to prevent unauthorized access
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

        // Execute the status update logic
        const result = await updateActivityStatuses();

        return NextResponse.json({
            success: true,
            message: 'Activity statuses updated successfully',
            stats: result,
        });
    } catch (error) {
        console.error('[CRON_UPDATE_ACTIVITIES_ERROR]', {
            type: error?.constructor?.name
        });
        return NextResponse.json(
            { error: MESSAGES.errors.serverError },
            { status: 500 }
        );
    }
}
