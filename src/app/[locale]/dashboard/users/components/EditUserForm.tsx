'use client';

import { useState, useMemo } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { UserRole } from '@prisma/client';
import { useTranslations } from 'next-intl';

// ...

interface EditUserFormProps {
    user: {
        id: string;
        name: string;
        email: string;
        role: UserRole;
        siteId?: string | null;
        smallGroupId?: string | null;
        status?: string | null;
    };
    sites: { id: string; name: string }[];
    smallGroups: { id: string; name: string; siteId: string }[];
}

export default function EditUserForm({ user, sites, smallGroups }: EditUserFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const t = useTranslations('Users');
    const tRoles = useTranslations('Roles');

    const formSchema = useMemo(() => z.object({
        role: z.nativeEnum(UserRole),
        siteId: z.string().optional().nullable(),
        smallGroupId: z.string().optional().nullable(),
        status: z.enum(['active', 'inactive', 'invited']).optional(),
    }), []); // Schema is static for now, but could use t if validation messages were custom

    type FormSchemaType = z.infer<typeof formSchema>;

    const form = useForm<FormSchemaType>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            role: user.role,
            siteId: user.siteId || undefined,
            smallGroupId: user.smallGroupId || undefined,
            status: (user.status as 'active' | 'inactive' | 'invited') || 'active',
        },
    });

    const selectedRole = form.watch('role');
    const selectedSiteId = form.watch('siteId');

    const filteredSmallGroups = smallGroups.filter(
        (group) => !selectedSiteId || group.siteId === selectedSiteId
    );

    async function onSubmit(values: FormSchemaType) {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/admin/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update user');
            }

            toast({
                title: t('forms.success_update'),
                description: t('forms.success_update'),
            });
            router.push('/dashboard/users');
            router.refresh();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'Something went wrong',
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
                <div className="space-y-2">
                    <h3 className="text-lg font-medium">{t('forms.update_details', { name: user.name })}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t('table.name')}: {user.name} <br />
                        {t('table.email')}: {user.email}
                    </p>
                </div>

                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('forms.status_label')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('forms.select_status')} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="invited">Invited</SelectItem>
                                </SelectContent>
                            </Select>
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
                                    <SelectItem value="national_coordinator">{tRoles('national_coordinator')}</SelectItem>
                                    <SelectItem value="site_coordinator">{tRoles('site_coordinator')}</SelectItem>
                                    <SelectItem value="small_group_leader">{tRoles('small_group_leader')}</SelectItem>
                                    <SelectItem value="member">{tRoles('member')}</SelectItem>
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
                                <FormLabel>{t('forms.site_label')}</FormLabel>
                                <Select
                                    onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                                    defaultValue={field.value || undefined}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('forms.select_site')} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
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
                                <FormLabel>{t('forms.group_label')}</FormLabel>
                                <Select
                                    onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                                    defaultValue={field.value || undefined}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('forms.select_group')} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
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

                <Button type="submit" disabled={isLoading}>
                    {isLoading ? t('forms.updating') : t('forms.update_user')}
                </Button>
            </form>
        </Form>
    );
}
