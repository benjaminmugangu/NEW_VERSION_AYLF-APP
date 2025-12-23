import { NextRequest, NextResponse } from 'next/server';
import * as z from 'zod';
import * as siteService from '@/services/siteService';
import { prisma } from '@/lib/prisma';
import { MESSAGES } from '@/lib/messages';
import { safeParseJSON } from '@/lib/safeJSON';
import { withApiRLS } from '@/lib/apiWrapper';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

const siteCreateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long'),
  city: z.string().min(2, 'City is required'),
  country: z.string().min(2, 'Country is required'),
  creationDate: z.string().datetime('Invalid date format'),
  coordinatorId: z.string().uuid('Invalid coordinator ID').optional(),
});

export const POST = withApiRLS(async (request: NextRequest) => {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
    }

    // Secondary RBAC check: only national_coordinator can create sites
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    if (profile?.role !== 'NATIONAL_COORDINATOR') {
      return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
    }

    const json = await safeParseJSON(request);
    const parsedData = siteCreateSchema.safeParse(json);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: MESSAGES.errors.validation, details: parsedData.error.format() },
        { status: 400 }
      );
    }

    const newSite = await siteService.createSite(parsedData.data);
    return NextResponse.json(newSite, { status: 201 });

  } catch (error: any) {
    const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
    logError('SITE_CREATE', error);
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
});
