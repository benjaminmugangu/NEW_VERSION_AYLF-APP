import { NextRequest, NextResponse } from 'next/server';
import * as z from 'zod';
import * as smallGroupService from '@/services/smallGroupService';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from '@/lib/prisma';
import { MESSAGES } from '@/lib/messages';
import { safeParseJSON } from '@/lib/safeJSON';
import { withApiRLS } from '@/lib/apiWrapper';

const smallGroupCreateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long'),
  siteId: z.string().uuid('A valid site ID is required'),
  leaderId: z.string().uuid().optional(),
  description: z.string().optional(),
});

export const POST = withApiRLS(async (request: NextRequest) => {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
    }

    // Fetch user profile to determine role and siteId
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true, siteId: true }
    });

    if (!profile) {
      return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
    }

    const json = await safeParseJSON(request);
    const parsedData = smallGroupCreateSchema.safeParse(json);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: MESSAGES.errors.validation, details: parsedData.error.format() },
        { status: 400 }
      );
    }

    // Server-side siteId override based on role
    let actualSiteId: string;

    if (profile.role === 'NATIONAL_COORDINATOR') {
      actualSiteId = parsedData.data.siteId;
    } else if (profile.role === 'SITE_COORDINATOR') {
      if (!profile.siteId) {
        return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
      }
      actualSiteId = profile.siteId;
    } else {
      return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
    }

    const { siteId: _, ...formData } = parsedData.data;

    const newSmallGroup = await smallGroupService.createSmallGroup(actualSiteId, formData);
    return NextResponse.json(newSmallGroup, { status: 201 });

  } catch (error) {
    const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
    logError('CREATE_SMALL_GROUP', error);
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
});
