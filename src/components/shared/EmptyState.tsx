import { LucideIcon } from 'lucide-react';
import React from 'react';

interface EmptyStateProps {
    title: string;
    description: string;
    icon: LucideIcon;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center bg-card rounded-lg border border-dashed animate-in fade-in-50 ${className}`}>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4 transition-colors group-hover:bg-muted">
                <Icon className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
            {action && (
                <div className="mt-2">
                    {action}
                </div>
            )}
        </div>
    );
}
