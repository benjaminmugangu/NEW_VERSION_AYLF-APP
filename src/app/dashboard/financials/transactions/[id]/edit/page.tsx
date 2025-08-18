// src/app/dashboard/financials/transactions/[id]/edit/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import transactionService from '@/services/transactionService';

import { TransactionForm } from '@/components/financials/TransactionForm';
import { PageHeader } from '@/components/shared/PageHeader';
// import { Breadcrumbs } from '@/components/shared/Breadcrumbs'; // TODO: Create or find this component
import type { FinancialTransaction, TransactionFormData } from '@/lib/types';

const EditTransactionPage = () => {
  const router = useRouter();
  const params = useParams();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const id = typeof params.id === 'string' ? params.id : '';

  const [transaction, setTransaction] = useState<FinancialTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id || !currentUser) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const transactionRes = await transactionService.getTransactionById(id);

        if (transactionRes.success && transactionRes.data) {
          setTransaction(transactionRes.data);
        } else {
          toast({ title: 'Error', description: 'Transaction not found.', variant: 'destructive' });
          router.push('/dashboard/financials');
        }

        

      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load transaction data.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, currentUser, toast, router]);

  const handleUpdate = async (data: TransactionFormData) => {
    setIsSaving(true);
    const response = await transactionService.updateTransaction(id, data);
    setIsSaving(false);

    if (response.success) {
      toast({ title: 'Success', description: 'Transaction updated successfully.' });
      router.push('/dashboard/financials');
    } else {
      toast({ title: 'Error', description: response.error?.message || 'Failed to update transaction.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div>Loading transaction...</div>;
  }

  if (!transaction) {
    return <div>Transaction not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Financials', href: '/dashboard/financials' },
        { label: 'Edit Transaction' }
      ]} /> */}
      <h1 className="text-2xl font-bold">Edit Transaction</h1>
      <TransactionForm
        initialData={transaction}
        onSave={handleUpdate}
        isSaving={isSaving}
        
      />
    </div>
  );
};

export default EditTransactionPage;
