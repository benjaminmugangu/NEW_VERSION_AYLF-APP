'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, RefreshCw, Wand2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ReportNarrative } from '@/services/monthlyStatsService';
import { DateRangeFilter, DateFilterValue, getDateRangeFromFilterValue } from '@/components/shared/DateRangeFilter';
import { format } from 'date-fns';
import { AIAssistantButton } from '@/components/ai/AIAssistantButton';
import dynamic from 'next/dynamic';

const MonthlyReportDownloader = dynamic(
    () => import('@/components/pdf/MonthlyReportDownloader'),
    {
        ssr: false,
        loading: () => <Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Préparation PDF...</Button>
    }
);



export default function MonthlyReportPage() {
    const { toast } = useToast();

    // Date Filter State
    const [dateFilter, setDateFilter] = useState<DateFilterValue>({
        rangeKey: 'this_month',
        display: 'This Month'
    });

    const [loading, setLoading] = useState(false);

    // Editable State
    const [narrative, setNarrative] = useState<ReportNarrative | null>(null);
    // Stats state needed for PDF
    const [stats, setStats] = useState<any>(null);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            let query = '';
            const range = getDateRangeFromFilterValue(dateFilter);

            if (range?.startDate && range?.endDate) {
                query = `?from=${range.startDate.toISOString()}&to=${range.endDate.toISOString()}`;
            } else {
                // Fallback defaults
                const now = new Date();
                query = `?month=${now.getMonth() + 1}&year=${now.getFullYear()}`;
            }

            const res = await fetch(`/api/reports/monthly${query}`);
            if (!res.ok) throw new Error('Erreur lors de la génération');

            const data = await res.json();
            setNarrative(data.narrative);
            setStats(data.stats);

            toast({ title: 'Rapport généré', description: 'Vous pouvez maintenant éditer le contenu avant le téléchargement.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de générer le rapport.' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const updateNarrative = (field: keyof ReportNarrative, value: string) => {
        if (!narrative) return;

        // For bullets/summary which is string[], we handle it specifically if needed, 
        // but here we might treat the textarea as source of truth and split on render?
        // Actually, our State uses the exact type ReportNarrative. 
        // BUT for editing, it's easier to handle text blocks.

        // Let's assume generalSummary is managed as a newline-separated string in UI 
        // and converted back to array for PDF.
        // Wait, the state `narrative` matches the type `ReportNarrative` where `generalSummary` is `string[]`.
        // So for the UI update:
        if (field === 'generalSummary') {
            const lines = value.split('\n');
            setNarrative({ ...narrative, [field]: lines });
        } else {
            setNarrative({ ...narrative, [field]: value });
        }
    };

    // Helper to join array for textarea
    const getSummaryText = () => narrative?.generalSummary.join('\n') || '';

    return (
        <div className="space-y-6">
            <PageHeader
                title="Générateur de Rapport Mensuel"
                description="Créez des rapports narratifs professionnels basés sur les données d'activités."
                icon={FileText}
            />

            {/* Generator Controls */}
            <Card>
                <CardHeader>
                    <CardTitle>Sélection de la Période</CardTitle>
                    <CardDescription>Choisissez la période pour laquelle générer le rapport.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <Label className="mb-2 block">Période</Label>
                        <DateRangeFilter
                            onFilterChange={setDateFilter}
                            initialRangeKey="this_month"
                        />
                    </div>

                    <Button onClick={handleGenerate} disabled={loading} className="min-w-[150px]">
                        {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        {loading ? 'Génération...' : 'Générer Brouillon'}
                    </Button>
                </CardContent>
            </Card>

            {/* Editor & Preview */}
            {narrative && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Editor Side */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>Édition du contenu</CardTitle>
                            <CardDescription>Modifiez le texte généré pour personnaliser le rapport.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>1. Introduction</Label>
                                    <AIAssistantButton
                                        textToImprove={narrative.intro}
                                        onApply={(val) => updateNarrative('intro', val)}
                                    />
                                </div>
                                <Textarea
                                    value={narrative.intro}
                                    onChange={(e) => updateNarrative('intro', e.target.value)}
                                    className="min-h-[150px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>2. Bilan Général (une phrase par ligne)</Label>
                                <Textarea
                                    value={getSummaryText()}
                                    onChange={(e) => updateNarrative('generalSummary', e.target.value)}
                                    className="min-h-[150px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>3. Participation</Label>
                                <Textarea
                                    value={narrative.participation}
                                    onChange={(e) => updateNarrative('participation', e.target.value)}
                                    className="min-h-[100px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>4. Sites Actifs (liste textuelle)</Label>
                                <Textarea
                                    value={narrative.activeSites}
                                    onChange={(e) => updateNarrative('activeSites', e.target.value)}
                                    className="min-h-[100px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>5. Conclusion</Label>
                                    <AIAssistantButton
                                        textToImprove={narrative.conclusion}
                                        onApply={(val) => updateNarrative('conclusion', val)}
                                    />
                                </div>
                                <Textarea
                                    value={narrative.conclusion}
                                    onChange={(e) => updateNarrative('conclusion', e.target.value)}
                                    className="min-h-[100px]"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Side */}
                    <div className="space-y-6">
                        <Card className="bg-slate-50 border-blue-100">
                            <CardHeader>
                                <CardTitle className="text-blue-900">Rapport Prêt</CardTitle>
                                <CardDescription>
                                    Une fois satisfait du contenu ci-contre, téléchargez la version officielle.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="p-4 bg-white rounded border border-slate-200 mb-6 shadow-sm">
                                    <h3 className="font-serif font-bold text-center underline mb-4">Aperçu Rapide</h3>
                                    <p className="text-xs text-muted-foreground text-center mb-4 italic">(Le PDF aura une mise en page officielle)</p>
                                    <div className="text-xs space-y-2 max-h-[400px] overflow-y-auto font-serif">
                                        <p className="whitespace-pre-wrap">{narrative.intro}</p>
                                        <hr className="my-2" />
                                        <ul className="list-disc pl-4">
                                            {narrative.generalSummary.map((l, i) => <li key={i}>{l}</li>)}
                                        </ul>
                                    </div>
                                </div>

                                <MonthlyReportDownloader
                                    narrative={narrative}
                                    stats={stats}
                                    period={stats?.period?.label || dateFilter.display || 'Période Personnalisée'}
                                    fileName={`Rapport_${(stats?.period?.label || 'export').replace(/[^a-z0-9]/gi, '_')}.pdf`}
                                    label="Télécharger le Rapport Officiel (PDF)"
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
