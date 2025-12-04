import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import { MESSAGES } from '@/lib/messages';

export async function GET(request: NextRequest) {
    try {
        const { getUser, isAuthenticated } = getKindeServerSession();
        const isAuth = await isAuthenticated();

        if (!isAuth) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

        // Check if user is National Coordinator
        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { role: true }
        });

        if (profile?.role !== 'national_coordinator') {
            return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;
        const entityType = searchParams.get('entityType') || undefined;
        const actorId = searchParams.get('actorId') || undefined;
        const from = searchParams.get('from') || undefined;
        const to = searchParams.get('to') || undefined;
        const limit = parseInt(searchParams.get('limit') || '100', 10);

        const where: any = {};

        if (entityType) {
            where.entityType = entityType;
        }

        if (actorId) {
            where.actorId = actorId;
        }

        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to);
        }

        const logs = await prisma.auditLog.findMany({
            where,
            include: {
                actor: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
        });

        return NextResponse.json(logs);
    } catch (error: any) {
        console.error('Error fetching audit logs:', error);
        return NextResponse.json(
            { error: error.message || MESSAGES.errors.generic },
            { status: 500 }
        );
    }
}
