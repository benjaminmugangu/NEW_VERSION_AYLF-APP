"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Trash2, Eye, Search, Building, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { SiteWithDetails, User } from '@/lib/types';
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
import { useToast } from '@/components/ui/use-toast';
import { getInitials } from '@/lib/utils';
import * as siteService from '@/services/siteService';
import { ROLES } from '@/lib/constants';
import { StatCard } from '@/components/shared/StatCard';

interface SitesClientProps {
    initialSites: SiteWithDetails[];
    user: User;
    analytics: {
        totalSites: number;
        totalSmallGroups: number;
        totalMembers: number;
    };
}

export function SitesClient({ initialSites, user, analytics }: SitesClientProps) {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [sites, setSites] = useState(initialSites);
    const [siteToDelete, setSiteToDelete] = useState<SiteWithDetails | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const canCreateSite = user.role === ROLES.NATIONAL_COORDINATOR;
    const canEditSite = user.role === ROLES.NATIONAL_COORDINATOR;
    const canDeleteSite = user.role === ROLES.NATIONAL_COORDINATOR;

    const filteredSites = useMemo(() => {
        let visibleSites = sites;
        if (user.role === ROLES.SITE_COORDINATOR || user.role === ROLES.SMALL_GROUP_LEADER) {
            visibleSites = sites.filter(s => s.id === user.siteId);
        }

        if (!searchTerm) {
            return visibleSites;
        }
        return visibleSites.filter(site =>
            site.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sites, searchTerm, user.role, user.siteId]);

    const handleDeleteSite = async () => {
        if (!siteToDelete) return;
        setIsDeleting(true);
        try {
            await siteService.deleteSite(siteToDelete.id);
            setSites(prevSites => prevSites.filter(s => s.id !== siteToDelete.id));
            toast({ title: 'Success', description: 'Site deleted successfully.' });
        } catch (error) {
            console.error('Failed to delete site:', error);
            const { getClientErrorMessage } = await import('@/lib/clientErrorHandler');
            const errorMessage = getClientErrorMessage(error);
            toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
        } finally {
            setSiteToDelete(null);
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>All AYLF Sites</CardTitle>
                    <CardDescription>List of registered sites and their key information.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by site name..."
                                className="pl-8 w-full max-w-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Site Name</TableHead>
                                    <TableHead>Coordinator</TableHead>
                                    <TableHead>Total Members</TableHead>
                                    <TableHead>Total Small Groups</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSites.length > 0 ? (
                                    filteredSites.map(site => {
                                        const coordinatorName = site.coordinatorName || "N/A";
                                        return (
                                            <TableRow key={site.id}>
                                                <TableCell className="font-medium">{site.name}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar>
                                                            <AvatarImage src={site.coordinatorProfilePicture || undefined} />
                                                            <AvatarFallback>{getInitials(coordinatorName)}</AvatarFallback>
                                                        </Avatar>
                                                        <span>{coordinatorName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{site.membersCount}</TableCell>
                                                <TableCell>{site.smallGroupsCount}</TableCell>
                                                <TableCell className="text-right space-x-1">
                                                    <Link href={`/dashboard/sites/${site.id}`}>
                                                        <Button variant="ghost" size="icon" title="View Details"><Eye className="h-4 w-4" /></Button>
                                                    </Link>
                                                    {canEditSite && (
                                                        <Link href={`/dashboard/sites/${site.id}/edit`}>
                                                            <Button variant="ghost" size="icon" title="Edit Site"><Edit className="h-4 w-4" /></Button>
                                                        </Link>
                                                    )}
                                                    {canDeleteSite && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Delete Site"
                                                            className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                                                            onClick={() => setSiteToDelete(site)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center">
                                            {searchTerm ? `No sites found for "${searchTerm}".` : "No sites found."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {user.role === ROLES.NATIONAL_COORDINATOR && (
                <Card className="mt-8 shadow-lg">
                    <CardHeader>
                        <CardTitle>Overall Site Analytics</CardTitle>
                        <CardDescription>Key metrics for site engagement, growth, and activity levels across the network.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <StatCard
                                title="Total Sites"
                                value={analytics.totalSites}
                                icon={Building}
                                description="Number of operational sites"
                            />
                            <StatCard
                                title="Total Small Groups"
                                value={analytics.totalSmallGroups}
                                icon={UsersRound}
                                description="Across all sites"
                            />
                            <StatCard
                                title="Total Site Members"
                                value={analytics.totalMembers}
                                icon={UsersRound}
                                description="Members affiliated with any site"
                                href="/dashboard/members"
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            <AlertDialog open={!!siteToDelete} onOpenChange={(open) => !open && setSiteToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the site
                            <span className="font-semibold"> {siteToDelete?.name}</span> and all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteSite}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
