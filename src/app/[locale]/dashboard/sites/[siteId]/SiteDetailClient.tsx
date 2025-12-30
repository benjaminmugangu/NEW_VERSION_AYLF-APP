"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getInitials } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
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
import { Building, Users, Eye, Edit, Trash2, PlusCircle } from 'lucide-react';
import type { Site, SmallGroup } from '@/lib/types';
import * as siteService from '@/services/siteService';
import * as smallGroupService from '@/services/smallGroupService';
import { Breadcrumbs } from '@/components/ui-custom/Breadcrumbs';
import { EmptyState } from '@/components/ui-custom/EmptyState';

import { CoordinatorHistoryClient } from '@/app/[locale]/dashboard/history/coordinators/components/CoordinatorHistoryClient';
import type { CoordinatorHistory } from '@/services/coordinatorHistoryService';

interface SiteDetailClientProps {
  site: Site;
  initialSmallGroups: SmallGroup[];
  totalMembers: number;
  canManageSite: boolean;
  historyData: CoordinatorHistory[];
}

export default function SiteDetailClient({ site, initialSmallGroups, totalMembers, canManageSite, historyData }: SiteDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [smallGroups, setSmallGroups] = useState(initialSmallGroups);
  const [groupToDelete, setGroupToDelete] = useState<SmallGroup | null>(null);
  const [isDeletingSite, setIsDeletingSite] = useState(false);

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      await smallGroupService.deleteSmallGroup(groupToDelete.id);
      setSmallGroups(smallGroups.filter(sg => sg.id !== groupToDelete.id));
      toast({ title: 'Success', description: `Group "${groupToDelete.name}" has been deleted.` });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setGroupToDelete(null);
    }
  };

  const handleDeleteSite = async () => {
    if (!site) return;
    try {
      await siteService.deleteSite(site.id);
      toast({ title: 'Success', description: `Site "${site.name}" has been deleted.` });
      router.push('/dashboard/sites');
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setIsDeletingSite(false);
    }
  };

  const hasCoordinator = !!site.coordinator?.name;
  const coordinatorName = site.coordinator?.name || 'Aucun coordinateur assigné';
  const coordinatorInitials = hasCoordinator ? getInitials(coordinatorName) : '?';

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Sites', href: '/dashboard/sites' },
          { label: site.name },
        ]}
        className="mb-6"
      />

      <PageHeader
        title={site.name}
        description={`Detailed view of the ${site.name} site.`}
        icon={Building}
        actions={
          canManageSite && (
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/sites/${site.id}/edit`}>
                <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit Site</Button>
              </Link>
              <Button variant="destructive" onClick={() => setIsDeletingSite(true)}><Trash2 className="mr-2 h-4 w-4" /> Delete Site</Button>
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
              <p><strong>Location:</strong> {site.city}, {site.country}</p>
              <p><strong>Total Members:</strong> {totalMembers}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Site Coordinator</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar className={`h-16 w-16 ${!hasCoordinator ? "opacity-40" : ""}`}>
              <AvatarImage src={`https://avatar.vercel.sh/${coordinatorName}.png`} alt={coordinatorName} />
              <AvatarFallback>{coordinatorInitials}</AvatarFallback>
            </Avatar>
            <div>
              <p className={`font-semibold text-lg ${!hasCoordinator ? "text-muted-foreground italic" : ""}`}>
                {coordinatorName}
              </p>
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
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Small Group</Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {smallGroups.length > 0 ? (
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
                {smallGroups.map((sg) => (
                  <TableRow key={sg.id}>
                    <TableCell className="font-medium">{sg.name}</TableCell>
                    <TableCell>
                      {sg.leaderName ? (
                        sg.leaderName
                      ) : (
                        <span className="text-muted-foreground italic text-sm">Aucun leader assigné</span>
                      )}
                    </TableCell>
                    <TableCell>{sg.memberCount}</TableCell>
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
          ) : (
            <EmptyState
              title="No Small Groups"
              description="There are no small groups assigned to this site yet."
              icon={Users}
              actionLabel={canManageSite ? "Add Small Group" : undefined}
              onAction={canManageSite ? () => router.push(`/dashboard/sites/${site.id}/small-groups/new`) : undefined}
              className="border-none shadow-none min-h-[200px]"
            />
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <CoordinatorHistoryClient
          initialData={historyData}
          title="Historique des Coordinateurs du Site"
          hideFilters={true}
        />
      </div>

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
    </>
  );
}
