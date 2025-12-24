import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import analyticsService from '@/services/analyticsService';
import { withApiRLS } from '@/lib/apiWrapper';

export const GET = withApiRLS(async (request: NextRequest) => {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
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

    // Construct User object for analytics service
    const userForAnalytics = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      siteId: profile.siteId,
      smallGroupId: profile.smallGroupId,
    };

    const analytics = await analyticsService.getAdvancedDashboard(userForAnalytics, timeRange);

    return NextResponse.json(analytics);
  } catch (error: any) {
    const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
    logError('FETCH_ANALYTICS', error);
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
});
