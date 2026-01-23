import React from 'react';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Activity, Site } from '@prisma/client';

async function getRecentStories() {
    return await prisma.activity.findMany({
        where: {
            status: 'executed',
        },
        take: 3,
        orderBy: { date: 'desc' },
        include: {
            site: true
        }
    });
}

export async function SuccessStories() {
    const stories = await getRecentStories();

    if (stories.length === 0) return null;

    return (
        <div className="bg-slate-50 py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Histoires de Terrain</h2>
                    <p className="mt-4 text-lg text-slate-600">
                        Les dernières initiatives menées par nos jeunes leaders à travers le pays.
                    </p>
                </div>

                <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-3">
                    {stories.map((story: Activity & { site: Site | null }) => (
                        <Card key={story.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                            {/* Placeholder image if no image in DB (currently DB has no image field for activity, assuming future expansion) */}
                            <div className="h-48 w-full bg-slate-200 flex items-center justify-center text-slate-400">
                                <span className="text-sm">Image de l&apos;activité</span>
                            </div>
                            <CardHeader>
                                <div className="flex items-center gap-x-4 text-xs text-slate-500 mb-2">
                                    <time dateTime={story.date.toISOString()} className="flex items-center">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        {format(new Date(story.date), 'd MMM yyyy', { locale: fr })}
                                    </time>
                                    <span className="flex items-center">
                                        <User className="h-3 w-3 mr-1" />
                                        {story.site?.name || 'National'}
                                    </span>
                                </div>
                                <CardTitle className="mt-3 text-lg font-semibold leading-6 text-slate-900 group-hover:text-slate-600">
                                    {story.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-600">
                                    {story.thematic || "Aucune thématique disponible."}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
