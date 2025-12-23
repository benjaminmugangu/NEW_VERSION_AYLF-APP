import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { MESSAGES } from '@/lib/messages';
import { withApiRLS } from '@/lib/apiWrapper';

export const GET = withApiRLS(async (request: NextRequest) => {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();

        const currentUser = await prisma.profile.findUnique({
            where: { id: user.id },
        });

        if (currentUser?.role !== 'NATIONAL_COORDINATOR') {
            return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year');

        const where: Prisma.FundAllocationWhereInput = {};

        if (year) {
            const startDate = new Date(`${year}-01-01`);
            const endDate = new Date(`${year}-12-31`);
            where.allocationDate = {
                gte: startDate,
                lte: endDate,
            };
        }

        const allocations = await prisma.fundAllocation.findMany({
            where,
            include: {
                site: { select: { name: true } },
                smallGroup: { select: { name: true } },
                allocatedBy: { select: { name: true } },
            },
            orderBy: { allocationDate: 'desc' },
        });

        const csvRows = [
            ['Date', 'Goal', 'Amount', 'Site', 'Small Group', 'Allocated By'],
        ];

        allocations.forEach(a => {
            csvRows.push([
                format(new Date(a.allocationDate), 'yyyy-MM-dd'),
                a.goal?.replaceAll(',', ';') || '',
                a.amount.toString(),
                a.site?.name || '',
                a.smallGroup?.name || '',
                a.allocatedBy.name,
            ]);
        });

        const csvContent = csvRows.map(row => row.join(',')).join('\n');

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename=" allocations-${format(new Date(), 'yyyyMMdd')}.csv"`,
            },
        });

    } catch (error) {
        console.error('Error exporting allocations', error);
        return NextResponse.json(
            { error: MESSAGES.errors.serverError },
            { status: 500 }
        );
    }
});
