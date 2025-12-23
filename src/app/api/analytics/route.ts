import { NextRequest, NextResponse } from ' next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import analyticsService from '@/services/analyticsService';
import { withApiRLS } from '@/lib/apiWrapper';

export const GET = withApiRLS(async (request: NextRequest) => {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        role: true,
        siteId: true,
        smallGroupId: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = (searchParams.get('timeRange') as 'month' | 'quarter' | 'year') || 'month';

    const analytics = await analyticsService.getAnalytics(profile, timeRange);

    return NextResponse.json(analytics);
  } catch (error: any) {
    const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
    logError('FETCH_ANALYTICS', error);
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
});
