

import { renderToBuffer } from '@react-pdf/renderer';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

import { CertificateTemplate, CertificateData } from '@/components/certificates/CertificateTemplate';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Helper to format dates
const formatDate = (date: Date) => format(date, 'dd MMMM yyyy', { locale: fr });

// Helper to calculate duration
function calculateDuration(start: Date, end: Date): string {
    const diffMs = end.getTime() - start.getTime();
    const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
    const months = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));

    if (years > 0) return `${years} an${years > 1 ? 's' : ''} ${months} mois`;
    return `${months} mois`;
}

// Helper to format role name
function formatRole(role: string): string {
    return role.split('_').map((word: string) => word[0].toUpperCase() + word.slice(1)).join(' ');
}

// Helper to get entity name
function getEntityName(profile: any): string {
    if (profile.role === 'NATIONAL_COORDINATOR') return 'National';
    if (profile.role === 'SITE_COORDINATOR') return `Site de ${profile.site?.name ?? 'N/A'}`;
    if (profile.role === 'SMALL_GROUP_LEADER') return `Groupe ${profile.smallGroup?.name ?? 'N/A'} (${profile.smallGroup?.site?.name ?? 'N/A'})`;
    return 'N/A';
}

// Mock function for National Coordinator name - in real app, fetch from config or active NC
async function getNationalCoordinatorName(): Promise<string> {
    const nc = await prisma.profile.findFirst({
        where: { role: 'NATIONAL_COORDINATOR', status: 'active' }
    });
    return nc?.name || 'Direction Nationale';
}

export async function generateCoordinatorCertificate(profileId: string) {
    const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        include: {
            site: true,
            smallGroup: { include: { site: true } }
        }
    });

    if (!profile?.mandateStartDate || !profile?.mandateEndDate) {
        throw new Error('Profil invalide ou mandat non terminé pour la génération de certificat');
    }

    const certificateData: CertificateData = {
        coordinatorName: profile.name,
        role: formatRole(profile.role),
        entity: getEntityName(profile),
        startDate: formatDate(profile.mandateStartDate),
        endDate: formatDate(profile.mandateEndDate),
        duration: calculateDuration(profile.mandateStartDate, profile.mandateEndDate),
        nationalCoordinatorName: await getNationalCoordinatorName()
    };

    // Generate PDF
    // @ts-ignore - renderToBuffer types might conflict in some environments
    const pdfBuffer = await renderToBuffer(<CertificateTemplate data={certificateData} />);

    // Upload to Supabase Storage
    const supabase = await createClient();
    const filename = `certificate-${profileId}-${Date.now()}.pdf`;

    const { error } = await supabase.storage
        .from('certificates')
        .upload(filename, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true
        });

    if (error) {
        console.error('Supabase upload error:', error);
        throw new Error('Erreur lors de l\'upload du certificat');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(filename);

    // Save certificate record in DB
    // Save certificate record in DB
    try {
        const certificate = await prisma.certificate.create({
            data: {
                profileId,
                role: profile.role,
                mandateStartDate: profile.mandateStartDate,
                mandateEndDate: profile.mandateEndDate,
                pdfUrl: publicUrl,
                generatedAt: new Date()
            }
        });

        return certificate;
    } catch (dbError) {
        console.error('[CertificateService] DB Error, rolling back PDF:', dbError);
        // Clean up the uploaded PDF if DB write fails
        const { deleteFile } = await import('@/services/storageService');
        await deleteFile(filename, { isRollback: true, bucketName: 'certificates' }).catch(err =>
            console.error('[CertificateService] Rollback failed:', err)
        );
        throw dbError;
    }
}
