'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    FileText,
    TrendingUp,
    Calendar,
    UserPlus,
    AlertTriangle,
    Bell,
    ExternalLink,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

interface NotificationDetailsModalProps {
    notification: any | null;
    isOpen: boolean;
    onClose: () => void;
}

export function NotificationDetailsModal({ notification, isOpen, onClose }: NotificationDetailsModalProps) {
    if (!notification) return null;

    const renderMetadata = () => {
        if (!notification.metadata) return null;

        const metadata = notification.metadata;
        const type = notification.type;

        switch (type) {
            case 'REPORT_APPROVED':
            case 'REPORT_REJECTED':
            case 'NEW_REPORT':
                return (
                    <div className="space-y-3 mt-4 p-4 bg-muted rounded-lg border">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-muted-foreground">Rapport:</span>
                            <span className="text-sm font-semibold">{metadata.reportTitle}</span>
                        </div>
                        {metadata.reason && (
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-destructive">Raison du rejet:</span>
                                <p className="text-sm bg-destructive/10 p-2 rounded border border-destructive/20 italic">
                                    "{metadata.reason}"
                                </p>
                            </div>
                        )}
                        {metadata.submitterName && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">Soumis par:</span>
                                <span className="text-sm">{metadata.submitterName}</span>
                            </div>
                        )}
                    </div>
                );

            case 'ALLOCATION_RECEIVED':
                return (
                    <div className="space-y-3 mt-4 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-900/30">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">Montant reçu:</span>
                            <span className="text-lg font-bold text-green-600">
                                {new Intl.NumberFormat('fr-FR').format(metadata.amount)} FC
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-green-100 dark:border-green-800 pt-2">
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">Provenance:</span>
                            <span className="text-sm font-semibold">{metadata.fromEntity}</span>
                        </div>
                    </div>
                );

            case 'ACTIVITY_REMINDER':
                return (
                    <div className="space-y-3 mt-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-900/30">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Activité:</span>
                            <span className="text-sm font-semibold">{metadata.activityTitle}</span>
                        </div>
                    </div>
                );

            case 'USER_INVITED':
                return (
                    <div className="space-y-3 mt-4 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-900/30">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-orange-700 dark:text-orange-400">Membre:</span>
                            <span className="text-sm font-semibold">{metadata.memberName}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-orange-100 dark:border-orange-800 pt-2">
                            <span className="text-sm font-medium text-orange-700 dark:text-orange-400">Entité rejoint:</span>
                            <span className="text-sm">{metadata.entityName}</span>
                        </div>
                    </div>
                );

            case 'BUDGET_ALERT':
                return (
                    <div className="space-y-3 mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-900/30">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Entité:</span>
                            <span className="text-sm font-semibold">{metadata.entityName}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-amber-100 dark:border-amber-800 pt-2">
                            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Reste:</span>
                            <span className="text-lg font-bold text-amber-600">
                                {new Intl.NumberFormat('fr-FR').format(metadata.remainingAmount)} FC
                            </span>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    const getIcon = () => {
        switch (notification.type) {
            case 'REPORT_APPROVED': return <CheckCircle2 className="h-6 w-6 text-green-500" />;
            case 'REPORT_REJECTED': return <XCircle className="h-6 w-6 text-destructive" />;
            case 'ALLOCATION_RECEIVED': return <TrendingUp className="h-6 w-6 text-green-500" />;
            case 'ACTIVITY_REMINDER': return <Calendar className="h-6 w-6 text-blue-500" />;
            case 'BUDGET_ALERT': return <AlertTriangle className="h-6 w-6 text-amber-500" />;
            case 'NEW_REPORT': return <FileText className="h-6 w-6 text-primary" />;
            case 'USER_INVITED': return <UserPlus className="h-6 w-6 text-orange-500" />;
            default: return <Bell className="h-6 w-6 text-muted-foreground" />;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md overflow-hidden">
                <DialogHeader className="flex flex-row items-center gap-4 pb-2 border-b">
                    <div className="p-2 bg-muted rounded-full shrink-0">
                        {getIcon()}
                    </div>
                    <div className="space-y-1">
                        <DialogTitle className="text-xl leading-tight">{notification.title}</DialogTitle>
                        <DialogDescription className="text-xs">
                            Recue le {format(new Date(notification.createdAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="py-6">
                    <p className="text-base text-card-foreground leading-relaxed whitespace-pre-wrap">
                        {notification.message}
                    </p>

                    {renderMetadata()}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    {notification.link && (
                        <Button asChild className="w-full sm:flex-1" onClick={onClose}>
                            <Link href={notification.link}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Ouvrir le lien
                            </Link>
                        </Button>
                    )}
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                        Fermer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
