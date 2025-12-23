import { Metadata } from 'next';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CertificatesList } from './components/CertificatesList';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Certificates');
  return {
    title: `${t('title')} | AYLF`,
    description: t('description'),
  };
}

export default async function CertificatesPage() {
  const t = await getTranslations('Certificates');
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

  if (!currentUser || currentUser.role !== 'NATIONAL_COORDINATOR') {
    redirect('/dashboard');
  }

  const certificates = await prisma.certificate.findMany({
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
    coordinatorName: cert.profile.name,
    role: cert.role,
    entityName: getEntityName(cert),
    generatedAt: cert.generatedAt,
    pdfUrl: cert.pdfUrl
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
      </div>
      <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
        <CertificatesList initialCertificates={formattedCertificates} />
      </div>
    </div>
  );
}
