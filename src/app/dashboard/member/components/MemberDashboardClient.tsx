'use client';

import React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, User, Award, Calendar } from 'lucide-react';

interface MemberDashboardClientProps {
    userName: string;
    groupName?: string;
    siteName?: string;
    upcomingActivities: any[];
}

export function MemberDashboardClient({ userName, groupName, siteName, upcomingActivities }: MemberDashboardClientProps) {
    return (
        <>
            <PageHeader
                title={`Welcome, ${userName}!`}
                description={groupName ? `Member of ${groupName} (${siteName})` : 'Welcome to AYLF Group Tracker'}
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Quick Links Card */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><User className="text-primary" /> My Profile</CardTitle>
                        <CardDescription>Manage your personal information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button asChild variant="outline" className="w-full justify-start">
                            <Link href="/dashboard/settings/profile">
                                <User className="mr-2 h-4 w-4" />
                                View Profile
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full justify-start">
                            <Link href="/dashboard/my-certificates">
                                <Award className="mr-2 h-4 w-4" />
                                My Certificates
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Upcoming Activities Card */}
                <Card className="shadow-lg md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Calendar className="text-primary" /> Upcoming Activities</CardTitle>
                        <CardDescription>Activities planned for your group.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {upcomingActivities.length > 0 ? (
                            <div className="space-y-4">
                                {upcomingActivities.map((activity) => (
                                    <div key={activity.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                        <div>
                                            <h4 className="font-semibold">{activity.title}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(activity.date).toLocaleDateString()} - {activity.startTime || 'TBD'}
                                            </p>
                                            <p className="text-sm">{activity.location || 'No location specified'}</p>
                                        </div>
                                        <Button asChild size="sm">
                                            <Link href={`/dashboard/activities/${activity.id}`}>View Details</Link>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-8">No upcoming activities found.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
