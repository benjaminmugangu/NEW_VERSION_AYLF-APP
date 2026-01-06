// src/app/dashboard/users/components/UsersClient.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Search, MoreHorizontal, Pencil, Mail, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Profile, UserRole } from '@prisma/client';
import { useTranslations } from 'next-intl';

interface UsersClientProps {
    readonly initialUsers: (Profile & { readonly site?: { readonly name: string } | null, readonly smallGroup?: { readonly name: string } | null })[];
}

export default function UsersClient({ initialUsers }: UsersClientProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const t = useTranslations('Users');
    const tRoles = useTranslations('Roles');

    const filteredUsers = initialUsers.filter((user) =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRoleBadgeVariant = (role: UserRole) => {
        switch (role) {
            case 'NATIONAL_COORDINATOR': return 'destructive'; // Red
            case 'SITE_COORDINATOR': return 'default'; // Blue/Primary
            case 'SMALL_GROUP_LEADER': return 'secondary'; // Gray/Green tint
            default: return 'outline';
        }
    };

    const getInitials = (name?: string | null) => {
        if (!name) return '??';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getStatusColor = (status: string) => {
        return status === 'active' ? 'bg-green-500' : 'bg-gray-400';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground text-sm mt-1">{t('description') || "Manage all users across the platform"}</p>
                </div>
                <Button onClick={() => router.push('/dashboard/users/new')}>
                    <Plus className="mr-2 h-4 w-4" /> {t('invite_user')}
                </Button>
            </div>

            <div className="flex items-center py-4 bg-muted/40 p-4 rounded-lg border">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 bg-background"
                    />
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[300px]">{t('table.name')}</TableHead>
                            <TableHead>{t('table.role')}</TableHead>
                            <TableHead>{t('table.site_group')}</TableHead>
                            <TableHead>{t('table.status')}</TableHead>
                            <TableHead className="text-right">{t('table.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <UserAvatar user={user as any} size="md" />
                                            <div className="flex flex-col max-w-[200px]">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="font-medium truncate cursor-help">
                                                                {user.name || 'Unknown User'}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{user.name}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="text-xs text-muted-foreground truncate cursor-help">
                                                                {user.email}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{user.email}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getRoleBadgeVariant(user.role)} className="whitespace-nowrap shadow-sm">
                                            {tRoles(user.role)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            {user.site?.name ? (
                                                <span className="text-sm font-semibold text-foreground/90">
                                                    {user.site.name}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-muted-foreground italic">-</span>
                                            )}
                                            {user.smallGroup?.name && (
                                                <span className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                                                    {user.smallGroup.name}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className={`h-2.5 w-2.5 rounded-full ${getStatusColor(user.status || 'inactive')} ring-2 ring-background`} />
                                            <span className="capitalize text-sm font-medium text-muted-foreground">
                                                {user.status === 'active' ? 'Actif' : user.status}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[160px]">
                                                <DropdownMenuLabel>{t('table.actions')}</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => router.push(`/dashboard/users/${user.id}/edit`)}>
                                                    <Pencil className="mr-2 h-4 w-4 text-muted-foreground" /> {t('actions.edit')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => window.location.href = `mailto:${user.email}`}>
                                                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" /> {t('table.email') || "Email"}
                                                </DropdownMenuItem>
                                                {/* <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem> */}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Search className="h-8 w-8 opacity-20" />
                                        <p>{t('table.no_users')}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="text-xs text-muted-foreground text-center">
                Showing {filteredUsers.length} users
            </div>
        </div>
    );
}
