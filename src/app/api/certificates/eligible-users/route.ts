import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { certificateService } from '@/services/certificateService';
import { parseISO, isValid } from 'date-fns';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profile?.role !== 'national_coordinator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  const startDate = startDateParam && isValid(parseISO(startDateParam)) ? parseISO(startDateParam) : null;
  const endDate = endDateParam && isValid(parseISO(endDateParam)) ? parseISO(endDateParam) : null;

  try {
    const roster = await certificateService.getCertificateRoster({ startDate, endDate });
    return NextResponse.json(roster);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
