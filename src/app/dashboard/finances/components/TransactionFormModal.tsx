'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TransactionForm } from '@/components/financials/TransactionForm';
import type { FinancialTransaction, TransactionFormData } from '@/lib/types';
import { useTransactions } from '@/hooks/useTransactions';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: FinancialTransaction | null; // Pass transaction for editing, null for creating
}

export function TransactionFormModal({ isOpen, onClose, transaction }: TransactionFormModalProps) {
  const { createTransaction, updateTransaction, isCreating, isUpdating } = useTransactions();

  const handleSubmit = async (formData: TransactionFormData) => {
    try {
      if (transaction) {
        // Update existing transaction
        await updateTransaction({ id: transaction.id, formData });
        alert('Transaction updated successfully!');
      } else {
        // Create new transaction
        await createTransaction(formData);
        alert('Transaction created successfully!');
      }
      onClose(); // Close modal on success
    } catch (e) {
      const error = e as Error;
      alert(`Operation failed: ${error.message}`);
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
