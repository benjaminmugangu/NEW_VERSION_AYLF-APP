import { NextResponse } from 'next/server';
import * as z from 'zod';
import * as smallGroupService from '@/services/smallGroupService';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from '@/lib/prisma';
import { MESSAGES } from '@/lib/messages';
import { safeParseJSON } from '@/lib/safeJSON';

const smallGroupCreateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long'),
  siteId: z.string().uuid('A valid site ID is required'),
  leaderId: z.string().uuid().optional(),
  description: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return new NextResponse(JSON.stringify({ error: MESSAGES.errors.unauthorized }), { status: 401 });
    }

    // ✅ Fetch user profile to determine role and siteId (ADDED - FIX FOR ITERATION 3)
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true, siteId: true }
    });

    if (!profile) {
      return new NextResponse(JSON.stringify({ error: MESSAGES.errors.forbidden }), { status: 403 });
    }

    const json = await safeParseJSON(request);
    const parsedData = smallGroupCreateSchema.safeParse(json);

    if (!parsedData.success) {
      return new NextResponse(JSON.stringify({ error: MESSAGES.errors.validation, details: parsedData.error.format() }), { status: 400 });
    }

    // ✅ Server-side siteId override based on role (ADDED - FIX FOR ITERATION 3)
    let actualSiteId: string;

    if (profile.role === 'national_coordinator') {
      // NC can create group in any site (use client-provided siteId)
      actualSiteId = parsedData.data.siteId;
    } else if (profile.role === 'site_coordinator') {
      // SC can only create groups in their own site (override with profile.siteId)
      if (!profile.siteId) {
        return new NextResponse(JSON.stringify({ error: MESSAGES.errors.forbidden }), { status: 403 });
      }
      actualSiteId = profile.siteId;
    } else {
      // Other roles cannot create small groups
      return new NextResponse(JSON.stringify({ error: MESSAGES.errors.forbidden }), { status: 403 });
    }

    const { siteId: _, ...formData } = parsedData.data;

    // The service handles the complex logic of creating the group and assigning roles
    const newSmallGroup = await smallGroupService.createSmallGroup(actualSiteId, formData);

    return new NextResponse(JSON.stringify(newSmallGroup), { status: 201 });

  } catch (error) {
    const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
    logError('CREATE_SMALL_GROUP', error);
    return new NextResponse(JSON.stringify({ error: sanitizeError(error) }), { status: 500 });
  }
}
