// src/app/dashboard/finances/transactions/new/page.tsx
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { TransactionForm } from "../../components/TransactionForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { DollarSign, PlusCircle } from "lucide-react";
import type { TransactionFormData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { mockTransactions } from "@/lib/mockData";

export default function NewTransactionPage() {
  const { toast } = useToast();
  const router = useRouter();

  const handleRecordTransaction = async (data: TransactionFormData) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newTransaction = {
      id: `txn_${Date.now()}`,
      ...data,
      date: data.date.toISOString(),
    };
    
    // mockTransactions.unshift(newTransaction); 
    console.log("New Transaction Recorded (mock):", newTransaction);

    toast({
      title: "Transaction Recorded!",
      description: `Transaction "${newTransaction.description}" has been successfully recorded.`,
    });
    router.push("/dashboard/finances"); 
  };

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader 
        title="Record New Transaction"
        description="Log a new financial transaction for AYLF National Coordination."
        icon={PlusCircle}
      />
      <TransactionForm onSubmitForm={handleRecordTransaction} />
    </RoleBasedGuard>
  );
}
