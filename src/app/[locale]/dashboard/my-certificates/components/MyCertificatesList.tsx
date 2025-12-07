'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Certificate {
    id: string;
    role: string;
    entityName: string;
    generatedAt: Date;
    pdfUrl: string;
}

interface MyCertificatesListProps {
    certificates: Certificate[];
}

export function MyCertificatesList({ certificates }: MyCertificatesListProps) {
    const formatRole = (role: string) => {
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Mes Certificats ({certificates.length})</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Rôle</TableHead>
                            <TableHead>Entité</TableHead>
                            <TableHead>Date de Génération</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {certificates.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    Aucun certificat disponible
                                </TableCell>
                            </TableRow>
                        ) : (
                            certificates.map((cert) => (
                                <TableRow key={cert.id}>
                                    <TableCell className="font-medium">{formatRole(cert.role)}</TableCell>
                                    <TableCell>{cert.entityName}</TableCell>
                                    <TableCell>
                                        {format(new Date(cert.generatedAt), 'dd MMM yyyy', { locale: fr })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={cert.pdfUrl} target="_blank" rel="noopener noreferrer">
                                                <Download className="mr-2 h-4 w-4" />
                                                Télécharger
                                            </a>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
