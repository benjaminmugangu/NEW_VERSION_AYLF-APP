'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnnualBudget, AnnualBudgetFormData, Financials } from '@/lib/types';
import { upsertAnnualBudget } from '@/services/annualBudgetService';
import { Loader2, Save, PiggyBank, History, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface BudgetManagerProps {
    currentBudgets: AnnualBudget[];
    financialStats: Financials | null;
}

export function BudgetManager({ currentBudgets, financialStats }: BudgetManagerProps) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);
    const currentYear = new Date().getFullYear();
    const currentBudget = currentBudgets.find(b => b.year === currentYear);

    const [form, setForm] = React.useState<AnnualBudgetFormData>({
        year: currentYear,
        totalAmount: currentBudget?.totalAmount || 0,
        currency: currentBudget?.currency || 'USD',
        description: currentBudget?.description || '',
        status: currentBudget?.status || 'active',
    });

    const handleSave = async () => {
        if (form.totalAmount <= 0) {
            toast({
                title: "Validation Error",
                description: "Le budget doit être supérieur à 0.",
                variant: "destructive"
            });
            return;
        }

        setIsSaving(true);
        try {
            const res = await upsertAnnualBudget(form);
            if (res.success) {
                toast({
                    title: "Budget Enregistré",
                    description: `Le budget pour l'année ${form.year} a été mis à jour avec succès.`,
                });
            } else {
                throw new Error(res.error?.message);
            }
        } catch (error: any) {
            toast({
                title: "Erreur",
                description: error.message || "Impossible d'enregistrer le budget.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-primary/20 shadow-lg">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <PiggyBank className="h-5 w-5 text-primary" />
                                Budget Annuel {currentYear}
                            </CardTitle>
                            {currentBudget?.status === 'active' && (
                                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> ACTIF
                                </span>
                            )}
                        </div>
                        <CardDescription>
                            {"Définissez l'enveloppe globale qui alimente la Caisse Centrale."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Montant Total (USD)</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="ex: 100000"
                                value={form.totalAmount}
                                onChange={(e) => setForm(prev => ({ ...prev, totalAmount: Number(e.target.value) }))}
                                className="text-lg font-bold"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Notes / Justification</Label>
                            <Textarea
                                id="description"
                                placeholder="Détails sur l'origine des fonds ou l'affectation stratégique..."
                                value={form.description}
                                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="year">Année</Label>
                                <Select
                                    value={form.year.toString()}
                                    onValueChange={(v) => setForm(prev => ({ ...prev, year: Number(v) }))}
                                >
                                    <SelectTrigger id="year">
                                        <SelectValue placeholder="Année" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={currentYear.toString()}>{currentYear}</SelectItem>
                                        <SelectItem value={(currentYear + 1).toString()}>{currentYear + 1}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="status">Statut</Label>
                                <Select
                                    value={form.status}
                                    onValueChange={(v) => setForm(prev => ({ ...prev, status: v as any }))}
                                >
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="Statut" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Actif (Ouvert)</SelectItem>
                                        <SelectItem value="closed">Clôturé (Fermé)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50/50 border-t mt-4 py-4">
                        <Button
                            className="w-full"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Enregistrer le Budget
                        </Button>
                    </CardFooter>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
                                {"État de la Réserve Centrale"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-primary">
                                {formatCurrency(financialStats?.centralReserve || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Fonds actuellement disponibles au Siège (HQ).
                            </p>
                            <div className="mt-4 pt-4 border-t space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Budget Alloué:</span>
                                    <span className="font-medium text-slate-700">{formatCurrency(financialStats?.annualBudget || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Déjà Envoyé Terrain:</span>
                                    <span className="font-medium text-orange-600">-{formatCurrency(financialStats?.totalAllocated || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Dépenses HQ:</span>
                                    <span className="font-medium text-red-600">-{formatCurrency(financialStats?.expenses || 0)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <History className="h-4 w-4" /> Historique Budgétaire
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {currentBudgets.length > 0 ? (
                                    currentBudgets.map(b => (
                                        <div key={b.id} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                            <div>
                                                <div className="font-bold">Budget {b.year}</div>
                                                <div className="text-xs text-muted-foreground">{b.description || 'Aucune note'}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono font-bold text-sm">{formatCurrency(b.totalAmount)}</div>
                                                <div className={`text-[10px] font-bold ${b.status === 'active' ? 'text-green-600' : 'text-slate-400'}`}>
                                                    {b.status.toUpperCase()}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 text-center text-sm text-muted-foreground italic">
                                        Aucun budget enregistré.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
