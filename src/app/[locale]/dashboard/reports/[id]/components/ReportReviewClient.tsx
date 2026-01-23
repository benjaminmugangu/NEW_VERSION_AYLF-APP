"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ReportWithDetails, User } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
    CheckCircle2,
    XCircle,
    ArrowLeft,
    Calendar,
    MapPin,
    Users,
    DollarSign,
    FileText,
    User as UserIcon,
    Clock,
    ExternalLink,
    MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ReportReviewClientProps {
    report: ReportWithDetails;
    currentUser: User;
}

export default function ReportReviewClient({ report, currentUser }: ReportReviewClientProps) {
    const router = useRouter();
    const locale = useLocale();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const isNC = currentUser.role === ROLES.NATIONAL_COORDINATOR;
    const isPending = report.status === 'pending' || report.status === 'submitted';
    const canAct = isNC && isPending;

    const handleApprove = async () => {
        setIsProcessing(true);
        try {
            const response = await fetch(`/api/reports/${report.id}/approve`, {
                method: 'POST', // The route.ts uses POST with withApiRLS
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to approve report');
            }

            toast({
                title: "Rapport Approuvé",
                description: "Le rapport a été approuvé et les transactions financières ont été générées.",
            });
            router.refresh();
        } catch (error: any) {
            console.error('Approve Error:', error);
            toast({
                title: "Erreur",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            toast({
                title: "Raison requise",
                description: "Veuillez fournir une raison pour le rejet.",
                variant: "destructive",
            });
            return;
        }

        setIsProcessing(true);
        try {
            const response = await fetch(`/api/reports/${report.id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rejectionReason }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to reject report');
            }

            toast({
                title: "Rapport Rejeté",
                description: "Le rapport a été rejeté et l'auteur a été notifié.",
            });
            setRejectDialogOpen(false);
            router.refresh();
        } catch (error: any) {
            console.error('Reject Error:', error);
            toast({
                title: "Erreur",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const statusColors = {
        pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
        submitted: "bg-blue-100 text-blue-800 border-blue-200",
        approved: "bg-green-100 text-green-800 border-green-200",
        rejected: "bg-red-100 text-red-800 border-red-200",
    };

    return (
        <div className="max-w-5xl mx-auto pb-12">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className={cn("px-3 py-1 text-sm font-medium capitalize", statusColors[report.status as keyof typeof statusColors])}>
                        {report.status}
                    </Badge>
                    {report.level && (
                        <Badge variant="secondary" className="px-3 py-1 text-sm font-medium capitalize">
                            {report.level.replace('_', ' ')}
                        </Badge>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">{report.title}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> Activité du {format(new Date(report.activityDate), "PPP")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Report Content */}
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" /> Description de l'activité
                                </h3>
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {report.content}
                                </p>
                            </div>

                            {/* Financial Summary if exists */}
                            {report.financialSummary && (
                                <div className="p-4 rounded-lg bg-muted/30 border">
                                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                                        <DollarSign className="h-4 w-4 text-primary" /> Résumé financier
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {report.financialSummary}
                                    </p>
                                </div>
                            )}

                            {/* Images Grid */}
                            {report.images && report.images.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold">Photos de l'activité</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {report.images.map((img, idx) => (
                                            <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border group">
                                                <Image
                                                    src={img.url}
                                                    alt={img.name}
                                                    fill
                                                    className="object-cover transition-transform group-hover:scale-105"
                                                />
                                                <a
                                                    href={img.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                                >
                                                    <ExternalLink className="text-white h-6 w-6" />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Rejection Note Display */}
                    {report.status === 'rejected' && (report.rejectionReason || report.reviewNotes) && (
                        <Card className="border-red-200 bg-red-50/30 dark:bg-red-950/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-red-800 dark:text-red-400 flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" /> Justification du rejet
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    {report.rejectionReason || report.reviewNotes}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar / Stats & Metadata */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">Détails de l'événement</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Thématique</Label>
                                <p className="text-sm font-medium">{report.thematic}</p>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Type d'activité</Label>
                                <Badge variant="outline" className="font-normal capitalize">
                                    {report.activityTypeName || 'N/A'}
                                </Badge>
                            </div>

                            <div className="pt-2 border-t space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Users className="h-4 w-4" /> Participants
                                    </span>
                                    <span className="font-semibold">{report.participantsCountReported || 0}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-center">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100">
                                        <span className="block text-blue-600 dark:text-blue-400 font-bold">{report.boysCount || 0}</span>
                                        <span className="text-muted-foreground">Garçons</span>
                                    </div>
                                    <div className="bg-pink-50 dark:bg-pink-900/20 p-2 rounded border border-pink-100">
                                        <span className="block text-pink-600 dark:text-pink-400 font-bold">{report.girlsCount || 0}</span>
                                        <span className="text-muted-foreground">Filles</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 border-t space-y-1">
                                <Label className="text-xs text-muted-foreground">Lieu / Affectation</Label>
                                <p className="text-sm font-medium flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    {report.smallGroupName || report.siteName || "National"}
                                </p>
                            </div>

                            <div className="pt-2 border-t space-y-1">
                                <Label className="text-xs text-muted-foreground">Finance</Label>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-primary">
                                        {report.totalExpenses ? new Intl.NumberFormat('fr-FR').format(report.totalExpenses) : 0} {report.currency || 'USD'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">Soumission</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                    <UserIcon className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{report.submittedByName}</p>
                                    <p className="text-xs text-muted-foreground">Auteur du rapport</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                Soumis le {format(new Date(report.submissionDate), "PPp")}
                            </div>
                        </CardContent>
                        {canAct && (
                            <CardFooter className="flex flex-col gap-2 pt-0">
                                <Button
                                    className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                                    disabled={isProcessing}
                                    onClick={handleApprove}
                                >
                                    <CheckCircle2 className="h-4 w-4" /> Approuver le rapport
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
                                    disabled={isProcessing}
                                    onClick={() => setRejectDialogOpen(true)}
                                >
                                    <XCircle className="h-4 w-4" /> Rejeter le rapport
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </div>
            </div>

            {/* Reject Dialog */}
            <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Rejeter le rapport</AlertDialogTitle>
                        <AlertDialogDescription>
                            Veuillez expliquer pourquoi ce rapport est rejeté. L'auteur recevra une notification avec ce message pour pouvoir le corriger.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <Textarea
                            placeholder="Ex: Les photos sont floues, ou le montant des dépenses ne correspond pas..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleReject(); }}
                            disabled={isProcessing || !rejectionReason.trim()}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Confirmer le Rejet
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
