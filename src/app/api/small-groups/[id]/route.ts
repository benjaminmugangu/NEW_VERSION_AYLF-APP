import { NextRequest, NextResponse } from 'next/server';
import * as z from 'zod';
import * as smallGroupService from '@/services/smallGroupService';
import { MESSAGES } from '@/lib/messages';
import { withApiRLS } from '@/lib/apiWrapper';

const smallGroupUpdateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long').optional(),
  leaderId: z.string().uuid().optional().nullable(),
  logisticsAssistantId: z.string().uuid().optional().nullable(),
  financeAssistantId: z.string().uuid().optional().nullable(),
  meetingDay: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).optional(),
  meetingTime: z.string().optional(),
  meetingLocation: z.string().optional(),
}).partial();

export const PATCH = withApiRLS(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;

    const json = await request.json();
    const parsedData = smallGroupUpdateSchema.safeParse(json);

    if (!parsedData.success) {
      return new NextResponse(JSON.stringify({ error: MESSAGES.errors.validation, details: parsedData.error.format() }), { status: 400 });
    }

    // The service handles the complex logic of updating the group and re-assigning roles
    const updatedGroup = await smallGroupService.updateSmallGroup(id, parsedData.data);
    return NextResponse.json(updatedGroup);

  } catch (error) {
    const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
    logError('UPDATE_SMALL_GROUP', error);
    return new NextResponse(JSON.stringify({ error: sanitizeError(error) }), { status: 500 });
  }
});

export const DELETE = withApiRLS(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;

    // The service handles un-assigning members before deleting the group
    await smallGroupService.deleteSmallGroup(id);
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
    logError('DELETE_SMALL_GROUP', error);
    return new NextResponse(JSON.stringify({ error: sanitizeError(error) }), { status: 500 });
  }
});
