"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import memberService from '@/services/memberService';
import type { MemberWithDetails } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { User } from 'lucide-react';
import { MembersPageSkeleton } from '@/components/shared/skeletons/MembersPageSkeleton';
import { MemberDetails } from '../components/MemberDetails';
import { RoleBasedGuard } from '@/components/shared/RoleBasedGuard';
import { ROLES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MemberDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [member, setMember] = useState<MemberWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMember = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const memberData = await memberService.getMemberById(id);
        setMember(memberData);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchMember();
  }, [id]);

  if (loading) {
    return <MembersPageSkeleton />;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500 text-center">{error}</div>;
  }

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader 
        title="Member Details"
        description="Detailed information about the member."
        icon={User}
        actions={
          <Button asChild>
            <Link href={`/dashboard/members/${id}/edit`}>Edit Member</Link>
          </Button>
        }
      />
      <div className="mt-6">
        {member ? (
          <MemberDetails member={member} />
        ) : (
          <p className="text-center">Member not found.</p>
        )}
      </div>
    </RoleBasedGuard>
  );
}
