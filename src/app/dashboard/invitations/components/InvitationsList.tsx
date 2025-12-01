'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Copy, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Invitation {
    id: string;
    email: string;
    role: string;
    token: string;
    status: string;
    createdAt: Date;
    site?: {
        id: string;
        name: string;
    } | null;
    smallGroup?: {
        id: string;
        name: string;
    } | null;
}

interface InvitationsListProps {
    invitations: Invitation[];
}

export function InvitationsList({ invitations }: InvitationsListProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const formatRole = (role: string) => {
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const copyInvitationLink = (token: string) => {
        const baseUrl = window.location.origin;
        const inviteLink = `${baseUrl}/auth/accept-invitation?token=${token}`;

        navigator.clipboard.writeText(inviteLink);
        toast({
            title: 'Lien copié ! 📋',
            description: 'Le lien d\'invitation a été copié dans le presse-papier.',
        });
    };

    const deleteInvitation = async (id: string, email: string) => {
        setDeletingId(id);
        try {
            const response = await fetch(`/api/admin/invitations/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete invitation');
            }

            toast({
                title: 'Invitation supprimée',
                description: `L'invitation pour ${email} a été supprimée.`,
            });

            router.refresh();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Impossible de supprimer l\'invitation.',
            });
        } finally {
            setDeletingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                        <Clock className="w-3 h-3 mr-1" />
                        En attente
                    </Badge>
                );
            case 'accepted':
                return (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Acceptée
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                        {status}
                    </Badge>
                );
        }
    };

    if (invitations.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                        Aucune invitation trouvée.
                    </p>
                    <p className="text-sm text-muted-foreground text-center mt-2">
                        Les invitations apparaîtront ici après leur création.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
    const acceptedInvitations = invitations.filter(inv => inv.status === 'accepted');

    return (
        <div className="space-y-6">
            {pendingInvitations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Invitations en attente ({pendingInvitations.length})</CardTitle>
                        <CardDescription>
                            Ces utilisateurs n'ont pas encore accepté leur invitation ou créé leur compte.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Rôle</TableHead>
                                    <TableHead>Site</TableHead>
                                    <TableHead>Groupe</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Créée le</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingInvitations.map((invitation) => (
                                    <TableRow key={invitation.id}>
                                        <TableCell className="font-medium">{invitation.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{formatRole(invitation.role)}</Badge>
                                        </TableCell>
                                        <TableCell>{invitation.site?.name || '-'}</TableCell>
                                        <TableCell>{invitation.smallGroup?.name || '-'}</TableCell>
                                        <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {formatDate(invitation.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyInvitationLink(invitation.token)}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={deletingId === invitation.id}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Supprimer l'invitation ?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Cette action supprimera l'invitation pour <strong>{invitation.email}</strong>.
                                                                Le lien d'invitation ne fonctionnera plus.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => deleteInvitation(invitation.id, invitation.email)}
                                                                className="bg-red-500 hover:bg-red-600"
                                                            >
                                                                Supprimer
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {acceptedInvitations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Invitations acceptées ({acceptedInvitations.length})</CardTitle>
                        <CardDescription>
                            Ces utilisateurs ont accepté leur invitation et se sont connectés au moins une fois.
                            Ils apparaissent dans la liste des utilisateurs.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Rôle</TableHead>
                                    <TableHead>Site</TableHead>
                                    <TableHead>Groupe</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Créée le</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {acceptedInvitations.map((invitation) => (
                                    <TableRow key={invitation.id}>
                                        <TableCell className="font-medium">{invitation.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{formatRole(invitation.role)}</Badge>
                                        </TableCell>
                                        <TableCell>{invitation.site?.name || '-'}</TableCell>
                                        <TableCell>{invitation.smallGroup?.name || '-'}</TableCell>
                                        <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {formatDate(invitation.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={deletingId === invitation.id}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Supprimer l'invitation ?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Cette action supprimera l'enregistrement de l'invitation pour <strong>{invitation.email}</strong>.
                                                            L'utilisateur restera actif dans le système.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => deleteInvitation(invitation.id, invitation.email)}
                                                            className="bg-red-500 hover:bg-red-600"
                                                        >
                                                            Supprimer
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
