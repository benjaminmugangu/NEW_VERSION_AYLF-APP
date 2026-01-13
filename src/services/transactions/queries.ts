'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { FinancialTransaction, ServiceResponse, ErrorCode } from '@/lib/types';
import { batchSignAvatars } from '../enrichmentService';
import {
    TransactionFilters,
    mapPrismaTransactionToModel,
    buildTransactionWhereClause
} from './shared';

export async function getTransactionById(id: string): Promise<ServiceResponse<FinancialTransaction>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        const result = await withRLS(user.id, async () => {
            const tx = await prisma.financialTransaction.findUnique({
                where: { id },
                include: {
                    site: true,
                    smallGroup: true,
                    recordedBy: true,
                }
            });

            if (!tx) {
                throw new Error('NOT_FOUND: Transaction not found.');
            }
            const model = mapPrismaTransactionToModel(tx);
            const signed = await batchSignAvatars([model] as FinancialTransaction[], ['recordedByAvatarUrl']);
            return signed[0];
        });

        return { success: true, data: result };
    } catch (error: any) {
        let code = ErrorCode.INTERNAL_ERROR;
        if (error.message.includes('NOT_FOUND')) code = ErrorCode.NOT_FOUND;
        return { success: false, error: { message: error.message, code } };
    }
}

export async function getFilteredTransactions(filters: TransactionFilters): Promise<ServiceResponse<FinancialTransaction[]>> {
    try {
        const { user, entity, limit } = filters;
        const { getUser } = getKindeServerSession();
        const activeUser = user || await getUser();

        if (!activeUser && !entity) {
            return { success: false, error: { message: 'Authentication or entity required', code: ErrorCode.UNAUTHORIZED } };
        }

        const result = await withRLS(activeUser?.id || 'system', async () => {
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
            return batchSignAvatars(models as FinancialTransaction[], ['recordedByAvatarUrl']);
        });

        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}
