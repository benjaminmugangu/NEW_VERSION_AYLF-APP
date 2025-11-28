"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { ActivityForm } from '../../components/ActivityForm';
import type { Activity } from '@/lib/types';
import { Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EditActivityClientProps {
  activity: Activity;
}

export default function EditActivityClient({ activity }: EditActivityClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleSuccessfulUpdate = (updatedActivity: Activity) => {
    toast({
      title: 'Activity Updated!',
      description: `Activity "${updatedActivity.title}" has been successfully updated.`,
    });
    router.push('/dashboard/activities');
  };

  const handleCancel = () => {
    router.push('/dashboard/activities');
  };

  return (
    <>
      <PageHeader
        title={`Edit Activity: ${activity.title}`}
        description="Modify the details of the existing activity."
        icon={Edit}
      />
      <ActivityForm initialActivity={activity} onSave={handleSuccessfulUpdate} onCancel={handleCancel} />
    </>
  );
}
