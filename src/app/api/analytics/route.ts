import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import analyticsService from '@/services/analyticsService';
import { MESSAGES } from '@/lib/messages';

/**
 * GET /api/analytics
 * Get advanced analytics for the authenticated user
 * Query params:
 *   - timeRange: 'month' | 'quarter' | 'year' (default 'month')
 */
export async function GET(request: NextRequest) {
  try {
    const { getUser, isAuthenticated } = getKindeServerSession();
    const isAuth = await isAuthenticated();

    if (!isAuth) {
      return NextResponse.json(
        { error: MESSAGES.errors.unauthorized },
        { status: 401 }
      );
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: MESSAGES.errors.unauthorized },
        { status: 401 }
      );
    }

    // Get user profile
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
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeRange = (searchParams.get('timeRange') || 'month') as 'month' | 'quarter' | 'year';

    const analytics = await analyticsService.getAdvancedDashboard(
      {
        id: profile.id,
        role: profile.role as any,
        siteId: profile.siteId,
        smallGroupId: profile.smallGroupId,
      } as any,
      timeRange
    );

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: MESSAGES.errors.serverError },
      { status: 500 }
    );
  }
}
