// src/app/dashboard/financials/allocations/new/page.tsx
'use client';

export const dynamic = 'force-dynamic';


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
      fromSiteId: currentUser?.role === 'SITE_COORDINATOR' ? currentUser.siteId || undefined : undefined,
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
