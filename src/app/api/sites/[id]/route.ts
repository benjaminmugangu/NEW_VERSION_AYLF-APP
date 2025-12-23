import { NextRequest, NextResponse } from 'next/server';
import * as z from 'zod';
import * as siteService from '@/services/siteService';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { MESSAGES } from '@/lib/messages';
import { withApiRLS } from '@/lib/apiWrapper';

// Schema for partial updates (PATCH)
const siteUpdateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long').optional(),
  city: z.string().min(2, 'City is required').optional(),
  country: z.string().min(2, 'Country is required').optional(),
  creationDate: z.string().datetime('Invalid date format').optional(),
  coordinatorId: z.string().uuid('Invalid coordinator ID').optional().nullable(),
}).partial();

/**
 * @swagger
 * /api/sites/{id}:
 *   patch:
 *     summary: Update a site
 *     description: Partially updates a site's details.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the site to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: {"$ref": "#/components/schemas/SiteUpdate"}
 *     responses:
 *       200: {description: "Site updated successfully"}
 *       400: {description: "Invalid input"}
 *       404: {description: "Site not found"}
 *       500: {description: "Internal server error"}
 */
export const PATCH = withApiRLS(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;

    const json = await request.json();
    const parsedData = siteUpdateSchema.safeParse(json);

    if (!parsedData.success) {
      return new NextResponse(JSON.stringify({ error: MESSAGES.errors.validation, details: parsedData.error.format() }), { status: 400 });
    }

    const updatedSite = await siteService.updateSite(id, parsedData.data);
    return NextResponse.json(updatedSite);

  } catch (error) {
    const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
    logError('UPDATE_SITE', error);
    const safeMessage = sanitizeError(error);
    return new NextResponse(JSON.stringify({ error: safeMessage }), { status: 500 });
  }
});

/**
 * @swagger
 * /api/sites/{id}:
 *   delete:
 *     summary: Delete a site
 *     description: Deletes a site by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the site to delete.
 *     responses:
 *       204: {description: "Site deleted successfully"}
 *       404: {description: "Site not found"}
 *       500: {description: "Internal server error"}
 */
export const DELETE = withApiRLS(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;

    await siteService.deleteSite(id);
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
    logError('DELETE_SITE', error);
    const safeMessage = sanitizeError(error);
    return new NextResponse(JSON.stringify({ error: safeMessage }), { status: 500 });
  }
});
