import { NextResponse } from 'next/server';
import * as z from 'zod';
import siteService from '@/services/siteService';
import { createClient } from '@/middleware';

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
        const supabase = createClient(request as any);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const json = await request.json();
    const parsedData = siteCreateSchema.safeParse(json);

    if (!parsedData.success) {
      return new NextResponse(JSON.stringify({ error: 'Invalid input', details: parsedData.error.format() }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const newSite = await siteService.createSite(parsedData.data);
    return new NextResponse(JSON.stringify(newSite), { status: 201, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error('Error creating site:', errorMessage);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
