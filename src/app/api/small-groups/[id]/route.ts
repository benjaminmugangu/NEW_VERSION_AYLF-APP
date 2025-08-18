import { NextResponse } from 'next/server';
import * as z from 'zod';
import smallGroupService from '@/services/smallGroupService';
import { createClient } from '@/utils/supabase/server';

const smallGroupUpdateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long').optional(),
  leaderId: z.string().uuid().optional().nullable(),
  logisticsAssistantId: z.string().uuid().optional().nullable(),
  financeAssistantId: z.string().uuid().optional().nullable(),
  meetingDay: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).optional(),
  meetingTime: z.string().optional(),
  meetingLocation: z.string().optional(),
}).partial();

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
        const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const json = await request.json();
    const parsedData = smallGroupUpdateSchema.safeParse(json);

    if (!parsedData.success) {
      return new NextResponse(JSON.stringify({ error: 'Invalid input', details: parsedData.error.format() }), { status: 400 });
    }

    // The service handles the complex logic of updating the group and re-assigning roles
    const updatedGroup = await smallGroupService.updateSmallGroup(params.id, parsedData.data);
    return NextResponse.json(updatedGroup);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error', details: errorMessage }), { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
        const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // The service handles un-assigning members before deleting the group
    await smallGroupService.deleteSmallGroup(params.id);
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error', details: errorMessage }), { status: 500 });
  }
}
