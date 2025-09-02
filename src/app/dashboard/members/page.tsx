// src/app/dashboard/members/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { profileService } from '@/services/profileService';
import { memberService } from '@/services/memberService';
import { ROLES } from '@/lib/constants';
import { MembersClient } from './components/MembersClient';
import type { User, MemberWithDetails } from '@/lib/types';

export default async function MembersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect('/login');
  }

  const user: User = await profileService.getProfile(authUser.id);

  if (!user || ![ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER].includes(user.role)) {
    // Or redirect to an unauthorized page
    return (
      <div className="p-4">
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  // Initial data fetching on the server
  const initialFilters = {
    searchTerm: '',
    dateFilter: { rangeKey: 'all_time' as const, display: 'All Time' },
    typeFilter: { student: true, 'non-student': true },
  };

  let initialMembers: MemberWithDetails[] = [];
  try {
    initialMembers = await memberService.getFilteredMembers({ user, ...initialFilters });
  } catch (error) {
    console.error('Failed to fetch initial members:', error);
    // You might want to render an error state here
  }

  return <MembersClient initialMembers={initialMembers} user={user} />;
}
