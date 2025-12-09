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
import { Plus, Search, MoreHorizontal, Pencil, Trash } from 'lucide-react';
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
    initialUsers: (Profile & { site?: { name: string } | null, smallGroup?: { name: string } | null })[];
}

export default function UsersClient({ initialUsers }: UsersClientProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState(initialUsers);
    const t = useTranslations('Users');
    const tRoles = useTranslations('Roles');

    const filteredUsers = users.filter((user) =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRoleBadgeColor = (role: UserRole) => {
        switch (role) {
            case 'national_coordinator':
                return 'destructive';
            case 'site_coordinator':
                return 'default';
            case 'small_group_leader':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <Button onClick={() => router.push('/dashboard/users/new')}>
                    <Plus className="mr-2 h-4 w-4" /> {t('invite_user')}
                </Button>
            </div>

            <div className="flex items-center py-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('table.name')}</TableHead>
                            <TableHead>{t('table.email')}</TableHead>
                            <TableHead>{t('table.role')}</TableHead>
                            <TableHead>{t('table.site_group')}</TableHead>
                            <TableHead>{t('table.status')}</TableHead>
                            <TableHead className="text-right">{t('table.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={getRoleBadgeColor(user.role)}>
                                            {tRoles(user.role)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.site?.name || user.smallGroup?.name || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.status === 'active' ? 'outline' : 'secondary'}>
                                            {user.status === 'active' ? 'Active' : user.status}
                                            {/* Note: Status keys could be added to translations if needed, for now mostly 'active' */}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>{t('table.actions')}</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => router.push(`/dashboard/users/${user.id}/edit`)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> {t('actions.edit')}
                                                </DropdownMenuItem>

                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    {t('table.no_users')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
