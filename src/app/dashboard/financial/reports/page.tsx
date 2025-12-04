import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { redirect } from 'next/navigation';
import * as profileService from '@/services/profileService';
import * as reportService from '@/services/reportService';
import PendingReportsTable from '@/components/financial/PendingReportsTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function FinancialReportsPage() {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
        redirect('/api/auth/login');
    }

    const profile = await profileService.getProfile(user.id);

    // Only National Coordinators can access this page
    if (profile.role !== 'national_coordinator') {
        redirect('/dashboard');
    }

    // Fetch all pending reports
    const pendingReports = await reportService.getFilteredReports({
        user: {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role as any,
            siteId: profile.siteId || undefined,
            smallGroupId: profile.smallGroupId || undefined,
        },
        statusFilter: {
            pending: true,
            submitted: false,
            approved: false,
            rejected: false,
        },
    });

    return (
        <div className="container mx-auto py-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Validation des Rapports</h1>
                <p className="text-muted-foreground mt-2">
                    Approuvez ou rejetez les rapports d'activité. L'approbation génère automatiquement les transactions financières.
                </p>
            </div>

            <PendingReportsTable
                reports={pendingReports.map(r => ({
                    id: r.id,
                    title: r.title,
                    activityDate: r.activityDate,
                    submissionDate: r.submissionDate,
                    submittedByName: r.submittedByName || 'Inconnu',
                    siteName: r.siteName,
                    smallGroupName: r.smallGroupName,
                    totalExpenses: r.totalExpenses || undefined,
                    currency: r.currency || undefined,
                    participantsCountReported: r.participantsCountReported || undefined,
                    status: r.status as 'pending' | 'approved' | 'rejected',
                }))}
            />

            {/* Summary Card */}
            <Card>
                <CardHeader>
                    <CardTitle>ℹ️ Important</CardTitle>
                    <CardDescription>Processus d'approbation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p>
                        <strong>Lors de l'approbation</strong>, le système effectue automatiquement :
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Marque le rapport comme <strong className="text-green-600">approuvé</strong></li>
                        <li>Marque l'activité liée comme <strong>exécutée</strong></li>
                        <li>Génère une <strong>transaction financière</strong> (expense) avec le montant des dépenses</li>
                        <li>Enregistre un <strong>log d'audit</strong> complet</li>
                    </ul>
                    <p className="mt-4 text-muted-foreground">
                        Toutes les actions sont traçables dans l'historique d'audit.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
