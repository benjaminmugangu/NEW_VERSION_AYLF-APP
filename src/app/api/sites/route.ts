import { NextResponse } from 'next/server';
import * as z from 'zod';
import * as siteService from '@/services/siteService';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from '@/lib/prisma';
import { MESSAGES } from '@/lib/messages';
import { safeParseJSON } from '@/lib/safeJSON';

/**
 * @swagger
 * /api/sites:
 *   post:
 *     summary: Create a new site
 *     description: Creates a new site after validating the input data. Only accessible by authorized users (e.g., national coordinators).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: 
 *                 type: string
 *                 description: The name of the site.
 *               city:
 *                 type: string
 *                 description: The city where the site is located.
 *               country:
 *                 type: string
 *                 description: The country where the site is located.
 *               creationDate:
 *                 type: string
 *                 format: date-time
 *                 description: The date the site was created.
 *               coordinatorId:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the user assigned as coordinator.
 *     responses:
 *       201:
 *         description: Site created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Site'
 *       400:
 *         description: Invalid input data.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */

const siteCreateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long'),
  city: z.string().min(2, 'City is required'),
  country: z.string().min(2, 'Country is required'),
  creationDate: z.string().datetime('Invalid date format'),
  coordinatorId: z.string().uuid('Invalid coordinator ID').optional(),
});

export async function POST(request: Request) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return new NextResponse(JSON.stringify({ error: MESSAGES.errors.unauthorized }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // ✅ RBAC Check (ADDED - FIX FOR ITERATION 2)
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    if (!profile || profile.role !== 'national_coordinator') {
      return new NextResponse(JSON.stringify({ error: MESSAGES.errors.forbidden }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const json = await safeParseJSON(request);
    const parsedData = siteCreateSchema.safeParse(json);

    if (!parsedData.success) {
      return new NextResponse(JSON.stringify({ error: MESSAGES.errors.validation, details: parsedData.error.format() }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const newSite = await siteService.createSite(parsedData.data);
    return new NextResponse(JSON.stringify(newSite), { status: 201, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
    logError('SITE_CREATE', error);
    return new NextResponse(JSON.stringify({ error: sanitizeError(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
