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
import { CheckCircle, Copy } from 'lucide-react';

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

export default function InviteUserForm({ sites, smallGroups }: InviteUserFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [invitationLink, setInvitationLink] = useState<string | null>(null);

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

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            const data = await response.json();

            if (!response.ok) {
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

    return (
        <>
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
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
