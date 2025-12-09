'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export function Breadcrumbs() {
    const pathname = usePathname();
    const t = useTranslations('Navigation'); // Assuming you have or will add keys here

    // Helper to remove locale from path if present (e.g., /en/dashboard -> /dashboard)
    // This depends on how next-intl handles paths. Usually pathname includes locale.
    // We'll split and filter.
    const segments = pathname.split('/').filter(Boolean);

    // Remove locale segment (fr, en, sw) if it's the first one
    const locales = ['fr', 'en', 'sw'];
    if (locales.includes(segments[0])) {
        segments.shift();
    }

    // If we are at root, don't show specific breadcrumbs or just Home
    if (segments.length === 0) return null;

    // We build cumulative paths
    // e.g. ["dashboard", "reports", "create"]
    // -> /en/dashboard, /en/dashboard/reports, /en/dashboard/reports/create
    // We need to re-prepend locale for Links if using next/link (or use next-intl's Link)
    // But standard Link with full path usually works if middleware handles it, 
    // or better use Link from `navigation` if using next-intl.
    // For now, let's just construct absolute paths including the current locale.

    const currentLocale = pathname.split('/')[1] || 'fr';

    return (
        <nav aria-label="Breadcrumb" className="mb-4 hidden md:block">
            <ol className="flex items-center space-x-2">
                <li>
                    <Link
                        href={`/${currentLocale}/dashboard`}
                        className="text-muted-foreground hover:text-primary transition-colors flex items-center"
                    >
                        <Home className="h-4 w-4" />
                        <span className="sr-only">Dashboard</span>
                    </Link>
                </li>

                {segments.map((segment, index) => {
                    // Skip "dashboard" since we have the Home icon for it
                    if (segment === 'dashboard') return null;

                    const isLast = index === segments.length - 1;
                    const href = `/${currentLocale}/${segments.slice(0, index + 1).join('/')}`;

                    // Rough simple translation or capitalization
                    // Ideally: t(`breadcrumbs.${segment}`)
                    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

                    return (
                        <li key={href} className="flex items-center">
                            <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                            {isLast ? (
                                <span className="font-medium text-foreground text-sm" aria-current="page">
                                    {label}
                                </span>
                            ) : (
                                <Link
                                    href={href}
                                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                                >
                                    {label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
