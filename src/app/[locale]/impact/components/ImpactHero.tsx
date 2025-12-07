import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Heart } from 'lucide-react';
import Link from 'next/link';

export function ImpactHero() {
    return (
        <div className="relative isolate overflow-hidden bg-slate-900 py-24 sm:py-32">
            {/* Background pattern */}
            <div className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20 bg-[url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2671&auto=format&fit=crop')] bg-cover bg-center" />

            <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
                <div className="mx-auto max-w-2xl">
                    <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                        Ensemble, transformons des vies
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-slate-300">
                        Découvrez comment l'AYLF mobilise la jeunesse pour un leadership responsable et un impact communautaire durable à travers l'Afrique.
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-500" asChild>
                            <Link href="/login">
                                Rejoindre le mouvement <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button variant="outline" size="lg" className="text-white border-white hover:bg-white/10 hover:text-white" asChild>
                            <Link href="https://aylf.org" target="_blank">
                                En savoir plus
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
