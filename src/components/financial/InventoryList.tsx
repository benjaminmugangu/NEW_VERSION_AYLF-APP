'use client';

import { useState, useEffect } from 'react';
import { Package, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getCurrentStock } from '@/services/inventoryService';
import type { InventoryItem, InventoryMovement, Site } from '@prisma/client';

interface InventoryListProps {
    items: (InventoryItem & {
        site: { name: string } | null;
        movements: InventoryMovement[];
    })[];
}

export function InventoryList({ items }: InventoryListProps) {
    const [stocks, setStocks] = useState<Record<string, number>>({});

    useEffect(() => {
        const loadStocks = async () => {
            const stockData: Record<string, number> = {};
            for (const item of items) {
                try {
                    stockData[item.id] = await getCurrentStock(item.id);
                } catch {
                    stockData[item.id] = 0;
                }
            }
            setStocks(stockData);
        };
        loadStocks();
    }, [items]);

    const getCategoryColor = (category?: string | null) => {
        switch (category) {
            case 'equipment':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'supplies':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'furniture':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Site</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Recent Activity</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                No inventory items found. Add your first item to get started.
                            </TableCell>
                        </TableRow>
                    ) : (
                        items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <div>{item.name}</div>
                                            {item.description && (
                                                <div className="text-xs text-muted-foreground">{item.description}</div>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {item.category && (
                                        <Badge variant="outline" className={getCategoryColor(item.category)}>
                                            {item.category}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>{item.site?.name || '—'}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">{stocks[item.id] ?? '—'}</span>
                                        {stocks[item.id] !== undefined && stocks[item.id] <= 5 && (
                                            <Badge variant="destructive" className="text-xs">
                                                Low Stock
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>{item.unit || '—'}</TableCell>
                                <TableCell>
                                    {item.movements.length > 0 ? (
                                        <div className="flex flex-col gap-1">
                                            {item.movements.slice(0, 2).map((movement) => (
                                                <div key={movement.id} className="flex items-center gap-1 text-xs">
                                                    {movement.direction === 'in' ? (
                                                        <TrendingUp className="h-3 w-3 text-green-600" />
                                                    ) : (
                                                        <TrendingDown className="h-3 w-3 text-red-600" />
                                                    )}
                                                    <span className={movement.direction === 'in' ? 'text-green-600' : 'text-red-600'}>
                                                        {Number(movement.quantity)}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {movement.reason || movement.direction}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">No movements</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
