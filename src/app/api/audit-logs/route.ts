import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import { Prisma, AuditEntityType } from '@prisma/client';
import { MESSAGES } from '@/lib/messages';
import { withApiRLS } from '@/lib/apiWrapper';

export const GET = withApiRLS(async (request: NextRequest) => {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();

        if (!user?.id) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

        // Check if user is National Coordinator
        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { role: true }
        });

        if (profile?.role !== 'NATIONAL_COORDINATOR') {
            return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;
        const entityType = searchParams.get('entityType') as AuditEntityType | undefined;
        const actorId = searchParams.get('actorId') || undefined;
        const from = searchParams.get('from') || undefined;
        const to = searchParams.get('to') || undefined;
        const limit = Number.parseInt(searchParams.get('limit') || '100', 10);

        const where: Prisma.AuditLogWhereInput = {};

        if (entityType && Object.values(AuditEntityType).includes(entityType)) {
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
        const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
        logError('FETCH_AUDIT_LOGS', error);
        return NextResponse.json(
            { error: sanitizeError(error) },
            { status: 500 }
        );
    }
});
