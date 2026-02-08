// src/app/[locale]/dashboard/finances/budget/page.tsx
import React from 'react';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { redirect } from 'next/navigation';
import { basePrisma } from '@/lib/prisma';
import { ROLES } from '@/lib/constants';
import { BudgetManager } from './components/BudgetManager';
import { getAnnualBudgets } from '@/services/annualBudgetService';
import { getFinancials } from '@/services/financialsService';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function BudgetPage() {
    const { getUser } = getKindeServerSession();
    const kindeUser = await getUser();

    if (!kindeUser) {
        redirect('/api/auth/login');
    }

    const profile = await basePrisma.profile.findUnique({
        where: { id: kindeUser.id },
        select: { id: true, role: true, name: true, email: true, siteId: true, smallGroupId: true }
    });

    if (profile?.role !== ROLES.NATIONAL_COORDINATOR) {
        redirect('/dashboard/finances');
    }

    // Fetch initial data
    const budgetsRes = await getAnnualBudgets();
    const financialsRes = await getFinancials(profile as any, { rangeKey: 'this_year', display: 'This Year' });

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-50/30">
            <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/dashboard/finances">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Retour
                    </Link>
                </Button>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Gouvernance Budgétaire</h2>
                    <p className="text-muted-foreground">
                        {"Pilotez l'enveloppe annuelle de la Caisse Centrale."}
                    </p>
                </div>
            </div>

            <BudgetManager
                currentBudgets={budgetsRes.data || []}
                financialStats={financialsRes.data || null}
            />
        </div>
    );
}
