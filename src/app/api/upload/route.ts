import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import { uploadFile } from '@/services/storageService';
import { withApiRLS } from '@/lib/apiWrapper';
import { z } from 'zod';

const uploadSchema = z.object({
    reportId: z.string().optional(),
    siteId: z.string().optional(),
    smallGroupId: z.string().optional(),
});

export const POST = withApiRLS(async (request: NextRequest) => {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Get optional metadata
        const reportId = formData.get('reportId') as string | null;
        const siteId = formData.get('siteId') as string | null;
        const smallGroupId = formData.get('smallGroupId') as string | null;

        const options = {
            reportId: reportId || undefined,
            siteId: siteId || undefined,
            smallGroupId: smallGroupId || undefined,
        };

        const result = await uploadFile(file, options);

        return NextResponse.json({
            success: true,
            filePath: result.filePath,
            publicUrl: result.publicUrl,
        });

    } catch (error: any) {
        console.error('[UPLOAD_ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
});
