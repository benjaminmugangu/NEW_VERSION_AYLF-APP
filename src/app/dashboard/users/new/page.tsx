// src/app/dashboard/users/new/page.tsx
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { UserForm } from "../components/UserForm";
import { UserPlus } from "lucide-react";
import type { UserFormData } from '@/schemas/user';
import { useRouter } from "next/navigation";
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function NewUserPage() {
  const router = useRouter();
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const { toast } = useToast();

  const handleInviteUser = async (data: UserFormData) => {
    try {
      setIsCreatingUser(true);
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to invite user.');
      }

      toast({ 
        title: 'Success', 
        description: `Invitation sent to ${data.email}. They will receive an email with setup instructions.` 
      });
      router.push('/dashboard/users');

    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <>
      <PageHeader 
        title="Invite New User"
        description="Send an invitation email to a new user. They will receive setup instructions via email."
        icon={UserPlus}
      />
      <UserForm onSubmitForm={handleInviteUser} isSubmitting={isCreatingUser} />
    </>
  );
}
