import { Metadata } from 'next';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCoordinatorHistory } from '@/services/coordinatorHistoryService';
import { CoordinatorHistoryClient } from './components/CoordinatorHistoryClient';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('History');
    return {
        title: `${t('title')} | AYLF`,
        description: t('description'),
    };
}

export default async function CoordinatorHistoryPage() {
    const t = await getTranslations('History');
    const { getUser, isAuthenticated } = getKindeServerSession();

    if (!(await isAuthenticated())) {
        redirect('/api/auth/login');
    }

    const user = await getUser();
    if (!user) {
        redirect('/api/auth/login');
    }

    const currentUser = await prisma.profile.findUnique({
        where: { id: user.id },
    });

    if (currentUser?.role !== 'NATIONAL_COORDINATOR') {
        redirect('/dashboard');
    }

    const response = await getCoordinatorHistory({
        includeActive: true,
        includePast: true
    });
    const historyData = response.success && response.data ? response.data : [];

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
                <div className="flex items-center space-x-2">
                    {/* Export button could go here */}
                </div>
            </div>
            <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
                <CoordinatorHistoryClient initialData={historyData} />
            </div>
        </div>
    );
}
