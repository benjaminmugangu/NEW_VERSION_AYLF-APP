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

  let member;
  try {
    member = await memberService.getMemberById(id);
  } catch (error) {
    notFound();
  }

  // Bind the ID to the update action
  const updateMemberAction = async (data: MemberFormData) => {
    'use server';
    await memberService.updateMember(id, data);
    redirect('/dashboard/members');
  };

  return (
    <div className="container mx-auto p-4">
      <MemberForm member={member} onSubmitForm={updateMemberAction} />
    </div>
  );
}
