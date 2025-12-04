import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { MESSAGES } from '@/lib/messages';

const createTransactionSchema = z.object({
    description: z.string().min(1),
    amount: z.number().positive(),
    date: z.string().transform((str) => new Date(str)),
    category: z.string().min(1),
    type: z.enum(['income', 'expense']),
});

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { isAuthenticated, getUser } = getKindeServerSession();
        const isAuth = await isAuthenticated();

        if (!isAuth) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

        // Verify user is National Coordinator
        const currentUser = await prisma.profile.findUnique({
            where: { id: user.id },
        });

        if (!currentUser || currentUser.role !== 'national_coordinator') {
            return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
        }

        const body = await request.json();
        const result = createTransactionSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: MESSAGES.errors.validation, details: result.error.errors }, { status: 400 });
        }

        const { description, amount, date, category, type } = result.data;

        // Get the report
        const report = await prisma.report.findUnique({
            where: { id },
        });

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        if (report.status !== 'approved') {
            return NextResponse.json({ error: 'Report must be approved to create a transaction' }, { status: 400 });
        }

        // Create the transaction
        const transaction = await prisma.financialTransaction.create({
            data: {
                description,
                amount,
                date,
                category,
                type,
                siteId: report.siteId,
                smallGroupId: report.smallGroupId,
                recordedById: user.id,
                relatedReportId: report.id,
            },
        });

        return NextResponse.json(transaction);
    } catch (error) {
        console.error('Error creating transaction:', error);
        return NextResponse.json(
            { error: MESSAGES.errors.serverError },
            { status: 500 }
        );
    }
}
