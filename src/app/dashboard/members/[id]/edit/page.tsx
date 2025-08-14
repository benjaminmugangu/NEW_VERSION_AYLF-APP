// src/app/dashboard/members/[id]/edit/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import memberService from '@/services/memberService';
import { MemberForm } from '../../components/MemberForm';
import { useToast } from '@/hooks/use-toast';
import type { Member, MemberFormData } from '@/lib/types';
import { MembersPageSkeleton } from '@/components/shared/skeletons/MembersPageSkeleton';

export default function EditMemberPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMember = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const memberData = await memberService.getMemberById(id);
        setMember(memberData as Member);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchMember();
  }, [id]);

  const handleUpdateMember = async (formData: MemberFormData) => {
    try {
      await memberService.updateMember(id, formData);
      toast({ title: 'Success', description: 'Member updated successfully!' });
      router.push('/dashboard/members');
    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unexpected error occurred.';
      toast({ title: 'Error updating member', description: error, variant: 'destructive' });
    }
  };

  if (loading) {
    return <MembersPageSkeleton />;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      {member ? (
        <MemberForm member={member} onSubmitForm={handleUpdateMember} />
      ) : (
        <p>Member not found.</p>
      )}
    </div>
  );
}
