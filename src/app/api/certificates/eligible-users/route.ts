import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as certificateService from '@/services/certificateService';
import { parseISO, isValid } from 'date-fns';
import { MESSAGES } from '@/lib/messages';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profile?.role !== 'national_coordinator') {
    return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
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
    const message = error instanceof Error ? error.message : MESSAGES.errors.generic;
    return NextResponse.json({ error: MESSAGES.errors.serverError, details: message }, { status: 500 });
  }
}
