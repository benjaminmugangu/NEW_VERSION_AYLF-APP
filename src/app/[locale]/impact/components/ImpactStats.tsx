import React from 'react';
import { prisma } from '@/lib/prisma';
import { Users, MapPin, Activity, Globe } from 'lucide-react';

async function getStats() {
    const memberCount = await prisma.member.count();
    const activityCount = await prisma.activity.count({ where: { status: 'executed' } });
    const siteCount = await prisma.site.count();
    const groupCount = await prisma.smallGroup.count();

    return { memberCount, activityCount, siteCount, groupCount };
}

export async function ImpactStats() {
    const stats = await getStats();

    const statItems = [
        { name: 'Membres Actifs', value: stats.memberCount, icon: Users, color: 'text-blue-600' },
        { name: 'Activités Réalisées', value: stats.activityCount, icon: Activity, color: 'text-green-600' },
        { name: 'Sites Opérationnels', value: stats.siteCount, icon: MapPin, color: 'text-red-600' },
        { name: 'Petits Groupes', value: stats.groupCount, icon: Globe, color: 'text-purple-600' },
    ];

    return (
        <div className="bg-white py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl lg:max-w-none text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Notre Impact en Chiffres</h2>
                    <p className="mt-4 text-lg text-slate-600">
                        Des données réelles mises à jour en temps réel depuis notre plateforme de gestion.
                    </p>
                </div>

                <dl className="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-4">
                    {statItems.map((stat) => (
                        <div key={stat.name} className="mx-auto flex max-w-xs flex-col gap-y-4">
                            <dt className="text-base leading-7 text-slate-600 flex flex-col items-center gap-2">
                                <stat.icon className={`h-8 w-8 ${stat.color} mb-2`} />
                                {stat.name}
                            </dt>
                            <dd className="order-first text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                                {stat.value.toLocaleString()}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
        </div>
    );
}
