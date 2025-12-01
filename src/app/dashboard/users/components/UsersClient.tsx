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

interface UsersClientProps {
    initialUsers: (Profile & { site?: { name: string } | null, smallGroup?: { name: string } | null })[];
}

export default function UsersClient({ initialUsers }: UsersClientProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState(initialUsers);

    const filteredUsers = users.filter((user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
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
                <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                <Button onClick={() => router.push('/dashboard/users/new')}>
                    <Plus className="mr-2 h-4 w-4" /> Invite User
                </Button>
            </div>

            <div className="flex items-center py-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
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
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Site / Group</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant={getRoleBadgeColor(user.role)}>
                                        {user.role.replace('_', ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {user.site?.name || user.smallGroup?.name || '-'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={user.status === 'active' ? 'outline' : 'secondary'}>
                                        {user.status}
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
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => router.push(`/dashboard/users/${user.id}/edit`)}>
                                                <Pencil className="mr-2 h-4 w-4" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-red-600">
                                                <Trash className="mr-2 h-4 w-4" /> Deactivate
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
