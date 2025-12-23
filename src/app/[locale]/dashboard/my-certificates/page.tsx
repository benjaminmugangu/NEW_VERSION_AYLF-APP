import { Metadata } from 'next';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MyCertificatesList } from './components/MyCertificatesList';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('Navigation');
    return {
        title: `${t('my_certificates')} | AYLF`,
        description: t('my_certificates'),
    };
}

export default async function MyCertificatesPage() {
    const t = await getTranslations('Navigation');
    const { getUser, isAuthenticated } = getKindeServerSession();

    if (!(await isAuthenticated())) {
        redirect('/api/auth/login');
    }

    const user = await getUser();
    if (!user) {
        redirect('/api/auth/login');
    }

    const certificates = await prisma.certificate.findMany({
        where: { profileId: user.id },
        include: {
            profile: {
                include: {
                    site: true,
                    smallGroup: {
                        include: { site: true }
                    }
                }
            }
        },
        orderBy: { generatedAt: 'desc' }
    });

    const getEntityName = (cert: any) => {
        if (cert.role === 'NATIONAL_COORDINATOR') return 'National';
        if (cert.role === 'SITE_COORDINATOR') return cert.profile.site?.name || 'N/A';
        if (cert.profile.smallGroup) {
            const siteName = cert.profile.smallGroup.site?.name ? ` (${cert.profile.smallGroup.site.name})` : '';
            return `${cert.profile.smallGroup.name}${siteName}`;
        }
        return 'N/A';
    };

    const formattedCertificates = certificates.map((cert: any) => ({
        id: cert.id,
        role: cert.role,
        entityName: getEntityName(cert),
        generatedAt: cert.generatedAt,
        pdfUrl: cert.pdfUrl
    }));

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">{t('my_certificates')}</h2>
            </div>
            <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
                {formattedCertificates.length > 0 ? (
                    <MyCertificatesList certificates={formattedCertificates} />
                ) : (
                    <div className="text-center py-20 bg-muted/30 rounded-lg border-2 border-dashed">
                        <p className="text-muted-foreground">No certificates available yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
