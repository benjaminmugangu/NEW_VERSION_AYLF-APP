'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
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
import { CheckCircle, Copy, AlertTriangle, CalendarIcon } from 'lucide-react';
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/lib/constants';

interface InviteUserFormProps {
    readonly sites: { id: string; name: string }[];
    readonly smallGroups: { id: string; name: string; siteId: string }[];
}

interface ConflictData {
    conflictType: 'SITE_COORDINATOR' | 'SMALL_GROUP_LEADER';
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
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    const [isLoading, setIsLoading] = useState(false);
    const [invitationLink, setInvitationLink] = useState<string | null>(null);
    const [conflictData, setConflictData] = useState<ConflictData | null>(null);
    const t = useTranslations('Users');
    const tRoles = useTranslations('Roles');

    // Context / RBAC flags
    const isSiteCoord = currentUser?.role === ROLES.SITE_COORDINATOR;
    const isSGL = currentUser?.role === ROLES.SMALL_GROUP_LEADER;

    // Filter roles based on permissions to prevent escalation
    const allowedRoles = useMemo(() => {
        const roles = [
            { value: 'MEMBER', label: tRoles('MEMBER') },
            { value: 'SMALL_GROUP_LEADER', label: tRoles('SMALL_GROUP_LEADER') },
            { value: 'SITE_COORDINATOR', label: tRoles('SITE_COORDINATOR') },
            { value: 'NATIONAL_COORDINATOR', label: tRoles('NATIONAL_COORDINATOR') },
        ];

        if (isSGL) return roles.filter(r => r.value === 'MEMBER');
        if (isSiteCoord) return roles.filter(r => r.value === 'MEMBER' || r.value === 'SMALL_GROUP_LEADER');
        return roles;
    }, [isSGL, isSiteCoord, tRoles]);

    const formSchema = useMemo(() => z.object({
        email: z.string().email(t('forms.email_error')),
        name: z.string().min(2, t('forms.name_error')),
        role: z.nativeEnum(UserRole),
        siteId: z.string().optional(),
        smallGroupId: z.string().optional(),
        mandateStartDate: z.string().optional(),
    }), [t]);

    type FormSchemaType = z.infer<typeof formSchema>;

    const [pendingInvitation, setPendingInvitation] = useState<FormSchemaType | null>(null);

    const form = useForm<FormSchemaType>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            name: '',
            role: 'MEMBER' as UserRole,
            // Context injection
            siteId: isSiteCoord && currentUser.siteId ? currentUser.siteId : undefined,
            smallGroupId: isSGL && currentUser.smallGroupId ? currentUser.smallGroupId : undefined,
        },
    });

    const selectedRole = form.watch('role');
    const selectedSiteId = form.watch('siteId');

    const filteredSmallGroups = smallGroups.filter(
        (group) => !selectedSiteId || group.siteId === selectedSiteId
    );

    async function onSubmit(values: FormSchemaType, replaceExisting = false, existingCoordinatorId?: string) {
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
                if (response.status === 409 && (data.conflictType === 'SITE_COORDINATOR' || data.conflictType === 'SMALL_GROUP_LEADER')) {
                    setConflictData(data);
                    setPendingInvitation(values);
                    setIsLoading(false);
                    return;
                }
                throw new Error(data.error || 'Failed to invite user');
            }

            queryClient.invalidateQueries({ queryKey: ['users'] });

            const baseUrl = globalThis.location.origin;
            const inviteLink = `${baseUrl}/auth/accept-invitation?token=${data.invitation.token}`;
            setInvitationLink(inviteLink);

            toast({
                title: t('forms.success_invite'),
                description: t('forms.success_invite_desc'),
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
                title: t('forms.copy_link'),
                description: t('forms.copy_link'),
            });
        }
    };

    const handleReplaceConfirm = async () => {
        if (!pendingInvitation || !conflictData) return;
        const existingPerson = conflictData.existingCoordinator || conflictData.existingLeader;
        if (!existingPerson) return;
        await onSubmit(pendingInvitation, true, existingPerson.id);
        setConflictData(null);
        setPendingInvitation(null);
    };

    const handleReplaceCancel = () => {
        setConflictData(null);
        setPendingInvitation(null);
    };

    const existingPerson = conflictData?.existingCoordinator || conflictData?.existingLeader;

    return (
        <>
            <AlertDialog open={!!conflictData} onOpenChange={(open) => !open && handleReplaceCancel()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            <AlertDialogTitle>{t('forms.conflict_title')}</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="space-y-3 pt-3">
                            <p>{conflictData?.error}</p>
                            {existingPerson && (
                                <div className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-1">
                                    <p className="text-sm font-medium text-slate-900">Coordinateur actuel :</p>
                                    <p className="text-sm"><strong>{t('table.name')} :</strong> {existingPerson.name}</p>
                                    <p className="text-sm"><strong>{t('table.email')} :</strong> {existingPerson.email}</p>
                                    <p className="text-sm">
                                        <strong>{t('forms.mandate_start_label')} :</strong>{' '}
                                        {new Date(existingPerson.mandateStartDate).toLocaleDateString()}
                                    </p>
                                </div>
                            )}
                            <p className="text-sm text-amber-700 font-medium">
                                ⚠️ {t('forms.conflict_desc')}
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleReplaceCancel}>{t('delete_dialog.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReplaceConfirm} className="bg-amber-600 hover:bg-amber-700">
                            {t('forms.yes_replace')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {invitationLink && (
                <Alert className="mb-6 border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">{t('forms.success_invite')}</AlertTitle>
                    <AlertDescription className="mt-2 space-y-3">
                        <p className="text-sm text-green-700">
                            {t('forms.success_invite_desc')}
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
                                {t('forms.invite_another')}
                            </Button>
                            <Button
                                type="button"
                                onClick={() => router.push('/dashboard/users')}
                            >
                                {t('forms.back_list')}
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
                                <FormLabel>{t('forms.email_label')}</FormLabel>
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
                                <FormLabel>{t('forms.name_label')}</FormLabel>
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
                                <FormLabel>{t('forms.role_label')}</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('forms.select_role')} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {allowedRoles.map(role => (
                                            <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {(selectedRole === 'SITE_COORDINATOR' || selectedRole === 'SMALL_GROUP_LEADER' || selectedRole === 'MEMBER') && (
                        <FormField
                            control={form.control}
                            name="siteId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('forms.site_label')}</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        value={field.value}
                                        disabled={isSiteCoord || isSGL}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('forms.select_site')} />
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

                    {(selectedRole === 'SMALL_GROUP_LEADER' || selectedRole === 'MEMBER') && (
                        <FormField
                            control={form.control}
                            name="smallGroupId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('forms.group_label')}</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        value={field.value}
                                        disabled={isSGL}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('forms.select_group')} />
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

                    <FormField
                        control={form.control}
                        name="mandateStartDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>{t('forms.mandate_start_label')}</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={`w-full pl-3 text-left font-normal ${field.value ? "" : "text-muted-foreground"}`}
                                            >
                                                {field.value ? (
                                                    new Date(field.value).toLocaleDateString()
                                                ) : (
                                                    <span>{t('forms.pick_date')}</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value ? new Date(field.value) : undefined}
                                            onSelect={(date) => field.onChange(date?.toISOString())}
                                            disabled={(date) =>
                                                date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" disabled={isLoading || !!invitationLink}>
                        {isLoading ? t('forms.sending') : t('forms.send_invitation')}
                    </Button>
                </form>
            </Form>
        </>
    );
}
