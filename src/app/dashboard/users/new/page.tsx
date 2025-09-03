// src/app/dashboard/users/new/page.tsx
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { UserForm } from "../components/UserForm";
import { UserPlus, Copy, Check } from "lucide-react";
import type { UserFormData } from '@/schemas/user';
import { useRouter } from "next/navigation";
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface CreatedUserInfo {
  email: string;
  password?: string;
}

export default function NewUserPage() {
  const router = useRouter();
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createdUserInfo, setCreatedUserInfo] = useState<CreatedUserInfo | null>(null);
  const [wasCopied, setWasCopied] = useState(false);
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

      setCreatedUserInfo({
        email: responseData.user.email,
        password: responseData.password,
      });

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

  const handleCloseDialog = () => {
    setCreatedUserInfo(null);
    router.push('/dashboard/users');
  };

  const copyToClipboard = () => {
    if (createdUserInfo?.password) {
      navigator.clipboard.writeText(createdUserInfo.password);
      setWasCopied(true);
      setTimeout(() => setWasCopied(false), 2000); // Reset icon after 2s
    }
  };

  return (
    <>
      <PageHeader 
        title="Invite New User"
        description="Create a new user account. A temporary password will be generated for you to share."
        icon={UserPlus}
      />
      <UserForm onSubmitForm={handleInviteUser} isSubmitting={isCreatingUser} />

      <AlertDialog open={!!createdUserInfo} onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>User Created Successfully!</AlertDialogTitle>
            <AlertDialogDescription>
              The account for <span className="font-semibold">{createdUserInfo?.email}</span> has been created. Please securely share the temporary password with them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium text-gray-500">Temporary Password:</p>
            <div className="flex items-center justify-between p-3 mt-1 bg-gray-100 rounded-md">
              <span className="font-mono text-sm break-all">{createdUserInfo?.password}</span>
              <Button variant="ghost" size="icon" onClick={copyToClipboard} aria-label="Copy password">
                {wasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleCloseDialog}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
