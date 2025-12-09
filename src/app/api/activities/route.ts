import { NextRequest, NextResponse } from 'next/server';
import * as z from 'zod';
import * as activityService from '@/services/activityService';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { MESSAGES } from '@/lib/messages';

// Zod schema for validating incoming activity creation data (without created_by)
const activityCreateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  thematic: z.string().min(3, 'Thematic must be at least 3 characters long.'),
  date: z.string().datetime('Date must be a valid ISO 8601 date string'), // Expecting string from JSON
  level: z.enum(["national", "site", "small_group"]),
  status: z.enum(["planned", "in_progress", "delayed", "executed", "canceled"]).default('planned'),
  site_id: z.string().uuid().optional(),
  small_group_id: z.string().uuid().optional(),
  activity_type_id: z.string().uuid().optional(), // Made optional since we might use enum instead
  activity_type_enum: z.enum(["small_group_meeting", "conference", "apostolat", "deuil", "other"]).optional(),
  participants_count_planned: z.number().int().min(0).optional(),
}).refine(data => data.level !== 'site' || !!data.site_id, {
  message: 'Site is required for site-level activities.',
  path: ['site_id'],
}).refine(data => data.level !== 'small_group' || !!data.small_group_id, {
  message: 'Small group is required for small group level activities.',
  path: ['small_group_id'],
});

export async function POST(request: NextRequest) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
    }

    const json = await request.json();
    const parsedData = activityCreateSchema.safeParse(json);

    if (!parsedData.success) {
      return NextResponse.json({ error: MESSAGES.errors.validation, details: parsedData.error.format() }, { status: 400 });
    }

    const activityDataForService = {
      title: parsedData.data.title,
      thematic: parsedData.data.thematic,
      date: new Date(parsedData.data.date),
      level: parsedData.data.level,
      status: parsedData.data.status,
      activityTypeId: parsedData.data.activity_type_id || '00000000-0000-0000-0000-000000000000', // Default UUID if not provided
      activityTypeEnum: parsedData.data.activity_type_enum,
      createdBy: user.id, // User ID from Kinde
      siteId: parsedData.data.site_id,
      smallGroupId: parsedData.data.small_group_id,
      participantsCountPlanned: parsedData.data.participants_count_planned,
    };

    const newActivity = await activityService.createActivity(activityDataForService);
    return NextResponse.json(newActivity, { status: 201 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : MESSAGES.errors.generic;
    return NextResponse.json({ error: MESSAGES.errors.serverError, details: errorMessage }, { status: 500 });
  }
}
