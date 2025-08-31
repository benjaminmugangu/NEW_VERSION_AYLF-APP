// src/app/dashboard/financials/allocations/new/page.tsx
'use client';

// src/app/dashboard/financials/allocations/new/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { AllocationForm } from '@/components/financials/AllocationForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { allocationService } from '@/services/allocations.service';
import siteService from '@/services/siteService';
import { smallGroupService } from '@/services/smallGroupService';
import { useRouter } from 'next/navigation';
import type { FundAllocationFormData, Site, SmallGroup } from '@/lib/types';

const NewAllocationPage = () => {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  

    const handleSave = async (data: FundAllocationFormData) => {
    if (!currentUser) {
      alert('You must be logged in to create an allocation.');
      return;
    }

    setIsSaving(true);



    const fullData: FundAllocationFormData = {
      ...data,
      allocatedById: currentUser?.id || '',
      status: 'planned',
    };

    if (!fullData.allocatedById) {
      alert('User not found, cannot create allocation');
      setIsSaving(false);
      return;
    }

    try {
      await allocationService.createAllocation(fullData);
      alert('Fund allocation created successfully!');
      router.push('/dashboard/financials');
    } catch (e) {
      const error = e as Error;
      alert(`Failed to create allocation: ${error.message}`);
    } finally {
      setIsSaving(false);
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
