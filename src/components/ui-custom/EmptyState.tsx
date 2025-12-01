import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    title: string;
    description: string;
    icon: LucideIcon;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    title,
    description,
    icon: Icon,
    actionLabel,
    onAction,
    className = '',
}: EmptyStateProps) {
    return (
        <div className={`flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50 ${className}`}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
                {description}
            </p>
            {actionLabel && onAction && (
                <Button onClick={onAction} variant="default">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
