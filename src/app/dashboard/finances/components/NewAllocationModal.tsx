"use client";

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/lib/constants';

export const NewAllocationModal = () => {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  const canCreateAllocation =
    currentUser.role === ROLES.NATIONAL_COORDINATOR ||
    currentUser.role === ROLES.SITE_COORDINATOR;

  if (!canCreateAllocation) {
    return null;
  }

  return (
    <Link href="/dashboard/finances/allocations/new" passHref>
      <Button>
        <PlusCircle className="mr-2 h-4 w-4" />
        Nouveau Transfert
      </Button>
    </Link>
  );
};
