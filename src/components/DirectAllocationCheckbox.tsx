'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface DirectAllocationCheckboxProps {
    isNC: boolean;
    isDirect: boolean;
    onDirectChange: (value: boolean) => void;
}

export function DirectAllocationCheckbox({
    isNC,
    isDirect,
    onDirectChange
}: DirectAllocationCheckboxProps) {
    // Only visible for National Coordinators
    if (!isNC) return null;

    return (
        <div className="space-y-3 border-l-4 border-amber-500 pl-4 py-2 rounded-r">
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="isDirect"
                    checked={isDirect}
                    onCheckedChange={(checked) => onDirectChange(checked as boolean)}
                />
                <Label
                    htmlFor="isDirect"
                    className="text-sm font-semibold cursor-pointer flex items-center gap-2"
                >
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Allocation Directe au Groupe (bypass Site Coordinator)
                </Label>
            </div>

            {isDirect && (
                <Alert variant="default" className="border-amber-200 bg-amber-50">
                    <AlertDescription className="text-sm text-amber-800">
                        <strong>Mode Exceptionnel :</strong> Vous allouez directement à un Small Group sans passer par le Site Coordinator.
                        Une <strong>justification détaillée</strong> (minimum 20 caractères) est requise pour l'audit.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
