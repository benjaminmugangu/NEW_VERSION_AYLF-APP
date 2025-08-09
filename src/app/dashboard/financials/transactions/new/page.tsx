// src/app/dashboard/financials/transactions/new/page.tsx
'use client';

import React from 'react';
import { TransactionForm } from '@/components/financials/TransactionForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { transactionService } from '@/services/transactionService';
import siteService from '@/services/siteService';
import smallGroupService from '@/services/smallGroupService';
import { useRouter } from 'next/navigation';

import { useState, useEffect } from 'react';
import type { TransactionFormData, Site, SmallGroup } from '@/lib/types';

const NewTransactionPage = () => {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [smallGroups, setSmallGroups] = useState<SmallGroup[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (currentUser) {
        try {
          const sites = await siteService.getSitesWithDetails(currentUser);
          setSites(sites);
          const smallGroups = await smallGroupService.getFilteredSmallGroups({ user: currentUser });
          setSmallGroups(smallGroups);
        } catch (error) {
          toast({ title: 'Error', description: 'Failed to load initial data.', variant: 'destructive' });
          console.error('Data fetching error:', error);
        }
      }
    };
    fetchData();
  }, [currentUser]);

  const handleSave = async (data: TransactionFormData) => {
    if (!currentUser) {
      alert('You must be logged in to create a transaction.');
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

      alert('Transaction created successfully!');
      router.push('/dashboard/financials');
    } else {
      if (result.error) {
        alert(`Failed to create transaction: ${result.error.message}`);
      } else {
        alert('An unknown error occurred while creating the transaction.');
      }
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
      <TransactionForm onSave={handleSave} isSaving={isSaving} sites={sites} smallGroups={smallGroups} />
    </div>
  );
};

export default NewTransactionPage;
