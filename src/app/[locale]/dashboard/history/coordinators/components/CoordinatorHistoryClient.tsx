'use client';

import { useState } from 'react';
import { CoordinatorHistory } from '@/services/coordinatorHistoryService';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CoordinatorHistoryClientProps {
    initialData: CoordinatorHistory[];
    title?: string;
    hideFilters?: boolean;
}

export function CoordinatorHistoryClient({ initialData, title = "Historique des Mandats", hideFilters = false }: CoordinatorHistoryClientProps) {
    const [data, setData] = useState<CoordinatorHistory[]>(initialData);
    const [searchTerm, setSearchTerm] = useState('');
    const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const filteredData = data.filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.entityName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesEntityType = entityTypeFilter === 'all' || item.entityType === entityTypeFilter;

        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && item.isActive) ||
            (statusFilter === 'past' && !item.isActive);

        return matchesSearch && matchesEntityType && matchesStatus;
    });

    const formatRole = (role: string) => {
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="space-y-6">
            {!hideFilters && (
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Rechercher par nom, email ou entité..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Type d'entité" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Toutes les entités</SelectItem>
                                <SelectItem value="national">National</SelectItem>
                                <SelectItem value="site">Site</SelectItem>
                                <SelectItem value="small_group">Small Group</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Statut" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les statuts</SelectItem>
                                <SelectItem value="active">Actif</SelectItem>
                                <SelectItem value="past">Passé</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>{title} ({filteredData.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Rôle</TableHead>
                                <TableHead>Entité</TableHead>
                                <TableHead>Début Mandat</TableHead>
                                <TableHead>Fin Mandat</TableHead>
                                <TableHead>Durée</TableHead>
                                <TableHead>Statut</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        Aucun historique trouvé
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{item.name}</span>
                                                <span className="text-xs text-muted-foreground">{item.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatRole(item.role)}</TableCell>
                                        <TableCell>{item.entityName}</TableCell>
                                        <TableCell>
                                            {format(new Date(item.mandateStartDate), 'dd MMM yyyy', { locale: fr })}
                                        </TableCell>
                                        <TableCell>
                                            {item.mandateEndDate
                                                ? format(new Date(item.mandateEndDate), 'dd MMM yyyy', { locale: fr })
                                                : <span className="text-muted-foreground">-</span>
                                            }
                                        </TableCell>
                                        <TableCell>{item.duration}</TableCell>
                                        <TableCell>
                                            <Badge variant={item.isActive ? "default" : "secondary"}>
                                                {item.isActive ? 'Actif' : 'Terminé'}
                                            </Badge>
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
