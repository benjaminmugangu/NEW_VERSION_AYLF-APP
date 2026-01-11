'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Calendar, DollarSign, MapPin, User, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import type { FundAllocation, User as UserType } from '@/lib/types';

interface AllocationDetailClientProps {
    allocation: FundAllocation;
    user: UserType;
    locale: string;
}

export function AllocationDetailClient({ allocation, user, locale }: AllocationDetailClientProps) {
    const t = useTranslations('Finances');
    const tCommon = useTranslations('Common');
    const tActivityLevel = useTranslations('ActivityLevel');

    const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(allocation.amount);

    const formattedDate = new Date(allocation.allocationDate).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const senderName = allocation.allocatedByName || tCommon('unknown');
    const sourceName = allocation.fromSiteName || tActivityLevel('national');

    let recipientName: string;
    let recipientType: string;

    if (allocation.siteId && !allocation.smallGroupId) {
        recipientName = allocation.siteName || tCommon('unknown');
        recipientType = tActivityLevel('site');
    } else if (allocation.smallGroupId) {
        recipientName = allocation.smallGroupName || tCommon('unknown');
        recipientType = tActivityLevel('smallGroup');
    } else {
        recipientName = tActivityLevel('national');
        recipientType = tActivityLevel('national');
    }

    return (
        <>
            <PageHeader
                title={t('allocationDetails')}
                description={t('allocationDetailsDescription')}
                icon={DollarSign}
            />

            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <Link href={`/${locale}/dashboard/finances`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {tCommon('back')}
                        </Button>
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">
                                    {formattedAmount}
                                </CardTitle>
                                <CardDescription>
                                    {t('allocation')} • {formattedDate}
                                </CardDescription>
                            </div>
                            <Badge variant={allocation.amount > 0 ? 'success' : 'destructive'} className="text-lg px-4 py-2">
                                {allocation.amount > 0 ? t('received') : t('sent')}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Sender/Source Section */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <MapPin className="h-5 w-5" />
                                    {t('sender_source')}
                                </h3>
                                <div className="space-y-2 pl-7">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('source')}</p>
                                        <p className="font-medium">{sourceName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('allocatedBy')}</p>
                                        <p className="font-medium flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            {senderName}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Recipient Section */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Building className="h-5 w-5" />
                                    {t('recipient')}
                                </h3>
                                <div className="space-y-2 pl-7">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('type')}</p>
                                        <p className="font-medium">{recipientType}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{tCommon('name')}</p>
                                        <p className="font-medium">{recipientName}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Additional Information */}
                        <div className="border-t pt-4 space-y-2">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                {t('allocationInformation')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('allocationId')}</p>
                                    <p className="font-mono text-sm">{allocation.id}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{tCommon('date')}</p>
                                    <p>{formattedDate}</p>
                                </div>
                            </div>
                        </div>

                        {allocation.notes && (
                            <div className="border-t pt-4">
                                <h3 className="font-semibold text-lg mb-2">{tCommon('notes')}</h3>
                                <p className="text-muted-foreground pl-7">{allocation.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
