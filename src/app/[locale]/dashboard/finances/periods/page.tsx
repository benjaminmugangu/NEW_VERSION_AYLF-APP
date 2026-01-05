
import { getAccountingPeriods } from '@/services/accountingService';
import { AccountingPeriodList } from '@/components/financial/AccountingPeriodList';
import { CreatePeriodDialog } from '@/components/financial/CreatePeriodDialog';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from '@/lib/prisma';
import { ROLES } from '@/lib/constants';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Gestion des Périodes Comptables | AYLF',
    description: 'Créez et clôturez les périodes budgétaires.',
};

export default async function AccountingPeriodsPage() {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
        redirect('/api/auth/login');
    }

    // RBAC Check: NC full access, SC read-only
    const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { role: true }
    });

    const isNC = profile?.role === ROLES.NATIONAL_COORDINATOR;
    const isSC = profile?.role === ROLES.SITE_COORDINATOR;

    if (!isNC && !isSC) {
        redirect('/dashboard/finances');
    }

    const periods = await getAccountingPeriods();

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 p-0 h-auto hover:bg-transparent">
                        <Link href="/dashboard/finances" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                            Retour aux finances
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Périodes Comptables</h1>
                    <p className="text-muted-foreground">
                        {isNC
                            ? "Gérez l'ouverture et la clôture des cycles financiers."
                            : "Consultez l'état des cycles financiers clôturés."}
                    </p>
                </div>
                <div>
                    {isNC && <CreatePeriodDialog />}
                </div>
            </div>

            <div className="pt-4">
                <AccountingPeriodList
                    periods={periods as any}
                    currentUserId={user.id}
                    userRole={profile?.role}
                />
            </div>
        </div>
    );
}
