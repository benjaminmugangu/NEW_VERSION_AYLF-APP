import { NextRequest, NextResponse } from 'next/server';
import * as z from 'zod';
import activityService from '@/services/activityService';
import { createClient } from '@/middleware';

// Zod schema for validating partial updates
const activityUpdateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.').optional(),
  thematic: z.string().min(3, 'Thematic must be at least 3 characters long.').optional(),
  date: z.string().datetime().optional(), // Expecting string from JSON
  level: z.enum(["national", "site", "small_group"]).optional(),
  status: z.enum(["planned", "in_progress", "delayed", "executed", "canceled"]).optional(),
  site_id: z.string().uuid().optional().nullable(),
  small_group_id: z.string().uuid().optional().nullable(),
  activity_type_id: z.string().uuid('Activity type is required.').optional(),
  participants_count_planned: z.number().int().min(0).optional(),
}).partial();

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
        const supabase = createClient(request as any);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const json = await request.json();
    const parsedData = activityUpdateSchema.safeParse(json);

    if (!parsedData.success) {
      return new NextResponse(JSON.stringify({ error: 'Invalid input', details: parsedData.error.format() }), { status: 400 });
    }

    // Convert date string back to Date object if it exists
    const dataForService = {
      ...parsedData.data,
      ...(parsedData.data.date && { date: new Date(parsedData.data.date) }),
    };

    const updatedActivity = await activityService.updateActivity(params.id, dataForService);
    return NextResponse.json(updatedActivity);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error', details: errorMessage }), { status: 500 });
  }
}


type RouteContext = {
  params: {
    id: string;
  };
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { params } = context;
  try {
        const supabase = createClient(request as any);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await activityService.deleteActivity(params.id);
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error', details: errorMessage }), { status: 500 });
  }
}
