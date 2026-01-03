"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { TransactionFormData, FinancialTransaction } from '@/lib/types';
import { useTranslations } from 'next-intl';

const transactionSchema = z.object({
    amount: z.coerce.number().positive('Amount must be positive'),
    date: z.string().or(z.date()).transform(d => typeof d === 'string' ? d : d.toISOString()),
    description: z.string().min(3, 'Description must be at least 3 characters'),
    type: z.enum(['income', 'expense']),
    category: z.string().min(1, 'Category is required'),
    siteId: z.string().optional(),
    smallGroupId: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
    onSave: (data: TransactionFormValues) => Promise<void>;
    initialData?: FinancialTransaction;
    isSaving: boolean;
}

export function TransactionForm({ onSave, initialData, isSaving }: TransactionFormProps) {
    const t = useTranslations('Finances');

    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: initialData ? {
            amount: initialData.amount,
            date: new Date(initialData.date).toISOString().split('T')[0],
            description: initialData.description,
            type: initialData.type,
            category: initialData.category,
            siteId: initialData.siteId || undefined,
            smallGroupId: initialData.smallGroupId || undefined,
        } : {
            type: 'income',
            date: new Date().toISOString().split('T')[0],
        },
    });

    const transactionType = watch('type');

    return (
        <form onSubmit={handleSubmit(onSave)} className="space-y-4 py-2">
            <div className="space-y-2">
                <Label htmlFor="type">Transaction Type</Label>
                <Select
                    onValueChange={(value) => setValue('type', value as 'income' | 'expense')}
                    defaultValue={transactionType}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                </Select>
                {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    {...register('amount')}
                    placeholder="0.00"
                />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                    id="date"
                    type="date"
                    {...register('date')}
                />
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                    id="category"
                    {...register('category')}
                    placeholder="e.g. Donation, Transport, Material"
                />
                {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Describe the transaction..."
                />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? 'Saving...' : (initialData ? 'Update Transaction' : 'Save Transaction')}
            </Button>
        </form>
    );
}
