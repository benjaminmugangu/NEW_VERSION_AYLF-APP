import { NextResponse } from 'next/server';
import * as z from 'zod';
import smallGroupService from '@/services/smallGroupService';
import { createClient } from '@/middleware';

const smallGroupCreateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long'),
  siteId: z.string().uuid('A valid site ID is required'),
  leaderId: z.string().uuid().optional(),
  logisticsAssistantId: z.string().uuid().optional(),
  financeAssistantId: z.string().uuid().optional(),
  meetingDay: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).optional(),
  meetingTime: z.string().optional(), // Could be more specific, e.g., regex for HH:MM
  meetingLocation: z.string().optional(),
});

export async function POST(request: Request) {
  try {
        const supabase = createClient(request as any);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const json = await request.json();
    const parsedData = smallGroupCreateSchema.safeParse(json);

    if (!parsedData.success) {
      return new NextResponse(JSON.stringify({ error: 'Invalid input', details: parsedData.error.format() }), { status: 400 });
    }

    const { siteId, ...formData } = parsedData.data;

    // The service handles the complex logic of creating the group and assigning roles
    const newSmallGroup = await smallGroupService.createSmallGroup(siteId, formData);

    return new NextResponse(JSON.stringify(newSmallGroup), { status: 201 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error('Error creating small group:', errorMessage);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error', details: errorMessage }), { status: 500 });
  }
}
