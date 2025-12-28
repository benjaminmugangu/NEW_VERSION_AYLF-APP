'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Eye, FileText } from 'lucide-react';
import { DataFilter } from '@/components/ui-custom/DataFilter';
import { EmptyState } from '@/components/ui-custom/EmptyState';

interface Report {
    id: string;
    title: string;
    level: string;
    status: string;
    submissionDate: Date;
    submittedBy: {
        name: string;
    };
    site?: {
        name: string;
    } | null;
    smallGroup?: {
        name: string;
    } | null;
    activityType: {
        name: string;
    };
}

interface PendingReportsClientProps {
    readonly reports: Report[];
    readonly userRole: string;
}

export default function PendingReportsClient({ reports, userRole }: PendingReportsClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [selectedReport, setSelectedReport] = useState<string | null>(null);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [reviewNotes, setReviewNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const canApprove = userRole === 'NATIONAL_COORDINATOR';

    const filteredReports = reports.filter(report =>
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.submittedBy.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleApprove = async (reportId: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/reports/${reportId}/approve`, {
                method: 'PATCH',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to approve report');
            }

            toast({
                title: 'Succès',
                description: 'Rapport approuvé avec succès',
            });
            router.refresh();
        } catch (error) {
            console.error('Error approving report:', error);
            const { getClientErrorMessage } = await import('@/lib/clientErrorHandler');
            const errorMessage = getClientErrorMessage(error);
            toast({
                title: 'Erreur lors de l\'approbation',
                description: errorMessage,
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRejectClick = (reportId: string) => {
        setSelectedReport(reportId);
        setRejectDialogOpen(true);
    };

    const handleRejectConfirm = async () => {
        if (!selectedReport || !reviewNotes.trim()) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Veuillez fournir des notes de révision',
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`/api/reports/${selectedReport}/reject`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviewNotes }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to reject report');
            }

            toast({
                title: 'Succès',
                description: 'Rapport rejeté avec succès',
            });
            setRejectDialogOpen(false);
            setReviewNotes('');
            setSelectedReport(null);
            router.refresh();
        } catch (error) {
            const { getClientErrorMessage } = await import('@/lib/clientErrorHandler');
            const errorMessage = getClientErrorMessage(error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getLevelBadge = (level: string) => {
        const colors: Record<string, string> = {
            national: 'bg-purple-100 text-purple-800',
            site: 'bg-blue-100 text-blue-800',
            small_group: 'bg-green-100 text-green-800',
        };

        const getLevelLabel = (l: string) => {
            if (l === 'small_group') return 'Petit Groupe';
            if (l === 'site') return 'Site';
            return 'National';
        };

        return (
            <Badge className={colors[level] || 'bg-gray-100 text-gray-800'}>
                {getLevelLabel(level)}
            </Badge>
        );
    };

    return (
        <>
            <DataFilter
                searchPlaceholder="Rechercher par titre ou auteur..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                className="mb-4"
            />

            {filteredReports.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Titre</TableHead>
                            <TableHead>Niveau</TableHead>
                            <TableHead>Soumis par</TableHead>
                            <TableHead>Site/Groupe</TableHead>
                            <TableHead>Date</TableHead>
                            {canApprove && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredReports.map((report) => (
                            <TableRow key={report.id}>
                                <TableCell className="font-medium">{report.title}</TableCell>
                                <TableCell>{getLevelBadge(report.level)}</TableCell>
                                <TableCell>{report.submittedBy.name}</TableCell>
                                <TableCell>
                                    {report.smallGroup?.name || report.site?.name || '-'}
                                </TableCell>
                                <TableCell>{format(new Date(report.submissionDate), 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => router.push(`/dashboard/reports/${report.id}`)}
                                        >
                                            <Eye className="h-4 w-4 mr-1" />
                                            Voir
                                        </Button>
                                        {canApprove && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => handleApprove(report.id)}
                                                    disabled={isLoading}
                                                >
                                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                                    Approuver
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleRejectClick(report.id)}
                                                    disabled={isLoading}
                                                >
                                                    <XCircle className="h-4 w-4 mr-1" />
                                                    Rejeter
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <EmptyState
                    title="Aucun rapport en attente"
                    description={searchTerm ? "Aucun rapport ne correspond à votre recherche." : "Il n'y a pas de rapports en attente de validation pour le moment."}
                    icon={FileText}
                    className="border-none shadow-none"
                />
            )}

            <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Rejeter le rapport</AlertDialogTitle>
                        <AlertDialogDescription>
                            Veuillez fournir une raison pour le rejet de ce rapport.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea
                        placeholder="Notes de révision..."
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={4}
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRejectConfirm} disabled={!reviewNotes.trim() || isLoading}>
                            Confirmer le rejet
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
