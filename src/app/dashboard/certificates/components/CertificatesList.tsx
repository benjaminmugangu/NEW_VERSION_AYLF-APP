'use client';

import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Certificate {
    id: string;
    coordinatorName: string;
    role: string;
    entityName: string;
    generatedAt: Date;
    pdfUrl: string;
}

interface CertificatesListProps {
    initialCertificates: Certificate[];
}

export function CertificatesList({ initialCertificates }: CertificatesListProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCertificates = initialCertificates.filter((cert) =>
        cert.coordinatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.entityName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatRole = (role: string) => {
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par nom ou entité..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Certificats Générés ({filteredCertificates.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Coordinateur</TableHead>
                                <TableHead>Rôle</TableHead>
                                <TableHead>Entité</TableHead>
                                <TableHead>Date de Génération</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCertificates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Aucun certificat trouvé
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCertificates.map((cert) => (
                                    <TableRow key={cert.id}>
                                        <TableCell className="font-medium">{cert.coordinatorName}</TableCell>
                                        <TableCell>{formatRole(cert.role)}</TableCell>
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
        </div>
    );
}
