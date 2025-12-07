import React from 'react';
import { ImpactHero } from './components/ImpactHero';
import { ImpactStats } from './components/ImpactStats';
import { SuccessStories } from './components/SuccessStories';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ImpactPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Navigation Header (Simplified) */}
            <header className="absolute inset-x-0 top-0 z-50">
                <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
                    <div className="flex lg:flex-1">
                        <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2 font-bold text-white text-xl">
                            <span className="bg-blue-600 rounded-md p-1">AYLF</span> Impact
                        </Link>
                    </div>
                    <div className="lg:flex lg:flex-1 lg:justify-end">
                        <Link href="/login" className="text-sm font-semibold leading-6 text-white hover:text-blue-200">
                            Connexion <span aria-hidden="true">&rarr;</span>
                        </Link>
                    </div>
                </nav>
            </header>

            <main>
                <ImpactHero />
                <ImpactStats />
                <SuccessStories />

                {/* Footer Call to Action */}
                <div className="bg-slate-900 py-16 text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-6">Prêt à faire la différence ?</h2>
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-500" asChild>
                        <Link href="/login">Rejoindre la plateforme</Link>
                    </Button>
                </div>
            </main>

            <footer className="bg-slate-950 py-12 text-center text-slate-500 text-sm">
                <p>&copy; {new Date().getFullYear()} AYLF Group Tracker. Tous droits réservés.</p>
            </footer>
        </div>
    );
}
