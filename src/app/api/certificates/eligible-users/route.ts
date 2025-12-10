import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as certificateService from '@/services/certificateService';
import { parseISO, isValid } from 'date-fns';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { MESSAGES } from '@/lib/messages';

export async function GET(request: NextRequest) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id) // Use Kinde user ID
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
    const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
    logError('ELIGIBLE_USERS', error);
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}
