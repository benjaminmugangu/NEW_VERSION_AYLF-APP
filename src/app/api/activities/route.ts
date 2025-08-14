import { NextResponse } from 'next/server';
import * as z from 'zod';
import activityService from '@/services/activityService';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Zod schema for validating incoming activity creation data (without created_by)
const activityCreateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  thematic: z.string().min(3, 'Thematic must be at least 3 characters long.'),
  date: z.string().datetime('Date must be a valid ISO 8601 date string'), // Expecting string from JSON
  level: z.enum(["national", "site", "small_group"]),
  status: z.enum(["planned", "in_progress", "delayed", "executed", "canceled"]).default('planned'),
  site_id: z.string().uuid().optional(),
  small_group_id: z.string().uuid().optional(),
  activity_type_id: z.string().uuid('Activity type is required.'),
  participants_count_planned: z.number().int().min(0).optional(),
}).refine(data => data.level !== 'site' || !!data.site_id, {
  message: 'Site is required for site-level activities.',
  path: ['site_id'],
}).refine(data => data.level !== 'small_group' || !!data.small_group_id, {
  message: 'Small group is required for small group level activities.',
  path: ['small_group_id'],
});

export async function POST(request: Request) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const json = await request.json();
    const parsedData = activityCreateSchema.safeParse(json);

    if (!parsedData.success) {
      return new NextResponse(JSON.stringify({ error: 'Invalid input', details: parsedData.error.format() }), { status: 400 });
    }

    // The date from the form comes as a string, but the service expects a Date object.
    // The service function `createActivity` will handle the conversion.
    const activityDataForService = {
        ...parsedData.data,
        date: new Date(parsedData.data.date),
    };

    const newActivity = await activityService.createActivity(activityDataForService, session.user.id);
    return new NextResponse(JSON.stringify(newActivity), { status: 201 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error', details: errorMessage }), { status: 500 });
  }
}
