'use server';

import { Report, ReportWithDetails } from '@/lib/types';

// Helper to normalize images from JSON
export const normalizeImages = (images: any): Array<{ name: string; url: string }> | undefined => {
    if (!images) return undefined;
    if (!Array.isArray(images)) return undefined;

    // Security LIMIT: Max 10 images to prevent unbounded JSON growth
    const SAFE_LIMIT = 10;
    const slicedImages = images.slice(0, SAFE_LIMIT);

    return slicedImages
        .map((it: any) => {
            if (typeof it?.name === 'string' && typeof it?.url === 'string' && (it.url.startsWith('http://') || it.url.startsWith('https://'))) {
                return { name: it.name, url: it.url };
            }
            return undefined;
        })
        .filter(Boolean) as Array<{ name: string; url: string }>;
};

export const normalizeAttachments = (attachments: any): string[] | undefined => {
    if (!attachments) return undefined;
    if (!Array.isArray(attachments)) return undefined;
    return attachments.filter((x: any) => typeof x === 'string');
};

// Helper to map Prisma result to Report type
export const mapPrismaReportToModel = (report: any): ReportWithDetails => {
    return {
        id: report.id,
        title: report.title,
        activityDate: report.activityDate?.toISOString() ?? '',
        submissionDate: report.submissionDate?.toISOString() ?? '',
        level: report.level,
        status: report.status,
        content: report.content,
        thematic: report.thematic,
        speaker: report.speaker ?? undefined,
        moderator: report.moderator ?? undefined,
        girlsCount: report.girlsCount ?? undefined,
        boysCount: report.boysCount ?? undefined,
        participantsCountReported: report.participantsCountReported ?? undefined,
        totalExpenses: report.totalExpenses ?? undefined,
        currency: report.currency ?? undefined,
        financialSummary: report.financialSummary ?? undefined,
        reviewNotes: report.reviewNotes ?? undefined,
        images: normalizeImages(report.images),
        attachments: normalizeAttachments(report.attachments),
        submittedBy: report.submittedById,
        siteId: report.siteId ?? undefined,
        smallGroupId: report.smallGroupId ?? undefined,
        activityTypeId: report.activityTypeId,

        // Enriched fields
        submittedByName: report.submittedBy?.name,
        submittedByAvatarUrl: report.submittedBy?.avatarUrl,
        siteName: report.site?.name,
        smallGroupName: report.smallGroup?.name,
    };
};

export function mapUpdateDataFields(updatedData: any) {
    const updateData: Record<string, any> = {};
    const fields = [
        'title', 'activityDate', 'level', 'status', 'content', 'thematic',
        'speaker', 'moderator', 'girlsCount', 'boysCount',
        'participantsCountReported', 'totalExpenses', 'currency',
        'financialSummary', 'images', 'attachments', 'siteId',
        'smallGroupId', 'activityTypeId', 'activityId'
    ];

    for (const field of fields) {
        if ((updatedData as any)[field] !== undefined) {
            updateData[field] = (updatedData as any)[field];
        }
    }
    return updateData;
}
