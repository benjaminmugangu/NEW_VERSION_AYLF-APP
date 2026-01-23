import { NextRequest, NextResponse } from 'next/server';
import * as z from 'zod';
import { createActivity } from '@/services/activityService';
import { MESSAGES } from '@/lib/messages';
import { withApiRLS } from '@/lib/apiWrapper';

// Zod schema for validating incoming activity creation data (without created_by)
const activityCreateSchema = z.object({
  title: z.string().min(3, MESSAGES.errors.validation),
  thematic: z.string().min(3, MESSAGES.errors.validation),
  date: z.string().datetime(),
  level: z.enum(["national", "site", "small_group"]),
  status: z.enum(["planned", "in_progress", "delayed", "executed", "canceled"]).default('planned'),
  siteId: z.string().uuid().optional(),
  smallGroupId: z.string().uuid().optional(),
  activityTypeId: z.string().uuid().optional(),
  activityTypeEnum: z.enum(["small_group_meeting", "conference", "apostolat", "deuil", "other"]).optional(),
  participantsCountPlanned: z.number().int().min(0).optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('09:00'),
}).refine(data => {
  if (data.level === 'national') return !data.siteId && !data.smallGroupId;
  if (data.level === 'site') return !!data.siteId && !data.smallGroupId;
  if (data.level === 'small_group') return !!data.smallGroupId && !data.siteId;
  return true;
}, {
  message: 'Invalid level-entity mapping: Site and SmallGroup are mutually exclusive based on level.',
  path: ['level'],
});

export const POST = withApiRLS(async (request: NextRequest) => {
  try {
    const json = await request.json();
    const parsedData = activityCreateSchema.safeParse(json);

    if (!parsedData.success) {
      return NextResponse.json({ error: MESSAGES.errors.validation, details: parsedData.error.format() }, { status: 400 });
    }

    // Since we are inside withApiRLS, the rlsContext is set and 
    // Prisma will automatically set the session variable.
    // We still pass createdBy for audit/legacy reasons, but RLS is enforcing the write.
    const activityDataForService = {
      title: parsedData.data.title,
      thematic: parsedData.data.thematic,
      date: new Date(parsedData.data.date),
      level: parsedData.data.level,
      status: parsedData.data.status,
      activityTypeId: parsedData.data.activityTypeId || '00000000-0000-0000-0000-000000000000',
      activityTypeEnum: parsedData.data.activityTypeEnum,
      siteId: parsedData.data.siteId,
      smallGroupId: parsedData.data.smallGroupId,
      participantsCountPlanned: parsedData.data.participantsCountPlanned,
      startTime: parsedData.data.startTime || '09:00',
      createdBy: 'unknown', // Will be overwritten by RLS or derived in service if needed
    };

    const newActivity = await createActivity(activityDataForService);
    return NextResponse.json(newActivity, { status: 201 });

  } catch (error: any) {
    const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
    logError('ACTIVITY_CREATE', error);
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
});
