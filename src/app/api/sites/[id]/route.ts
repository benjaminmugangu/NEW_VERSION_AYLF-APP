import { NextResponse } from 'next/server';
import * as z from 'zod';
import siteService from '@/services/siteService';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

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
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const json = await request.json();
    const parsedData = siteUpdateSchema.safeParse(json);

    if (!parsedData.success) {
      return new NextResponse(JSON.stringify({ error: 'Invalid input', details: parsedData.error.format() }), { status: 400 });
    }

    const updatedSite = await siteService.updateSite(params.id, parsedData.data);
    return NextResponse.json(updatedSite);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error', details: errorMessage }), { status: 500 });
  }
}

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
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await siteService.deleteSite(params.id);
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error', details: errorMessage }), { status: 500 });
  }
}
