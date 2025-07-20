// src/app/dashboard/members/[memberId]/edit/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { MemberForm } from '../../components/MemberForm';
import { RoleBasedGuard } from '@/components/shared/RoleBasedGuard';
import { ROLES } from '@/lib/constants';
import { memberService } from '@/services/memberService';
import type { Member, MemberFormData } from '@/lib/types';
import { Edit, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/shared/PageSpinner';

export default function EditMemberPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const memberId = params.memberId as string;
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMember = async () => {
      if (!memberId) return;
      setIsLoading(true);
      const response = await memberService.getMemberById(memberId);
      if (response.success && response.data) {
        setMemberToEdit(response.data);
      } else {
        setMemberToEdit(null);
      }
      setIsLoading(false);
    };
    fetchMember();
  }, [memberId]);

  const handleUpdateMember = async (data: MemberFormData) => {
    const response = await memberService.updateMember(memberId, data);
    if (response.success && response.data) {
      toast({
        title: 'Member Updated!',
        description: `Member "${response.data.name}" has been successfully updated.`,
      });
      router.push(`/dashboard/members/${memberId}`);
    } else if (response.error) {
      toast({
        title: 'Error',
        description: response.error.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <PageSpinner />;
  }

  if (!memberToEdit) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
        <PageHeader title="Member Not Found" icon={Info} />
         <Card>
          <CardContent className="pt-6">
            <p>The member you are looking for does not exist or could not be found.</p>
            <Button onClick={() => router.push('/dashboard/members')} className="mt-4">Back to Members</Button>
          </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }
  
  // TODO: Add role-based checks for editing eligibility

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader 
        title={`Edit Member: ${memberToEdit.name}`}
        description="Modify the details of the existing member."
        icon={Edit}
      />
      <MemberForm member={memberToEdit} onSubmitForm={handleUpdateMember} />
    </RoleBasedGuard>
  );
}
