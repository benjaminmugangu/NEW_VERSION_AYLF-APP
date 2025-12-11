import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { MESSAGES } from '@/lib/messages';

export async function GET(request: Request) {
    try {
        const { isAuthenticated, getUser } = getKindeServerSession();
        const isAuth = await isAuthenticated();

        if (!isAuth) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

        const currentUser = await prisma.profile.findUnique({
            where: { id: user.id },
        });

        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Parse query params
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const siteId = searchParams.get('siteId');
        const smallGroupId = searchParams.get('smallGroupId'); // Added smallGroupId param

        // Build where clause with proper typing
        const where: Prisma.FinancialTransactionWhereInput = {};
        if (siteId) where.siteId = siteId;
        if (smallGroupId) where.smallGroupId = smallGroupId;

        if (startDate) {
            where.date = { ...where.date as Prisma.DateTimeFilter, gte: new Date(startDate) };
        }
        if (endDate) {
            where.date = { ...where.date as Prisma.DateTimeFilter, lte: new Date(endDate) };
        }

        // RBAC for filtering
        if (currentUser.role === 'national_coordinator') {
            if (siteId) where.siteId = siteId;
        } else if (currentUser.role === 'site_coordinator') {
            where.siteId = currentUser.siteId;
        } else {
            // Other roles can only see their own recorded transactions or small group
            where.OR = [
                { recordedById: user.id },
                { smallGroupId: currentUser.smallGroupId }
            ];
        }

        const transactions = await prisma.financialTransaction.findMany({
            where,
            include: {
                site: { select: { name: true } },
                smallGroup: { select: { name: true } },
                recordedBy: { select: { name: true } },
            },
            orderBy: { date: 'desc' },
        });

        // Generate CSV
        const csvRows = [
            ['Date', 'Description', 'Amount', 'Type', 'Category', 'Site', 'Small Group', 'Recorded By', 'Report ID'],
        ];

        transactions.forEach(t => {
            csvRows.push([
                format(new Date(t.date), 'yyyy-MM-dd'),
                t.description?.replaceAll(',', ';') || '', // Escape quotes
                t.amount.toString(),
                t.type,
                t.category,
                t.site?.name || '',
                t.smallGroup?.name || '',
                t.recordedBy.name,
                t.relatedReportId || '',
            ]);
        });

        const csvContent = csvRows.map(row => row.join(',')).join('\n');

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="transactions-${format(new Date(), 'yyyyMMdd')}.csv"`,
            },
        });

    } catch (error) {
        console.error('Error exporting transactions:', error);
        return NextResponse.json(
            { error: MESSAGES.errors.serverError },
            { status: 500 }
        );
    }
}
