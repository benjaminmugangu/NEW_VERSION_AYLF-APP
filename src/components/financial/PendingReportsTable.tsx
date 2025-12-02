'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PendingReport {
    id: string;
    title: string;
    activityDate: string;
    submissionDate: string;
    submittedByName: string;
    siteName?: string;
    smallGroupName?: string;
    totalExpenses?: number;
    currency?: string;
    participantsCountReported?: number;
    status: 'pending' | 'approved' | 'rejected';
}

interface PendingReportsTableProps {
    reports: PendingReport[];
}

export default function PendingReportsTable({ reports }: PendingReportsTableProps) {
    const router = useRouter();
    const [selectedReport, setSelectedReport] = useState<PendingReport | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const pendingReports = reports.filter(r => r.status === 'pending');

    const handleApproveClick = (report: PendingReport) => {
        setSelectedReport(report);
        setActionType('approve');
    };

    const handleRejectClick = (report: PendingReport) => {
        setSelectedReport(report);
        setActionType('reject');
        setRejectReason('');
    };

    const handleConfirmApprove = async () => {
        if (!selectedReport) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/reports/${selectedReport.id}/approve`, {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to approve report');
            }

            alert(data.message || 'Rapport approuvé avec succès');
            setSelectedReport(null);
            setActionType(null);
            router.refresh();
        } catch (error: any) {
            console.error('Error approving report:', error);
            alert(error.message || 'Erreur lors de l\'approbation du rapport');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmReject = async () => {
        if (!selectedReport || !rejectReason.trim()) {
            alert('Veuillez fournir une raison pour le rejet');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`/api/reports/${selectedReport.id}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: rejectReason }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reject report');
            }

            alert(data.message || 'Rapport rejeté');
            setSelectedReport(null);
            setActionType(null);
            setRejectReason('');
            router.refresh();
        } catch (error: any) {
            console.error('Error rejecting report:', error);
            alert(error.message || 'Erreur lors du rejet du rapport');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setSelectedReport(null);
        setActionType(null);
        setRejectReason('');
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Rapports en Attente de Validation
                    </CardTitle>
                    <CardDescription>
                        {pendingReports.length} rapport(s) à valider
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {pendingReports.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Aucun rapport en attente</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Titre</TableHead>
                                    <TableHead>Entité</TableHead>
                                    <TableHead>Soumis par</TableHead>
                                    <TableHead>Date Activité</TableHead>
                                    <TableHead>Participants</TableHead>
                                    <TableHead>Dépenses</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingReports.map((report) => (
                                    <TableRow key={report.id}>
                                        <TableCell className="font-medium">{report.title}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {report.siteName && (
                                                    <span className="text-sm">{report.siteName}</span>
                                                )}
                                                {report.smallGroupName && (
                                                    <Badge variant="outline" className="w-fit">
                                                        {report.smallGroupName}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{report.submittedByName}</TableCell>
                                        <TableCell>
                                            {format(new Date(report.activityDate), 'dd MMM yyyy', { locale: fr })}
                                        </TableCell>
                                        <TableCell>{report.participantsCountReported || '-'}</TableCell>
                                        <TableCell>
                                            {report.totalExpenses ? (
                                                <div className="flex items-center gap-1">
                                                    <DollarSign className="h-4 w-4" />
                                                    <span className="font-medium">
                                                        {report.totalExpenses} {report.currency || 'USD'}
                                                    </span>
                                                </div>
                                            ) : (
                                                '-'
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleApproveClick(report)}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Approuver
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleRejectClick(report)}
                                                >
                                                    <XCircle className="h-4 w-4 mr-1" />
                                                    Rejeter
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={actionType === 'approve'} onOpenChange={(open) => !open && handleCancel()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approuver le Rapport</DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir approuver ce rapport ?
                        </DialogDescription>
                    </DialogHeader>
                    {selectedReport && (
                        <div className="space-y-2">
                            <p><strong>Titre :</strong> {selectedReport.title}</p>
                            <p><strong>Soumis par :</strong> {selectedReport.submittedByName}</p>
                            {selectedReport.totalExpenses && (
                                <p className="p-3 bg-green-50 border border-green-200 rounded-md">
                                    <strong className="text-green-700">⚡ Action automatique :</strong>
                                    <br />
                                    Une transaction de dépense de{' '}
                                    <strong>{selectedReport.totalExpenses} {selectedReport.currency || 'USD'}</strong> sera créée automatiquement.
                                </p>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                            Annuler
                        </Button>
                        <Button onClick={handleConfirmApprove} disabled={isLoading}>
                            {isLoading ? 'Traitement...' : 'Confirmer l\'Approbation'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={actionType === 'reject'} onOpenChange={(open) => !open && handleCancel()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rejeter le Rapport</DialogTitle>
                        <DialogDescription>
                            Veuillez fournir une raison pour le rejet de ce rapport.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedReport && (
                        <div className="space-y-4">
                            <p><strong>Titre :</strong> {selectedReport.title}</p>
                            <div>
                                <label className="text-sm font-medium">Raison du rejet</label>
                                <Textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Ex: Justificatifs manquants, montant incohérent..."
                                    className="mt-2"
                                    rows={4}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmReject}
                            disabled={isLoading || !rejectReason.trim()}
                        >
                            {isLoading ? 'Traitement...' : 'Confirmer le Rejet'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
