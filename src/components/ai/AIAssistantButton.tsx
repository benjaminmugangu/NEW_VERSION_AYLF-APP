'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wand2, Loader2, SpellCheck, FileText, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface AIAssistantButtonProps {
    textToImprove: string;
    onApply: (newText: string) => void;
    className?: string;
    label?: string; // Optional label override
}

export const AIAssistantButton = ({ textToImprove, onApply, className, label }: AIAssistantButtonProps) => {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleAction = async (action: 'improve' | 'summary' | 'fix_spelling') => {
        if (!textToImprove || textToImprove.trim().length === 0) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Le texte est vide.' });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, text: textToImprove }),
            });

            if (!response.ok) throw new Error('Erreur API');

            const data = await response.json();
            onApply(data.result);
            toast({ title: 'Succès', description: 'Texte amélioré par l\'IA !' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de contacter l\'IA.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={className} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Wand2 className="mr-2 h-3 w-3 text-purple-600" />}
                    {loading ? 'IA en cours...' : (label || 'Assistant IA')}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions IA</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAction('improve')}>
                    <Sparkles className="mr-2 h-4 w-4" /> Améliorer le style
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction('fix_spelling')}>
                    <SpellCheck className="mr-2 h-4 w-4" /> Corriger l&apos;orthographe
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAction('summary')}>
                    <FileText className="mr-2 h-4 w-4" /> Générer un résumé
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
