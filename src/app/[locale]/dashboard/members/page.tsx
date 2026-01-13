// src/app/dashboard/members/page.tsx
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from 'next/navigation';
import * as profileService from '@/services/profileService';
import * as memberService from '@/services/memberService';
import { ROLES } from '@/lib/constants';
import { MembersClient } from './components/MembersClient';
import type { User, MemberWithDetails } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const { getUser } = getKindeServerSession();
  const kindeUser = await getUser();

  if (!kindeUser || !kindeUser.id) {
    redirect('/api/auth/login');
  }

  const profileResponse = await profileService.getProfile(kindeUser.id);
  if (!profileResponse.success || !profileResponse.data) {
    redirect('/api/auth/login');
  }

  const user: User = profileResponse.data;

  if (![ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER].includes(user.role)) {
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
    const memberResponse = await memberService.getFilteredMembers({ user, ...initialFilters });
    if (memberResponse.success && memberResponse.data) {
      initialMembers = memberResponse.data;
    }
  } catch (error) {
    console.error('Failed to fetch initial members:', error);
    // You might want to render an error state here
  }

  return <MembersClient initialMembers={initialMembers} user={user} />;
}
