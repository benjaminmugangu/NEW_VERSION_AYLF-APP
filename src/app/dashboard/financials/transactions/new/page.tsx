// src/app/dashboard/financials/transactions/new/page.tsx
'use client';

import React from 'react';
import { TransactionForm } from '@/components/financials/TransactionForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { transactionService } from '@/services/transactionService';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { TransactionFormData } from '@/lib/types';

const NewTransactionPage = () => {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (data: TransactionFormData) => {
    if (!currentUser) {
      toast({ title: 'Error', description: 'You must be logged in to create a transaction.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const transactionData = {
      ...data,
      recordedById: currentUser.id,
      // Logic to set siteId or smallGroupId based on user role would go here
    };

    const result = await transactionService.createTransaction(transactionData);

    setIsSaving(false);

    if (result.success) {

      toast({ title: 'Success', description: 'Transaction created successfully!' });
      router.push('/dashboard/financials');
    } else {
      toast({ title: 'Error', description: `Failed to create transaction: ${result.error}`, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/financials">
          <Button variant="outline" size="icon" disabled={isSaving}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Add New Transaction</h1>
      </div>
      <TransactionForm onSave={handleSave} isSaving={isSaving} />
    </div>
  );
};

export default NewTransactionPage;
