import { NextRequest, NextResponse } from 'next/server';
import * as z from 'zod';
import { updateActivity, deleteActivity } from '@/services/activityService';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { MESSAGES } from '@/lib/messages';
import { withApiRLS } from '@/lib/apiWrapper';

const activityUpdateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.').optional(),
  thematic: z.string().min(3, 'Thematic must be at least 3 characters long.').optional(),
  date: z.string().datetime().optional(),
  level: z.enum(["national", "site", "small_group"]).optional(),
  status: z.enum(["planned", "in_progress", "delayed", "executed", "canceled"]).optional(),
  site_id: z.string().uuid().optional().nullable(),
  small_group_id: z.string().uuid().optional().nullable(),
  activity_type_id: z.string().uuid('Activity type is required.').optional(),
  participants_count_planned: z.number().int().min(0).optional(),
}).partial();

export const PATCH = withApiRLS(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;

  try {
    const json = await request.json();
    const parsedData = activityUpdateSchema.safeParse(json);

    if (!parsedData.success) {
      return NextResponse.json({ error: MESSAGES.errors.validation, details: parsedData.error.format() }, { status: 400 });
    }

    const dataForService = {
      ...parsedData.data,
      ...(parsedData.data.date && { date: new Date(parsedData.data.date) }),
    };

    const updatedActivity = await updateActivity(id, dataForService);
    return NextResponse.json(updatedActivity);

  } catch (error: any) {
    const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
    logError('ACTIVITY_UPDATE', error);
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
});



export const DELETE = withApiRLS(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;

  try {
    await deleteActivity(id);
    return new Response(null, { status: 204 });

  } catch (error: any) {
    const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
    logError('ACTIVITY_DELETE', error);
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
});
