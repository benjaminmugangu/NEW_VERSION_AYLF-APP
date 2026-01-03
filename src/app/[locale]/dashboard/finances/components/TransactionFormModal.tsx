'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TransactionForm } from './TransactionForm';
import type { FinancialTransaction, TransactionFormData } from '@/lib/types';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrentUser } from '@/contexts/AuthContext';

interface TransactionFormModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly transaction: FinancialTransaction | null; // Pass transaction for editing, null for creating
}

export function TransactionFormModal({ isOpen, onClose, transaction }: TransactionFormModalProps) {
  const { currentUser } = useCurrentUser();
  const { createTransaction, updateTransaction, isCreating, isUpdating } = useTransactions({ user: currentUser });

  const handleSubmit = async (formData: TransactionFormData) => {
    if (!currentUser) {
      alert('You must be logged in to perform this action.');
      return;
    }

    // Inject context data
    const finalData = {
      ...formData,
      recordedById: currentUser.id,
      siteId: formData.siteId || currentUser.siteId || undefined,
      smallGroupId: formData.smallGroupId || currentUser.smallGroupId || undefined,
    };

    try {
      if (transaction) {
        // Update existing transaction
        await updateTransaction({ id: transaction.id, formData: finalData });
        alert('Transaction updated successfully!');
      } else {
        // Create new transaction
        await createTransaction(finalData);
        alert('Transaction created successfully!');
      }
      onClose(); // Close modal on success
    } catch (error) {
      console.error('Error saving transaction:', error);
      const { getClientErrorMessage } = await import('@/lib/clientErrorHandler');
      const errorMessage = getClientErrorMessage(error);
      alert(`Operation failed: ${errorMessage}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Edit Transaction' : 'Create New Transaction'}</DialogTitle>
          <DialogDescription>
            {transaction ? 'Update the details of the transaction.' : 'Fill in the details for the new transaction.'}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          onSave={handleSubmit}
          initialData={transaction || undefined}
          isSaving={isCreating || isUpdating}
        />
      </DialogContent>
    </Dialog>
  );
}
