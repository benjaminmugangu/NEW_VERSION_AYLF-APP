"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Trash2, Eye, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { SiteWithDetails } from '@/lib/types';
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
import { useToast } from '@/hooks/use-toast';
import { getInitials } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface SitesListProps {
  initialSites: SiteWithDetails[];
  canEditSite: boolean;
  canDeleteSite: boolean;
}

export function SitesList({ initialSites, canEditSite, canDeleteSite }: SitesListProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [sites, setSites] = useState(initialSites);
  const [siteToDelete, setSiteToDelete] = useState<SiteWithDetails | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredSites = useMemo(() => {
    if (!searchTerm) {
      return sites;
    }
    return sites.filter(site =>
      site.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sites, searchTerm]);

  const handleDeleteSite = async () => {
    if (!siteToDelete) return;
    setIsDeleting(true);
    try {
      const { deleteSite } = await import('@/services/siteService');
      await deleteSite(siteToDelete.id);

      setSites(prevSites => prevSites.filter(s => s.id !== siteToDelete.id));
      toast({ title: 'Success', description: 'Site deleted successfully.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
                    const hasCoordinator = !!site.coordinatorName;
                    const displayCoordinatorName = site.coordinatorName || "Aucun coordinateur assigné";

                    return (
                      <TableRow key={site.id}>
                        <TableCell className="font-medium">{site.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className={!hasCoordinator ? "opacity-40" : ""}>
                              {/* Assuming coordinator might not have a profile picture */}
                              <AvatarFallback>{hasCoordinator ? getInitials(displayCoordinatorName) : '?'}</AvatarFallback>
                            </Avatar>
                            <span className={!hasCoordinator ? "text-muted-foreground italic text-sm" : ""}>
                              {displayCoordinatorName}
                            </span>
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
