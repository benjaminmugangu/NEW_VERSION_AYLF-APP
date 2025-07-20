// src/app/dashboard/users/new/page.tsx
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { UserForm } from "../components/UserForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { UserPlus } from "lucide-react";
import { type UserFormData } from "../components/UserForm";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle } from 'lucide-react';

interface InviteResponse {
  password?: string;
  error?: { message: string } | string;
}

export default function NewUserPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleInviteUser = async (data: UserFormData) => {
    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: InviteResponse = await response.json();

      if (!response.ok) {
        const errorMessage = typeof result.error === 'object' && result.error !== null ? result.error.message : result.error;
        throw new Error(errorMessage || 'Failed to create user.');
      }

      toast({
        title: "User Created Successfully!",
        description: `The account for ${data.email} has been created.`,
      });
      
      // Store the generated password and email to display it
      setGeneratedPassword(result.password || null);
            setUserEmail(String(data.email));

    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred. Please try again.";
      toast({
        title: "Error Creating User",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleGoToList = () => {
    router.refresh();
    router.push('/dashboard/users');
  };

  const handleCopy = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      toast({ title: 'Password copied to clipboard!' });
      setTimeout(() => setCopied(false), 2000); // Reset icon after 2s
    }
  };

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader 
        title={generatedPassword ? "User Created Successfully" : "Add New User"}
        description={generatedPassword ? "Share the credentials below with the user." : "Create a new user account and assign roles and permissions."}
        icon={UserPlus}
      />
      {generatedPassword ? (
        <div className="mt-6 p-6 border rounded-lg bg-secondary/50 max-w-md mx-auto">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email / Username</label>
              <p className="text-lg font-semibold">{userEmail}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Temporary Password</label>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-lg font-mono p-2 bg-background rounded-md flex-grow">{generatedPassword}</p>
                <Button onClick={handleCopy} variant="outline" size="icon">
                  {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-2">Please communicate these credentials to the user securely. They will be prompted to change their password on first login.</p>
          </div>
           <div className="mt-6 flex gap-4">
            <Button onClick={handleGoToList}>Go to Users List</Button>
            <Button onClick={() => setGeneratedPassword(null)} variant="secondary">Create Another User</Button>
          </div>
        </div>
      ) : (
        <UserForm onSubmitForm={handleInviteUser} />
      )}
    </RoleBasedGuard>
  );
}
