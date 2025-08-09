// src/app/dashboard/sites/[siteId]/page.tsx
"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSiteDetails } from '@/hooks/useSiteDetails';
import { useToast } from '@/hooks/use-toast';
import { getInitials } from '@/lib/utils';
import { ROLES } from '@/lib/constants';
import { RoleBasedGuard } from '@/components/shared/RoleBasedGuard';
import { PageHeader } from '@/components/shared/PageHeader';
import { SiteDetailSkeleton } from '@/components/shared/skeletons/SiteDetailSkeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Building, Users, Eye, Edit, Trash2, PlusCircle, Info } from 'lucide-react';
import type { SmallGroup } from '@/lib/types';

// A specific type for the small groups returned by our RPC, which includes the count
interface SmallGroupWithCount extends SmallGroup {
  members_count: number;
  leader_name: string;
}

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const { toast } = useToast();

  const { site, smallGroups, totalMembers, isLoading, isError, error, deleteSmallGroup, deleteSite, canManageSite } = useSiteDetails(siteId);

  const [groupToDelete, setGroupToDelete] = useState<SmallGroupWithCount | null>(null);
  const [isDeletingSite, setIsDeletingSite] = useState(false);

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      await deleteSmallGroup(groupToDelete.id);
      toast({ title: 'Success', description: `Group "${groupToDelete.name}" has been deleted.` });
    } catch (err) {
      console.error("Erreur détaillée lors de la suppression du groupe:", err);
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setGroupToDelete(null);
    }
  };

  const handleDeleteSite = async () => {
    if (!site) return;
    try {
      await deleteSite(site.id);
      toast({ title: 'Success', description: `Site "${site.name}" has been deleted.` });
      router.push('/dashboard/sites');
    } catch (err) {
      console.error("Erreur détaillée lors de la suppression du site:", err);
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setIsDeletingSite(false);
    }
  };

  if (isLoading) {
    return <SiteDetailSkeleton />;
  }

  if (isError) {
    return (
      <div className="text-center">
        <p className="text-lg font-semibold text-destructive">{(error as Error)?.message || 'Failed to load site details.'}</p>
        <Button onClick={() => router.push('/dashboard/sites')} className="mt-4">Go Back</Button>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="text-center">
        <p className="text-lg font-semibold">Site not found.</p>
        <Button onClick={() => router.push('/dashboard/sites')} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const coordinatorName = site.coordinator?.name || 'Not Assigned';
  const coordinatorInitials = getInitials(coordinatorName);

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR]}>
      <PageHeader 
        title={site.name} 
        description={`Detailed view of the ${site.name} site.`}
        icon={Building}
        actions={
          canManageSite && (
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/sites/${site.id}/edit`}>
                <Button variant="outline"><Edit className="mr-2 h-4 w-4"/> Edit Site</Button>
              </Link>
              <Button variant="destructive" onClick={() => setIsDeletingSite(true)}><Trash2 className="mr-2 h-4 w-4"/> Delete Site</Button>
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Site Information</CardTitle>
              <CardDescription>General details and coordinator information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center">
                <Info className="h-5 w-5 mr-3 text-primary" />
                <p><strong>Location:</strong> {site.city}, {site.country}</p>
              </div>
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-3 text-primary" />
                <p><strong>Total Members:</strong> {totalMembers}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Site Coordinator</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={`https://avatar.vercel.sh/${coordinatorName}.png`} alt={coordinatorName} />
              <AvatarFallback>{coordinatorInitials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{coordinatorName}</p>
              <p className="text-sm text-muted-foreground">{site.coordinator?.email || 'No email'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Small Groups</CardTitle>
              <CardDescription>All small groups operating under this site.</CardDescription>
            </div>
            {canManageSite && (
              <Link href={`/dashboard/sites/${site.id}/small-groups/new`}>
                <Button><PlusCircle className="mr-2 h-4 w-4"/> Add Small Group</Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {smallGroups.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group Name</TableHead>
                    <TableHead>Leader</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(smallGroups as SmallGroupWithCount[]).map((sg) => (
                    <TableRow key={sg.id}>
                      <TableCell className="font-medium">{sg.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://avatar.vercel.sh/${sg.leader_name}.png`} alt={sg.leader_name} />
                            <AvatarFallback>{getInitials(sg.leader_name)}</AvatarFallback>
                          </Avatar>
                          <span>{sg.leader_name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{sg.members_count}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" title="View Small Group Details (Future)" disabled><Eye className="h-4 w-4" /></Button>
                        {canManageSite && (
                          <>
                            <Link href={`/dashboard/sites/${site.id}/small-groups/${sg.id}/edit`}>
                              <Button variant="ghost" size="icon" title="Edit Small Group"><Edit className="h-4 w-4" /></Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete Small Group"
                              className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                              onClick={() => setGroupToDelete(sg)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No small groups found for this site.</p>
          )}
        </CardContent>
      </Card>
      <Button onClick={() => router.push('/dashboard/sites')} className="mt-6">Back to Sites List</Button>
      
      {/* Delete Group Dialog */}
      <AlertDialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the group <span className="font-semibold">{groupToDelete?.name}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Site Dialog */}
      <AlertDialog open={isDeletingSite} onOpenChange={setIsDeletingSite}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the site <span className="font-semibold">{site?.name}</span> and all its associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSite} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Site</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RoleBasedGuard>
  );
}
