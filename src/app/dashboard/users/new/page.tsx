// src/app/dashboard/users/new/page.tsx
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { UserForm } from "../components/UserForm";
import { ROLES } from "@/lib/constants";
import { UserPlus } from "lucide-react";
import type { UserFormData } from '@/schemas/user';
import { useRouter } from "next/navigation";
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface InviteResponse {
  password?: string;
  error?: { message: string } | string;
}

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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to invite user.');
      }

      toast({ title: 'Success', description: 'User invited successfully.' });
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
        description="Create a new user account. An invitation email will be sent to them to set their password."
        icon={UserPlus}
      />
      <UserForm onSubmitForm={handleInviteUser} isSubmitting={isCreatingUser} />
    </>
  );
}
