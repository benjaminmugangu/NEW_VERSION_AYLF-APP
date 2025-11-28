import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface PageSkeletonProps {
    type?: 'table' | 'card' | 'detail';
    rowCount?: number;
}

export function PageSkeleton({ type = 'table', rowCount = 5 }: PageSkeletonProps) {
    if (type === 'table') {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-[250px]" />
                    <Skeleton className="h-8 w-[100px]" />
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Skeleton className="h-4 w-[100px]" /></TableHead>
                                <TableHead><Skeleton className="h-4 w-[150px]" /></TableHead>
                                <TableHead><Skeleton className="h-4 w-[100px]" /></TableHead>
                                <TableHead className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: rowCount }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-[80px] ml-auto" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }

    if (type === 'card') {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border bg-card text-card-foreground shadow">
                        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </div>
                        <div className="p-6 pt-0">
                            <Skeleton className="h-8 w-[60px] mb-2" />
                            <Skeleton className="h-4 w-[140px]" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Detail view skeleton
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[300px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-[100px]" />
                    <Skeleton className="h-10 w-[100px]" />
                </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-[200px] rounded-xl" />
                <Skeleton className="h-[200px] rounded-xl" />
            </div>
            <Skeleton className="h-[400px] rounded-xl" />
        </div>
    );
}
