'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { UserRole } from '@prisma/client';
import { CheckCircle, Copy, AlertTriangle } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const formSchema = z.object({
    email: z.string().email(),
    name: z.string().min(2),
    role: z.nativeEnum(UserRole),
    siteId: z.string().optional(),
    smallGroupId: z.string().optional(),
});

interface InviteUserFormProps {
    sites: { id: string; name: string }[];
    smallGroups: { id: string; name: string; siteId: string }[];
}

interface ConflictData {
    conflictType: 'site_coordinator' | 'small_group_leader';
    existingCoordinator?: {
        id: string;
        name: string;
        email: string;
        mandateStartDate: string;
    };
    existingLeader?: {
        id: string;
        name: string;
        email: string;
        mandateStartDate: string;
    };
    error: string;
}

export default function InviteUserForm({ sites, smallGroups }: InviteUserFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [invitationLink, setInvitationLink] = useState<string | null>(null);
    const [conflictData, setConflictData] = useState<ConflictData | null>(null);
    const [pendingInvitation, setPendingInvitation] = useState<z.infer<typeof formSchema> | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            name: '',
            role: 'member',
        },
    });

    const selectedRole = form.watch('role');
    const selectedSiteId = form.watch('siteId');

    const filteredSmallGroups = smallGroups.filter(
        (group) => !selectedSiteId || group.siteId === selectedSiteId
    );

    async function onSubmit(values: z.infer<typeof formSchema>, replaceExisting = false, existingCoordinatorId?: string) {
        setIsLoading(true);
        try {
            const requestBody = replaceExisting && existingCoordinatorId
                ? { ...values, replaceExisting: true, existingCoordinatorId }
                : values;

            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle 409 Conflict (duplicate coordinator)
                if (response.status === 409 && (data.conflictType === 'site_coordinator' || data.conflictType === 'small_group_leader')) {
                    setConflictData(data);
                    setPendingInvitation(values);
                    setIsLoading(false);
                    return; // Don't throw, show dialog instead
                }
                throw new Error(data.error || 'Failed to invite user');
            }

            // Generate invitation link
            const baseUrl = window.location.origin;
            const inviteLink = `${baseUrl}/auth/accept-invitation?token=${data.invitation.token}`;
            setInvitationLink(inviteLink);

            toast({
                title: 'Utilisateur invité avec succès ! ✅',
                description: data.kindeCreated
                    ? 'Compte Kinde créé. Copiez le lien ci-dessous pour l\'envoyer.'
                    : 'Invitation enregistrée. Copiez le lien pour l\'envoyer.',
            });
        } catch (error) {
            console.error('Invitation error:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: error instanceof Error ? error.message : 'Une erreur est survenue',
            });
        } finally {
            setIsLoading(false);
        }
    }

    const copyToClipboard = async () => {
        if (invitationLink) {
            await navigator.clipboard.writeText(invitationLink);
            toast({
                title: 'Lien copié ! 📋',
                description: 'Le lien d\'invitation a été copié dans le presse-papier.',
            });
        }
    };

    const handleReplaceConfirm = async () => {
        if (!pendingInvitation || !conflictData) return;

        const existingPerson = conflictData.existingCoordinator || conflictData.existingLeader;
        if (!existingPerson) return;

        // Retry submission with replace flag
        await onSubmit(pendingInvitation, true, existingPerson.id);

        // Clear conflict state
        setConflictData(null);
        setPendingInvitation(null);
    };

    const handleReplaceCancel = () => {
        setConflictData(null);
        setPendingInvitation(null);
    };

    const existingPerson = conflictData?.existingCoordinator || conflictData?.existingLeader;
    const roleLabel = conflictData?.conflictType === 'site_coordinator' ? 'Site Coordinator' : 'Small Group Leader';

    return (
        <>
            {/* Conflict Resolution Dialog */}
            <AlertDialog open={!!conflictData} onOpenChange={(open) => !open && handleReplaceCancel()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            <AlertDialogTitle>Coordinateur existant détecté</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="space-y-3 pt-3">
                            <p>{conflictData?.error}</p>
                            {existingPerson && (
                                <div className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-1">
                                    <p className="text-sm font-medium text-slate-900">Coordinateur actuel :</p>
                                    <p className="text-sm"><strong>Nom :</strong> {existingPerson.name}</p>
                                    <p className="text-sm"><strong>Email :</strong> {existingPerson.email}</p>
                                    <p className="text-sm">
                                        <strong>Mandat depuis :</strong>{' '}
                                        {new Date(existingPerson.mandateStartDate).toLocaleDateString('fr-FR')}
                                    </p>
                                </div>
                            )}
                            <p className="text-sm text-amber-700 font-medium">
                                ⚠️ Si vous confirmez, le mandat du coordinateur actuel sera terminé et le nouveau coordinateur prendra sa place.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleReplaceCancel}>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReplaceConfirm} className="bg-amber-600 hover:bg-amber-700">
                            Oui, remplacer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {invitationLink && (
                <Alert className="mb-6 border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Invitation créée avec succès !</AlertTitle>
                    <AlertDescription className="mt-2 space-y-3">
                        <p className="text-sm text-green-700">
                            L'utilisateur a été créé dans Kinde. Envoyez-lui ce lien pour qu'il puisse accepter l'invitation :
                        </p>
                        <div className="flex items-center gap-2">
                            <Input
                                value={invitationLink}
                                readOnly
                                className="font-mono text-xs bg-white"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={copyToClipboard}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setInvitationLink(null);
                                    form.reset();
                                }}
                            >
                                Inviter un autre utilisateur
                            </Button>
                            <Button
                                type="button"
                                onClick={() => router.push('/dashboard/users')}
                            >
                                Retour à la liste
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit((values) => onSubmit(values))} className="space-y-8 max-w-lg">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="email@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="John Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="national_coordinator">National Coordinator</SelectItem>
                                        <SelectItem value="site_coordinator">Site Coordinator</SelectItem>
                                        <SelectItem value="small_group_leader">Small Group Leader</SelectItem>
                                        <SelectItem value="member">Member</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {(selectedRole === 'site_coordinator' || selectedRole === 'small_group_leader' || selectedRole === 'member') && (
                        <FormField
                            control={form.control}
                            name="siteId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Site</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a site" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {sites.map((site) => (
                                                <SelectItem key={site.id} value={site.id}>
                                                    {site.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {(selectedRole === 'small_group_leader' || selectedRole === 'member') && (
                        <FormField
                            control={form.control}
                            name="smallGroupId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Small Group</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a small group" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {filteredSmallGroups.map((group) => (
                                                <SelectItem key={group.id} value={group.id}>
                                                    {group.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <Button type="submit" disabled={isLoading || !!invitationLink}>
                        {isLoading ? 'En cours...' : 'Inviter l\'utilisateur'}
                    </Button>
                </form>
            </Form>
        </>
    );
}
