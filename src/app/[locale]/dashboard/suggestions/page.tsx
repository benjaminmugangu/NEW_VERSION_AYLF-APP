"use client";

import { PageHeader } from '@/components/shared/PageHeader';
import { Lightbulb } from 'lucide-react';

export default function SuggestionsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Suggestions"
        description="This page is under construction."
        icon={Lightbulb}
      />
      <div className="p-4">
        <p>Suggestions feature will be available soon.</p>
      </div>
    </div>
  );
}
