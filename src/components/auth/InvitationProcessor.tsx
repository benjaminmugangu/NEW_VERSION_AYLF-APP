'use client';

import { useEffect, useState } from 'react';
import { processInvitation } from '@/actions/invitation';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

export function InvitationProcessor() {
    const { toast } = useToast();
    const router = useRouter();
    const [processed, setProcessed] = useState(false);

    useEffect(() => {
        const checkInvitation = async () => {
            if (processed) return;

            // We blindly call processInvitation. 
            // It will check for the cookie on the server side.
            // If no cookie, it returns error "No invitation token found", which we ignore.

            try {
                const result = await processInvitation();

                if (result.success) {
                    toast({
                        title: "Invitation Accepted!",
                        description: "Your account has been updated with your new role and permissions.",
                        variant: "default",
                    });
                    setProcessed(true);
                    router.refresh();
                } else if (result.error !== "No invitation token found") {
                    // Only show error if it's not the "no token" error (which is normal for most users)
                    console.log("Invitation processing result:", result);
                }
            } catch (error) {
                console.error("Failed to process invitation:", error);
            }
        };

        checkInvitation();
    }, [processed, toast, router]);

    return null;
}
