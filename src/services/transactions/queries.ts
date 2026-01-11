'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { FinancialTransaction } from '@/lib/types';
import { getDateRangeFromFilterValue } from '@/lib/dateUtils';
import { batchSignAvatars } from '../enrichmentService';
import {
    TransactionFilters,
    mapPrismaTransactionToModel,
    applyEntityFilter,
    applyUserRoleFilter,
    buildTransactionWhereClause
} from './shared';

export async function getTransactionById(id: string): Promise<FinancialTransaction> {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    if (!user) throw new Error('Unauthorized');

    return await withRLS(user.id, async () => {
        const tx = await prisma.financialTransaction.findUnique({
            where: { id },
            include: {
                site: true,
                smallGroup: true,
                recordedBy: true,
            }
        });

        if (!tx) {
            throw new Error('Transaction not found.');
        }
        const model = mapPrismaTransactionToModel(tx);
        const signed = await batchSignAvatars([model], ['recordedByAvatarUrl']);
        return signed[0];
    });
}

export async function getFilteredTransactions(filters: TransactionFilters): Promise<FinancialTransaction[]> {
    const { user, entity, limit } = filters;
    const { getUser } = getKindeServerSession();
    const activeUser = user || await getUser();

    if (!activeUser && !entity) throw new Error('Authentication or entity required');

    return await withRLS(activeUser?.id || 'system', async () => {
        const where = buildTransactionWhereClause(filters);

        const transactions = await prisma.financialTransaction.findMany({
            where,
            include: {
                site: true,
                smallGroup: true,
                recordedBy: true,
            },
            orderBy: { date: 'desc' },
            take: limit // Apply limit if provided
        });

        const models = transactions.map(mapPrismaTransactionToModel);
        return batchSignAvatars(models, ['recordedByAvatarUrl']);
    });
}


