// src/app/dashboard/sites/[siteId]/small-groups/[smallGroupId]/edit/page.tsx
"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { SmallGroupForm } from '@/app/[locale]/dashboard/sites/components/SmallGroupForm';
import type { SmallGroupFormData } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { useSmallGroupDetails } from '@/hooks/useSmallGroupDetails';
import { PageSkeleton } from '@/components/shared/skeletons/PageSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, Users as UsersIcon } from 'lucide-react';

export default function EditSmallGroupPage() {
  const params = useParams();
  const router = useRouter();
  const smallGroupId = params.smallGroupId as string;

  const { smallGroup, isLoading, error, updateSmallGroup, isUpdating } = useSmallGroupDetails(smallGroupId);

  const handleUpdateSmallGroup = async (data: SmallGroupFormData) => {
    if (!smallGroupId) return;
    await updateSmallGroup(data);
    router.push(`/dashboard/sites/${smallGroup?.siteId}`);
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !smallGroup) {
    return (
        <div>
          <PageHeader title="Small Group Not Found" icon={Info} />
          <Card>
            <CardContent className="pt-6">
              <p>{error?.message || 'The small group you are looking for does not exist.'}</p>
              <Button onClick={() => router.back()} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Edit Small Group: ${smallGroup.name}`}
        description={`Modifying details for "${smallGroup.name}" within ${smallGroup.site?.name}.`}
        icon={UsersIcon}
      />
      <SmallGroupForm
        smallGroup={smallGroup}
        siteId={smallGroup.siteId!}
        onSubmitForm={handleUpdateSmallGroup}
        isSaving={isUpdating}
      />
    </div>
  );
}
