// src/app/dashboard/financials/allocations/new/page.tsx
'use client';

import React, { useState } from 'react';
import { AllocationForm } from '../../../../../components/financials/AllocationForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { allocationService } from '@/services/allocations.service';
import { useRouter } from 'next/navigation';
import type { FundAllocationFormData } from '@/lib/types';

const NewAllocationPage = () => {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (data: Partial<FundAllocationFormData>) => {
    if (!currentUser) {
      alert('You must be logged in to create an allocation.');
      return;
    }

    setIsSaving(true);

    if (typeof data.amount !== 'number' || !data.allocationDate || !data.goal || !data.source) {
        alert('Please fill all required fields.');
        setIsSaving(false);
        return;
    }

    const fullData: FundAllocationFormData = {
      ...data,
      amount: data.amount,
      allocationDate: data.allocationDate,
      goal: data.goal,
      source: data.source,
      allocatedById: currentUser?.id || '',
      status: 'planned',
    };

    if (!fullData.allocatedById) {
      console.error('User not found, cannot create allocation');
      // TODO: Show error toast
      return;
    }

    const result = await allocationService.createAllocation(fullData);

    setIsSaving(false);

    if (result.success) {
      alert('Fund allocation created successfully!');
      router.push('/dashboard/financials');
    } else {
      alert(`Failed to create allocation: ${result.error}`);
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
        <h1 className="text-2xl font-bold">Add New Fund Allocation</h1>
      </div>
      <AllocationForm onSave={handleSave} isSaving={isSaving} />
    </div>
  );
};

export default NewAllocationPage;
