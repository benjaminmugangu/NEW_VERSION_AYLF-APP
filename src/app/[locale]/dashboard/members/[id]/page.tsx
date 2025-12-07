import React from 'react';
import * as memberService from '@/services/memberService';
import { PageHeader } from '@/components/shared/PageHeader';
import { User } from 'lucide-react';
import { MemberDetails } from '../components/MemberDetails';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberDetailPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const member = await memberService.getMemberById(id);

    return (
      <>
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
          <MemberDetails member={member} />
        </div>
      </>
    );
  } catch (error) {
    notFound();
  }
}
