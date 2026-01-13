import React from 'react';
import * as memberService from '@/services/memberService';
import { MemberForm } from '../../components/MemberForm';
import { notFound, redirect } from 'next/navigation';
import type { MemberFormData } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMemberPage({ params }: PageProps) {
  const { id } = await params;

  const response = await memberService.getMemberById(id);
  if (!response.success || !response.data) {
    notFound();
  }
  const member = response.data;

  // Bind the ID to the update action
  const updateMemberAction = async (data: MemberFormData) => {
    'use server';
    const result = await memberService.updateMember(id, data);
    if (result.success) {
      redirect('/dashboard/members');
    }
    return { success: false, error: result.error?.message || "Failed to update member" };
  };

  return (
    <div className="container mx-auto p-4">
      <MemberForm member={member} onSubmitForm={updateMemberAction} />
    </div>
  );
}
