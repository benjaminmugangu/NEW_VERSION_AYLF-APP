import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export async function GET(request: Request) {
    try {
        const { isAuthenticated, getUser } = getKindeServerSession();
        const isAuth = await isAuthenticated();

        if (!isAuth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const currentUser = await prisma.profile.findUnique({
            where: { id: user.id },
        });

        if (!currentUser || currentUser.role !== 'national_coordinator') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Parse query params
        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year');

        // Build filter
        const where: any = {};

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

        // Generate CSV
        const csvRows = [
            ['Date', 'Goal', 'Amount', 'Site', 'Small Group', 'Allocated By'],
        ];

        allocations.forEach(a => {
            csvRows.push([
                format(new Date(a.allocationDate), 'yyyy-MM-dd'),
                `"${a.goal.replace(/"/g, '""')}"`,
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
                'Content-Disposition': `attachment; filename="allocations-${format(new Date(), 'yyyyMMdd')}.csv"`,
            },
        });

    } catch (error) {
        console.error('Error exporting allocations:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
