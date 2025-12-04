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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { UserRole } from '@prisma/client';

const formSchema = z.object({
    role: z.nativeEnum(UserRole),
    siteId: z.string().optional().nullable(),
    smallGroupId: z.string().optional().nullable(),
    status: z.enum(['active', 'inactive', 'invited']).optional(),
});

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

    const form = useForm<z.infer<typeof formSchema>>({
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

    async function onSubmit(values: z.infer<typeof formSchema>) {
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
                title: 'Success',
                description: 'User updated successfully',
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
                    <h3 className="text-lg font-medium">User Details</h3>
                    <p className="text-sm text-muted-foreground">
                        Name: {user.name} <br />
                        Email: {user.email}
                    </p>
                </div>

                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
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
                                <Select
                                    onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                                    defaultValue={field.value || undefined}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a site" />
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
                                <FormLabel>Small Group</FormLabel>
                                <Select
                                    onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                                    defaultValue={field.value || undefined}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a small group" />
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
                    {isLoading ? 'Updating...' : 'Update User'}
                </Button>
            </form>
        </Form>
    );
}
