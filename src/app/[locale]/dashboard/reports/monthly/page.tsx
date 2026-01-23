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
                description="Créez des rapports narratifs professionnels basés sur les données d&apos;activités."
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
            {narrative && stats && (
                <div className="space-y-6">
                    {/* 1. KPIs Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-green-50/50">
                            <CardContent className="pt-6">
                                <div className="text-2xl font-bold text-green-700">{stats.metrics.growthRate}%</div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Croissance Membres</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-blue-50/50">
                            <CardContent className="pt-6">
                                <div className="text-2xl font-bold text-blue-700">{stats.metrics.retentionRate}%</div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Taux de Rétention</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-purple-50/50">
                            <CardContent className="pt-6">
                                <div className="text-2xl font-bold text-purple-700">{stats.metrics.conversionRate}%</div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Taux de Conversion</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 2. Detailed Data Sections */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Narratives Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Synthèse Narrative</CardTitle>
                                    <CardDescription>Éditez le texte généré par l&apos;IA pour le rapport final.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Introduction</Label>
                                        <Textarea
                                            value={narrative.intro}
                                            onChange={(e) => updateNarrative('intro', e.target.value)}
                                            className="min-h-[120px]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Bilan Général (une phrase par ligne)</Label>
                                        <Textarea
                                            value={getSummaryText()}
                                            onChange={(e) => updateNarrative('generalSummary', e.target.value)}
                                            className="min-h-[120px]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Conclusion</Label>
                                        <Textarea
                                            value={narrative.conclusion}
                                            onChange={(e) => updateNarrative('conclusion', e.target.value)}
                                            className="min-h-[100px]"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Detailed Tables Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Données Détaillées par Site</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="relative overflow-x-auto border rounded-lg">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-700 text-xs uppercase">
                                                <tr>
                                                    <th className="px-4 py-3">Site</th>
                                                    <th className="px-4 py-3">Act.</th>
                                                    <th className="px-4 py-3">Part.</th>
                                                    <th className="px-4 py-3">Dépenses</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {stats.sitePerformance.map((site: any) => (
                                                    <tr key={site.id} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3 font-medium">{site.name}</td>
                                                        <td className="px-4 py-3">{site.activitiesCount}</td>
                                                        <td className="px-4 py-3">{site.participantsCount}</td>
                                                        <td className="px-4 py-3 font-mono text-xs">{site.expenses.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Performance des Petits Groupes</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="relative overflow-x-auto border rounded-lg">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-700 text-xs uppercase">
                                                <tr>
                                                    <th className="px-4 py-3">Petit Groupe</th>
                                                    <th className="px-4 py-3">Act.</th>
                                                    <th className="px-4 py-3">Moy. Présence</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {stats.smallGroupPerformance.map((sg: any) => (
                                                    <tr key={sg.id} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3 font-medium">{sg.name}</td>
                                                        <td className="px-4 py-3">{sg.activitiesCount}</td>
                                                        <td className="px-4 py-3">{sg.averageAttendance}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar: Financials and Export */}
                        <div className="space-y-6">
                            <Card className="border-blue-100 bg-blue-50/30">
                                <CardHeader>
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        Bilan Financier
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center bg-white p-2 rounded border">
                                        <span className="text-xs text-muted-foreground">Revenus</span>
                                        <span className="text-sm font-bold text-green-600">{stats.financials.totalIncome.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-2 rounded border">
                                        <span className="text-xs text-muted-foreground">Dépenses</span>
                                        <span className="text-sm font-bold text-red-600">{stats.financials.totalExpenses.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-3 rounded border border-blue-200 bg-blue-50/50">
                                        <span className="text-sm font-bold">Solde</span>
                                        <span className="text-lg font-black text-blue-700">{stats.financials.balance.toLocaleString()}</span>
                                    </div>

                                    <div className="pt-4 border-t space-y-2">
                                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Catégories de dépenses</p>
                                        {Object.entries(stats.financials.byCategory as Record<string, number>).map(([cat, val]) => (
                                            <div key={cat} className="flex justify-between text-xs">
                                                <span>{cat}</span>
                                                <span className="font-medium">{val.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-900 text-white border-none shadow-xl">
                                <CardHeader>
                                    <CardTitle className="text-white text-lg flex items-center gap-2">
                                        <FileText className="h-5 w-5" /> Export Final
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-slate-400 text-xs">
                                        Vérifiez bien toutes les données ci-contre avant de générer le rapport PDF officiel.
                                    </p>
                                    <MonthlyReportDownloader
                                        narrative={narrative}
                                        stats={stats}
                                        period={stats?.period?.label || dateFilter.display || 'Période'}
                                        fileName={`Report_Detailed_${(stats?.period?.label || 'export').replace(/[^a-z0-9]/gi, '_')}.pdf`}
                                        label="Télécharger le Rapport Complet"
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
